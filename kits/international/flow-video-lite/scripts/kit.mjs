import {access, copyFile, lstat, mkdir, readFile, readdir, realpath, writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';

export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const presets=['ugc-ad','faceless-explainer','saas-demo'];
export const packageFiles=['package.json','package-lock.json','tsconfig.json','.gitignore','README.md','LICENSE.txt','THIRD-PARTY-NOTICES.md','QA.md','Start Windows.cmd','Start macOS.command','src','scripts','data/video.json','presets','public/assets/README.txt','skills'];
const require=createRequire(path.join(root,'package.json'));
const present=async(file)=>{try{await access(file);return true;}catch{return false;}};
export function run(command,args,options={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{cwd:root,stdio:options.capture?'pipe':'inherit',shell:false,...options});let output='';
    if(options.capture){child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{output+=chunk;});}
    child.on('error',reject);child.on('close',code=>code===0?resolve(output.trim()):reject(new Error(`${command} exited ${code}: ${output.slice(-1500)}`)));
  });
}
export async function doctor(){
  const checks=[{name:'Node.js 20+',ok:Number(process.versions.node.split('.')[0])>=20,detail:process.version},
    {name:'Platform',ok:['darwin','win32','linux'].includes(process.platform),detail:`${process.platform} ${process.arch}; native Windows acceptance pending`},
    {name:'Memory (8 GB recommended minimum)',ok:os.totalmem()>=7.5*1024**3,detail:`${(os.totalmem()/1024**3).toFixed(1)} GB; recommendation, not a measured hardware floor`},
    {name:'CPU (4 cores recommended)',ok:os.cpus().length>=4,detail:`${os.cpus().length} logical CPUs; fewer cores may render more slowly`}];
  try{require.resolve('@remotion/cli/package.json');checks.push({name:'Renderer dependencies',ok:true,detail:'Installed'});}catch{checks.push({name:'Renderer dependencies',ok:false,detail:'Run npm ci in this kit folder (internet required)'});}
  return {checks,ready:checks.filter(c=>!c.name.includes('recommended')).every(c=>c.ok),notes:['The first preview/render may download a browser. Browser launch and disk space still need runtime verification.','Flow and LLM subscriptions are optional external services, supplied by you. No credits included.']};
}
export function validatePlan(plan){
  const text=(value,name,max)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error(`${name}: use 1–${max} characters`);};
  if(!plan||plan.schemaVersion!==1)throw new Error('Expected schemaVersion 1');
  text(plan.title,'title',120);text(plan.brand,'brand',24);
  if(!['portrait','square'].includes(plan.format))throw new Error('format must be portrait or square');
  for(const field of ['accent','background'])if(!/^#[a-f0-9]{6}$/i.test(plan[field]))throw new Error(`${field}: expected #RRGGBB`);
  if(!Array.isArray(plan.scenes)||plan.scenes.length<1||plan.scenes.length>30)throw new Error('Use 1–30 scenes');
  const ids=new Set();let frames=0;
  for(const scene of plan.scenes){
    text(scene.id,'scene id',60);if(ids.has(scene.id))throw new Error('Duplicate scene id');ids.add(scene.id);
    if(!Number.isFinite(scene.duration)||scene.duration<1||scene.duration>15||Math.abs(scene.duration*30-Math.round(scene.duration*30))>1e-6)throw new Error('Scene duration must be 1–15 seconds, on a 30 fps frame boundary');
    frames+=Math.round(scene.duration*30);
    text(scene.eyebrow,'eyebrow',32);text(scene.headline,'headline',65);text(scene.caption,'caption',120);text(scene.visualPrompt,'visualPrompt',3000);
    if(!['image','video'].includes(scene.mediaKind))throw new Error('mediaKind must be image or video');
    if(scene.media!==null&&typeof scene.media!=='string')throw new Error('media must be null or an assets/ path');
  }
  if(frames>180*30)throw new Error('Lite videos are limited to 180 seconds');
  if(plan.audio!==null&&typeof plan.audio!=='string')throw new Error('audio must be null or an assets/ path');
  return {frames,seconds:frames/30};
}
export async function localAsset(base,value,kind){
  if(value===null)return;
  if(typeof value!=='string'||!/^assets\/[a-z0-9 _./-]+\.(png|jpg|jpeg|webp|mp4|mov|webm|mp3|wav|m4a)$/i.test(value)||value.split('/').includes('..'))throw new Error(`${kind}: expected a local assets/ file; URLs and traversal are not supported`);
  const extension=path.extname(value).toLowerCase();
  const extensions=kind==='audio'?['.mp3','.wav','.m4a']:kind==='video'?['.mp4','.mov','.webm']:['.png','.jpg','.jpeg','.webp'];
  if(!extensions.includes(extension))throw new Error(`${kind}: incompatible file extension`);
  const assets=await realpath(path.join(base,'public/assets'));
  const file=await realpath(path.join(base,'public',value));
  if(!file.startsWith(assets+path.sep))throw new Error('Asset escapes public/assets');
  if(!(await lstat(file)).isFile())throw new Error('Asset must be a file');
}
export async function check(base=root){
  const plan=JSON.parse(await readFile(path.join(base,'data/video.json'),'utf8'));
  const timing=validatePlan(plan);
  for(const scene of plan.scenes)await localAsset(base,scene.media,scene.mediaKind);
  await localAsset(base,plan.audio,'audio');
  return {plan,...timing,placeholderScenes:plan.scenes.filter(s=>s.media===null).length,audio:plan.audio?'imported':'silent'};
}
async function copyTree(from,to){
  const entry=await lstat(from);if(entry.isSymbolicLink())throw new Error('Symlinks are not packaged');
  if(entry.isDirectory()){
    await mkdir(to,{recursive:true});
    for(const name of await readdir(from)){
      if(name==='node_modules'||name==='__pycache__'||name.endsWith('.pyc'))continue;
      await copyTree(path.join(from,name),path.join(to,name));
    }
  }else{await mkdir(path.dirname(to),{recursive:true});await copyFile(from,to,constants.COPYFILE_EXCL);}
}
export async function init(target,preset='ugc-ad'){
  if(!presets.includes(preset))throw new Error(`Choose ${presets.join(', ')}`);
  const destination=path.resolve(target);
  if(await present(destination))throw new Error('Choose a new project folder. Existing folders are never overwritten.');
  // Copy only the release allowlist. No other Windi projects, accounts or credentials.
  await mkdir(destination,{recursive:true});
  for(const name of packageFiles)await copyTree(path.join(root,name),path.join(destination,name));
  await copyFile(path.join(root,'presets',`${preset}.json`),path.join(destination,'data/video.json'));
  await copyTree(path.join(root,'skills/windi-flow-video-lite'),path.join(destination,'.agents/skills/windi-flow-video-lite'));
  return {project:destination,preset,next:'Open this folder in your agent, read skills/windi-flow-video-lite/SKILL.md, then run npm ci and npm run doctor.'};
}
export function srt(plan){
  const stamp=(frames)=>{const ms=Math.round(frames/30*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;};
  let frame=0;return plan.scenes.map((scene,index)=>{const start=frame;frame+=Math.round(scene.duration*30);return `${index+1}\n${stamp(start)} --> ${stamp(frame)}\n${scene.caption}\n`;}).join('\n');
}
async function main(){
  const [command,...args]=process.argv.slice(2);
  const option=(name)=>{const index=args.indexOf(`--${name}`);if(index<0)return undefined;if(!args[index+1]||args[index+1].startsWith('--'))throw new Error(`Missing --${name} value`);return args[index+1];};
  if(command==='doctor'){const status=await doctor();console.log(JSON.stringify(status,null,2));if(!status.ready)process.exitCode=1;return;}
  if(command==='init'){const dir=option('dir');if(!dir)throw new Error('Use init --dir NEW_FOLDER [--preset ugc-ad|faceless-explainer|saas-demo]');console.log(JSON.stringify(await init(dir,option('preset')),null,2));return;}
  if(command==='check'){const result=await check();console.log(JSON.stringify({...result,plan:undefined},null,2));return;}
  if(command==='preview'||command==='render'){
    const status=await doctor();if(!status.ready)throw new Error('Run npm run doctor and resolve required checks first');
    const {plan,...result}=await check();
    console.log(JSON.stringify(result,null,2));
    const cli=path.join(path.dirname(require.resolve('@remotion/cli/package.json')),'remotion-cli.js');
    const props=path.join(root,'data/video.json');
    const browser=option('browser');const browserArgs=browser?[`--browser-executable=${path.resolve(browser)}`]:[];
    if(command==='preview'){await run(process.execPath,[cli,'studio','src/index.tsx',`--props=${props}`,...browserArgs]);return;}
    await mkdir(path.join(root,'out'),{recursive:true});
    const output=path.join(root,'out/video.mp4');
    if(await present(output))throw new Error('out/video.mp4 already exists. Move it before exporting a new version.');
    await run(process.execPath,[cli,'render','src/index.tsx','FlowVideoLite',output,`--props=${props}`,'--codec=h264','--concurrency=1',...browserArgs]);
    await writeFile(path.join(root,'out/captions.srt'),srt(plan));
    await writeFile(path.join(root,'out/export.json'),JSON.stringify({...result,output,captionTiming:'scene-level, not word-aligned',visualQA:'pending user/agent review'},null,2));
    console.log(`Exported ${output}. Review playback, spelling, audio and caption timing before publishing.`);return;
  }
  console.log('Windi Flow Video Lite\n  node scripts/kit.mjs doctor|check|preview|render\n  node scripts/kit.mjs init --dir NEW_FOLDER --preset ugc-ad|faceless-explainer|saas-demo');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
