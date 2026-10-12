import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile, writeFile, realpath} from 'node:fs/promises';
import {registerElements, componentGeometry} from './register-elements.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(here, '../../..');
const args = process.argv.slice(2);
const project = args.includes('--project') ? args[args.indexOf('--project') + 1] : null;
if (!project) throw new Error('Usage: node editor/attach.mjs --project videos/windistudio-repo/EPISODE');
const root = await realpath(path.resolve(repository, project));
const target = path.join(root, 'src/EditorComposition.tsx');
const existing = await readFile(target, 'utf8').catch(error => {if (error.code === 'ENOENT') return null; throw error;});
if (existing) {console.log('Đã có EditorComposition.tsx; giữ nguyên adapter hiện có.'); process.exit(0);}
let source = await readFile(path.join(root, 'src/Composition.tsx'), 'utf8');
const timeline = JSON.parse(await readFile(path.join(root, 'src/timeline.json'), 'utf8'));
const importPath = path.relative(path.dirname(target), here).split(path.sep).join('/');
const start = source.indexOf('      <RetroWindow');
const close = source.indexOf('</RetroWindow>', start);
if (start < 0 || close < 0 || !source.includes('export const MainComposition: React.FC = () => {') || !source.includes('const totalFrames = timelineData.totalFrames;')) throw new Error('Composition cần adapter thủ công: dùng contract trong references/timeline-editor.md. Không thay đổi source gốc.');
const windowSource = source.slice(start, close);
const sequences = [...windowSource.matchAll(/<Sequence\b[^>]*>\s*<([A-Z][A-Za-z0-9_]*)\s*\/>(?:\s*)<\/Sequence>/g)];
let adaptedWindow;
if (sequences.length === timeline.beats.length) {
  const names = sequences.map(match => match[1]);
  let first = true;
  adaptedWindow = windowSource.replace(/<Sequence\b[^>]*>\s*<[A-Z][A-Za-z0-9_]*\s*\/>(?:\s*)<\/Sequence>/g, () => {
    if (!first) return ''; first = false;
    return `{timeline.beats.map((beat, index) => {
          const Scene = [${names.join(', ')}][index];
          const media = editor?.beats[index].media;
          return <Sequence key={beat.id} from={beat.startFrame} durationInFrames={beat.endFrame - beat.startFrame}>
            {media ? <EditorMedia media={media}/> : <Scene/>}
          </Sequence>;
        })}`;
  });
} else {
  const videos = [...windowSource.matchAll(/<OffthreadVideo\b[\s\S]*?\/>/g)];
  if (sequences.length || videos.length !== 1 || /trimBefore|startFrom|<Sequence/.test(windowSource)) throw new Error('Cấu trúc cửa sổ cần adapter thủ công; không thay đổi source gốc.');
  const native = videos[0][0];
  const local = native.replace('<OffthreadVideo', '<OffthreadVideo trimBefore={beat.startFrame}');
  adaptedWindow = windowSource.replace(native, `{!editor?.beats.some(b => b.media) ? (${native}) : timeline.beats.map((beat, index) => {
          const media = editor?.beats[index].media;
          return <Sequence key={beat.id} from={beat.startFrame} durationInFrames={beat.endFrame - beat.startFrame}>
            {media ? <EditorMedia media={media}/> : (${local})}
          </Sequence>;
        })}`);
}
const windowOpening = adaptedWindow.indexOf('>') + 1;
adaptedWindow = adaptedWindow.slice(0, windowOpening) + '<EditorWindowMedia editor={editor}>' + adaptedWindow.slice(windowOpening) + '</EditorWindowMedia>';
source = source.slice(0, start) + adaptedWindow + source.slice(close);
source = source.replace("import timelineData from './timeline.json';", `import timelineData from './timeline.json';\nimport type {EditorProps} from '${importPath}/types';\nimport {EditorMedia, EditorWindowMedia} from '${importPath}/Media';\nimport {EditorCaptionBar} from '${importPath}/CaptionBar';\nimport originalCaptions from './captions.json';`);
source = source.replace(/import\s*\{\s*CaptionBar\s*\}\s*from\s*['"]\.\/components\/CaptionBar['"];?\n/, '');
source = source.replace('export const MainComposition: React.FC = () => {', 'export const EditorComposition: React.FC<EditorProps> = ({editor}) => {');
source = source.replace('const totalFrames = timelineData.totalFrames;', 'const timeline = editor || timelineData;\n  const totalFrames = timeline.totalFrames;');
source = source.replaceAll('timelineData.beats', 'timeline.beats');
source = source.replace('<CaptionBar />', '<EditorCaptionBar groups={editor?.captions || originalCaptions}/>');
source = source.replace(/(<Audio\s+src=\{staticFile\('voice\.mp3'\)\}\s+volume=)\{[^}]+\}/, '$1{editor?.audio.voiceVolume ?? 1}');
source = source.replace(/(<Audio\s+src=\{sfxAudio\}\s+volume=)\{([^}]+)\}/, '$1{editor?.audio.sfxVolume ?? $2}');
source = source.replace(/<Audio\s+src=\{staticFile\('musicbg\.mp3'\)\}\s+volume=\{[^}]+\}\s+loop\s*\/>/, match => `{editor ? <EditorMusic editor={editor}/> : ${match}}`);
source = `import {EditorMusic} from '${importPath}/Audio';\nimport {EditorTransition} from '${importPath}/Transition';\n` + source;
source = source.replace('</RetroWindow>', '<EditorTransition beats={timeline.beats}/></RetroWindow>');
const components = {};
for (const [key, name] of [['watermark', 'Watermark'], ['window', 'RetroWindow']]) {
  const text = await readFile(path.join(root, `src/components/${name}.tsx`), 'utf8');
  components[key] = componentGeometry(text);
  if (!components[key]) throw new Error(`${name} cần metadata layout thủ công. Không thay đổi composition gốc.`);
}
source = registerElements(source, importPath, components);
await writeFile(target, source, {flag: 'wx'});
const config = {schemaVersion: 1, title: path.basename(root), module: 'src/EditorComposition.tsx', exportName: 'EditorComposition', audioDefaults: {musicVolume: 0.95, musicFadeInFrames: 15, musicFadeOutFrames: 25}};
await writeFile(path.join(root, 'editor.config.json'), JSON.stringify(config, null, 2) + '\n', {flag: 'wx'}).catch(error => {if (error.code !== 'EEXIST') throw error;});
console.log(`Đã tạo adapter riêng: ${target}\nSource dựng gốc giữ nguyên. Chạy npm run video:editor -- --project ${project}`);
