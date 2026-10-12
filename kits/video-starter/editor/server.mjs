import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const execute = promisify(execFile);
import {readFile, writeFile, readdir, mkdir, realpath, stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition, getVideoMetadata, makeCancelSignal} from '@remotion/renderer';
import {validateDocument, safeAsset, saveDraft, captionsSrt} from './model.mjs';
import {verifyExport} from './export-qa.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const runtime = path.resolve(here, '..');
const repository = path.resolve(runtime, '../..');
const {createServer} = await import('vite');
const audioExtensions = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg']);
const mediaExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.mp4', '.mov', '.webm', ...audioExtensions]);
const assetKind = ext => audioExtensions.has(ext) ? 'audio' : ['.mp4', '.mov', '.webm'].includes(ext) ? 'video' : 'image';
const contentTypes = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.json': 'application/json', '.srt': 'text/plain', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.ogg': 'audio/ogg'};

async function assetList(publicDir, prefix = '') {
  const files = [];
  for (const item of await readdir(path.join(publicDir, prefix), {withFileTypes: true})) {
    if (item.name.startsWith('.')) continue;
    const src = path.posix.join(prefix, item.name);
    if (item.isDirectory()) files.push(...await assetList(publicDir, src));
    else if (item.isFile() && mediaExtensions.has(path.extname(item.name).toLowerCase())) files.push({src, kind: assetKind(path.extname(item.name).toLowerCase())});
  }
  return files;
}

async function body(req, limit = 4 * 1024 * 1024) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {size += chunk.length; if (size > limit) {const error = new Error('File vượt quá giới hạn dung lượng.'); error.status = 413; throw error;} chunks.push(chunk);}
  return Buffer.concat(chunks);
}

function json(res, data, status = 200) {
  res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
  res.end(JSON.stringify(data));
}

export async function startEditor(project, port = 4318) {
  const episodeRoot = await realpath(path.resolve(repository, project));
  const publicDir = await realpath(path.join(episodeRoot, 'public'));
  const config = JSON.parse(await readFile(path.join(episodeRoot, 'editor.config.json'), 'utf8').catch(error => {
    if (error.code === 'ENOENT') throw new Error('Tập này chưa có editor.config.json. Xem kits/windistudio-repo-video/references/timeline-editor.md để nối composition vào editor.'); throw error;
  }));
  const chromiumOptions = config.chromiumOptions || {};
  const modulePath = await realpath(path.join(episodeRoot, config.module));
  if (!modulePath.startsWith(episodeRoot + path.sep) || !/^[A-Za-z_$][\w$]*$/.test(config.exportName)) throw new Error('Editor adapter không hợp lệ.');
  const timeline = JSON.parse(await readFile(path.join(episodeRoot, 'src/timeline.json'), 'utf8'));
  const captions = JSON.parse(await readFile(path.join(episodeRoot, 'src/captions.json'), 'utf8'));
  const baseline = {schemaVersion: 1, episodeId: path.basename(episodeRoot), revision: 0, fps: timeline.fps || 30, totalFrames: timeline.totalFrames,
    beats: timeline.beats, captions, audio: {voice: 'voice.mp3', music: 'musicbg.mp3', voiceVolume: 1, musicVolume: 1, sfxVolume: 0.35, ...config.audioDefaults}};
  validateDocument(baseline, baseline);
  await safeAsset(publicDir, baseline.audio.voice); await safeAsset(publicDir, baseline.audio.music);
  const stateDir = path.join(episodeRoot, '.windi/editor');
  const draftFile = path.join(stateDir, 'draft.json');
  let draft = await readFile(draftFile, 'utf8').then(JSON.parse).catch(error => {if (error.code === 'ENOENT') return baseline; throw error;});
  let draftWarning = '';
  // A regenerated voice/timeline can invalidate an earlier edit. Open the new
  // baseline without silently overwriting that draft; saveDraft archives it.
  if (draft.schemaVersion === 1 && draft.episodeId === baseline.episodeId && Number.isInteger(draft.revision) &&
      (draft.totalFrames !== baseline.totalFrames || draft.fps !== baseline.fps)) {
    draftWarning = `Timeline đã đổi (${draft.totalFrames} → ${baseline.totalFrames} frame). Đang mở bản dựng hiện tại; draft cũ được giữ trong lịch sử khi lưu.`;
    draft = {...structuredClone(baseline), revision: draft.revision};
  }
  validateDocument(draft, baseline);
  const token = randomUUID();
  let job = await readFile(path.join(stateDir, 'last-export.json'), 'utf8').then(JSON.parse).catch(error => {if (error.code === 'ENOENT') return null; throw error;});
  if (job) job.status = 'complete';
  // Recover a finished snapshot after a browser/server restart or an interrupted
  // final status write. This checks the existing MP4 and never renders again.
  if (!job) {
    const exportsRoot = path.join(episodeRoot, 'windi/editor-exports');
    const entries = await readdir(exportsRoot, {withFileTypes: true}).catch(error => {if (error.code === 'ENOENT') return []; throw error;});
    const latest = entries.filter(e => e.isDirectory() && /^\d+-[a-f0-9]{8}$/.test(e.name)).sort((a, b) => b.name.localeCompare(a.name))[0];
    if (latest) {
      const outputDir = path.join(exportsRoot, latest.name);
      const checked = await readFile(path.join(outputDir, 'qa.json'), 'utf8').then(JSON.parse).catch(() => null);
      if (checked?.technicalPassed === true) job = {id: latest.name, status: 'complete', stage: 'complete', progress: 1, revision: checked.revision, outputDir};
    }
  }
  let cancelRender = null, saving = false;
  // Resolve one React/Remotion instance for both legacy episode imports and Player.
  const sharedPackages = ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom/client', 'remotion', 'remotion/no-react', '@remotion/sfx', '@remotion/player', 'three'];
  const aliases = Object.fromEntries(sharedPackages.map(name => [name, fileURLToPath(import.meta.resolve(name))]));

  const audioDurations = new Map();
  const validateMusic = async doc => {
    const file = await safeAsset(publicDir, doc.audio.music);
    if (!audioExtensions.has(path.extname(file).toLowerCase())) throw new Error('File nhạc nền không hợp lệ.');
    const info = await stat(file), key = `${file}:${info.size}:${info.mtimeMs}`;
    let duration = audioDurations.get(key);
    if (duration == null) {
      const {stdout} = await execute('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_type:format=duration', '-of', 'json', file], {timeout: 15000, maxBuffer: 1024 * 1024});
      const metadata = JSON.parse(stdout);
      duration = Number(metadata.format?.duration);
      if (!metadata.streams?.length || !Number.isFinite(duration) || duration <= 0) throw new Error('Không đọc được thời lượng file nhạc.');
      audioDurations.set(key, duration);
    }
    if ((doc.audio.musicTrimBefore ?? 0) >= Math.floor(duration * doc.fps)) throw new Error('Điểm cắt đầu nhạc phải nằm trong file.');
  };
  const validateMedia = async doc => {
    await validateMusic(doc);
    for (const beat of [...doc.beats, ...(doc.mediaClips || [])]) if (beat.media) {
      await safeAsset(publicDir, beat.media.src);
      const extension = path.extname(beat.media.src).toLowerCase();
      if (!mediaExtensions.has(extension) || assetKind(extension) !== beat.media.kind) throw new Error('Loại media không khớp file.');
      if (beat.media.kind === 'video') {
        const metadata = await getVideoMetadata(await safeAsset(publicDir, beat.media.src));
        if (metadata.durationInSeconds * doc.fps + 1 < beat.media.trimBefore + beat.endFrame - beat.startFrame) throw new Error('Clip ngắn hơn cảnh sau khi cắt. Chọn clip dài hơn hoặc giảm độ dài cảnh.');
      }
    }
  };

  async function save(doc) {
    if (saving) {const error = new Error('Đang lưu draft. Thử lại sau một chút.'); error.status = 409; throw error;}
    saving = true;
    try {validateDocument(doc, baseline); await validateMedia(doc); draft = await saveDraft(draftFile, doc, baseline); draftWarning = ''; return draft;} finally {saving = false;}
  }

  async function exportVideo(snapshot, selectedFrame) {
    const currentJob = job;
    const outputDir = path.join(episodeRoot, 'windi/editor-exports', currentJob.id);
    const entryDir = path.join(runtime, '.cache/editor', currentJob.id);
    try {
      await mkdir(outputDir, {recursive: true}); await mkdir(entryDir, {recursive: true});
      await writeFile(path.join(outputDir, 'edit.json'), JSON.stringify(snapshot, null, 2) + '\n');
      await writeFile(path.join(outputDir, 'captions.srt'), captionsSrt(snapshot.captions, snapshot.totalFrames / snapshot.fps * 1000));
      const entry = path.join(entryDir, 'entry.tsx');
      await writeFile(entry, `import React from 'react';\nimport {Composition,registerRoot} from 'remotion';\nimport {${config.exportName} as Episode} from ${JSON.stringify(modulePath)};\nconst Root=()=> <Composition id="WindiEditorExport" component={Episode} width={1080} height={1920} fps={${snapshot.fps}} durationInFrames={${snapshot.totalFrames}} defaultProps={{editor:${JSON.stringify(snapshot)}}}/>;\nregisterRoot(Root);\n`);
      currentJob.stage = 'bundle';
      const serveUrl = await bundle({entryPoint: entry, rootDir: runtime, publicDir, outDir: path.join(entryDir, 'bundle'),
        webpackOverride: config => ({...config, resolve: {...config.resolve, alias: {...config.resolve?.alias, ...Object.fromEntries(Object.entries(aliases).map(([name, file]) => [name + '$', file]))}}}),
        onProgress: progress => {currentJob.progress = progress * 0.1;}});
      if (currentJob.status === 'cancelled') return;
      const props = {editor: snapshot};
      const browser = process.env.WINDI_EDITOR_BROWSER;
      const composition = await selectComposition({serveUrl, id: 'WindiEditorExport', inputProps: props, chromiumOptions, ...(browser ? {browserExecutable: browser} : {})});
      const cancellation = makeCancelSignal(); cancelRender = cancellation.cancel;
      currentJob.stage = 'render';
      await renderMedia({serveUrl, composition, inputProps: props, codec: 'h264', pixelFormat: 'yuv420p', imageFormat: 'png', colorSpace: 'bt709',
        outputLocation: path.join(outputDir, 'final.mp4'), concurrency: 2, cancelSignal: cancellation.cancelSignal,
        chromiumOptions, ...(browser ? {browserExecutable: browser} : {}), onProgress: p => {currentJob.progress = 0.1 + p.progress * 0.84;}});
      currentJob.stage = 'cover';
      await renderStill({serveUrl, composition, inputProps: props, frame: selectedFrame, output: path.join(outputDir, 'cover.png'), chromiumOptions, ...(browser ? {browserExecutable: browser} : {})});
      currentJob.stage = 'qa';
      const qa = await verifyExport(outputDir, snapshot);
      if (!qa.technicalPassed) throw new Error('MP4 chưa đạt kiểm tra kỹ thuật. Xem qa.json trong thư mục xuất.');
      currentJob.status = 'complete'; currentJob.stage = 'complete'; currentJob.progress = 1;
      currentJob.outputDir = outputDir;
      await writeFile(path.join(stateDir, 'last-export.json'), JSON.stringify({...currentJob, exportAuthorizedBy: 'user_clicked_export', status: 'QA_PENDING'}, null, 2) + '\n');
    } catch (error) {if (currentJob.status !== 'cancelled') {currentJob.status = 'failed'; currentJob.error = error.message;}}
    finally {cancelRender = null;}
  }

  const server = await createServer({configFile: false, root: here, publicDir, appType: 'spa',
    resolve: {alias: Object.entries(aliases).map(([name, replacement]) => ({find: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), replacement})), dedupe: ['react', 'react-dom', 'remotion', 'three']},
    optimizeDeps: {include: ['react', 'react-dom/client', 'remotion', '@remotion/player', '@remotion/sfx', 'three']},
    server: {host: '127.0.0.1', port, strictPort: true, fs: {allow: [here, episodeRoot, runtime, repository]}},
    plugins: [{name: 'windi-episode', resolveId(id) {if (id === 'virtual:windi-episode') return '\0windi-episode';},
      load(id) {if (id === '\0windi-episode') return `export {${config.exportName} as EpisodeComposition} from ${JSON.stringify(modulePath)};`;},
      configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url, `http://127.0.0.1:${port}`);
          if (!url.pathname.startsWith('/api/editor/')) return next();
          try {
            if (req.headers.host !== `127.0.0.1:${port}` && req.headers.host !== `localhost:${port}`) return json(res, {error: 'Host không hợp lệ.'}, 403);
            if (req.method !== 'GET' && (req.headers['x-windi-editor-token'] !== token || (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`))) return json(res, {error: 'Yêu cầu không thuộc editor hiện tại.'}, 403);
            const route = url.pathname.slice('/api/editor/'.length);
            if (req.method === 'GET' && route === 'project') return json(res, {document: draft, baseline, title: config.title || baseline.episodeId, episodeRoot, assets: await assetList(publicDir), token, job, draftWarning});
            if (req.method === 'GET' && route === 'media-info') {
              const src = url.searchParams.get('src') || '', file = await safeAsset(publicDir, src), kind = assetKind(path.extname(file).toLowerCase());
              if (!mediaExtensions.has(path.extname(file).toLowerCase())) throw new Error('File media không hợp lệ.');
              const info = kind === 'video' ? await getVideoMetadata(file) : null;
              return json(res, {src, kind, durationInFrames: info ? Math.max(1, Math.floor(info.durationInSeconds * baseline.fps)) : baseline.fps * 5});
            }
            if (req.method === 'PUT' && route === 'draft') return json(res, {document: await save(JSON.parse((await body(req)).toString()))});
            if (req.method === 'POST' && route === 'media') {
              const name = path.basename(url.searchParams.get('name') || '');
              const ext = path.extname(name).toLowerCase(); if (!mediaExtensions.has(ext)) throw new Error('Chỉ nhận ảnh, clip hoặc nhạc MP3, WAV, M4A, AAC, OGG.');
              const bytes = await body(req, 300 * 1024 * 1024);
              if (!bytes.length) throw new Error('File rỗng.');
              const friendly = name.slice(0, -ext.length).replace(/[^\p{L}\p{N}_-]/gu, '-').slice(0, 80) || 'media';
              const src = `editor-media/${randomUUID().slice(0, 8)}-${friendly}${ext}`; await mkdir(path.join(publicDir, 'editor-media'), {recursive: true});
              await writeFile(path.join(publicDir, src), bytes, {flag: 'wx'});
              return json(res, {asset: {src, kind: assetKind(ext)}});
            }
            if (req.method === 'GET' && route === 'export') return json(res, {job});
            if (req.method === 'POST' && route === 'export') {
              if (job?.status === 'running') return json(res, {error: 'Một video đang được xuất.'}, 409);
              const request = JSON.parse((await body(req)).toString());
              const snapshot = await save(request.document);
              const selectedFrame = Math.max(0, Math.min(snapshot.totalFrames - 1, Math.round(request.coverFrame || 0)));
              job = {id: `${Date.now()}-${randomUUID().slice(0, 8)}`, status: 'running', stage: 'starting', progress: 0, revision: snapshot.revision};
              json(res, {document: snapshot, job}, 202);
              void exportVideo(structuredClone(snapshot), selectedFrame); return;
            }
            if (req.method === 'POST' && route === 'cancel') {
              if (job?.status === 'running' && job.stage === 'render') {job.status = 'cancelled'; cancelRender?.();}
              return json(res, {job});
            }
            if (req.method === 'GET' && route === 'download') {
              const file = url.searchParams.get('file');
              if (job?.status !== 'complete' || !['final.mp4', 'cover.png', 'captions.srt', 'edit.json', 'qa.json'].includes(file)) throw new Error('File xuất chưa sẵn sàng.');
              const source = path.join(job.outputDir, file); const info = await stat(source);
              res.writeHead(200, {'Content-Type': contentTypes[path.extname(file)] || 'application/octet-stream', 'Content-Length': info.size, 'Content-Disposition': `attachment; filename="${file}"`});
              await pipeline(createReadStream(source), res); return;
            }
            return json(res, {error: 'Không tìm thấy thao tác.'}, 404);
          } catch (error) {if (!res.headersSent) json(res, {error: error.message}, error.status || 400); else res.destroy();}
        });
      }}]});
  await server.listen();
  console.log(`Windi Timeline: http://127.0.0.1:${port}\nTập: ${baseline.episodeId}\nPreview không render MP4. Bấm “Xuất video” để render bản đã chỉnh.`);
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2); const value = flag => args[args.indexOf(flag) + 1];
  const project = args.includes('--project') ? value('--project') : 'videos/windistudio-repo/ws25-esp32-adblock';
  const port = args.includes('--port') ? Number(value('--port')) : 4318;
  startEditor(project, port).catch(error => {console.error(error.message); process.exitCode = 1;});
}
