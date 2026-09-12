import {cleanFlowImage} from './watermark.ts';
import {audioEnvelope} from './audio-envelope.ts';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {copyFile,mkdir,readFile,writeFile,lstat} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {loadApprovedLayout,loadWorkflow,registerRenderArtifacts,validateCaptions,validateScript,type ImageManifest,type ScriptArtifact} from './workflow.ts';
import {safeFile,uniqueOutput} from './project.ts';

type Caption={text:string;startMs:number;endMs:number;timestampMs:number|null;confidence:number|null};
const here=path.dirname(fileURLToPath(import.meta.url));
async function rendererRoot(){for(const candidate of [path.resolve(here,'../renderer'),path.resolve(here,'../../../kits/video-starter')])if(await lstat(path.join(candidate,'package.json')).catch(()=>null))return candidate;throw new Error('RENDERER_NOT_INSTALLED');}
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/[^a-z0-9\p{L}]+/gu,' ').trim();
function timedBeats(script:ScriptArtifact,captions:Caption[]){
  const total=Math.max(...captions.map(c=>c.endMs));let fallbackCursor=0;const weights=script.beats.map(beat=>Math.max(1,Array.from(beat.voiceOver).length));const weightTotal=weights.reduce((a,b)=>a+b,0);const starts=script.beats.map((beat,index)=>{
    if(index===0)return 0;
    const anchor=normalize(beat.spokenAnchor);const words=anchor.split(' ').slice(0,4).join(' ');const found=captions.find(caption=>normalize(caption.text).includes(words)||words.includes(normalize(caption.text)));
    if(found&&found.startMs>=fallbackCursor){fallbackCursor=found.startMs;return found.startMs;}
    const prior=weights.slice(0,index).reduce((a,b)=>a+b,0);const calculated=Math.round(total*prior/weightTotal);fallbackCursor=Math.max(fallbackCursor,calculated);return fallbackCursor;
  });
  return script.beats.map((beat,index)=>({...beat,startMs:starts[index],endMs:Math.max(starts[index]+300,starts[index+1]??total)}));
}
function srtTime(ms:number){const value=Math.max(0,Math.round(ms)),hours=Math.floor(value/3600000),minutes=Math.floor(value%3600000/60000),seconds=Math.floor(value%60000/1000),millis=value%1000;return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')},${String(millis).padStart(3,'0')}`;}
function toSrt(captions:Caption[]){return captions.map((caption,index)=>`${index+1}\n${srtTime(caption.startMs)} --> ${srtTime(caption.endMs)}\n${caption.text.trim()}\n`).join('\n');}
async function run(root:string,args:string[]){return new Promise<void>((resolve,reject)=>{const cli=path.join(root,'node_modules/@remotion/cli/remotion-cli.js');const child=spawn(process.execPath,[cli,...args],{cwd:root,stdio:'inherit',env:{...process.env,REMOTION_SKIP_UPDATE_CHECK:'1'}});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`REMOTION_EXIT_${code}`)));});}
export async function prepareRender(projectRoot:string){
  const state=await loadWorkflow(projectRoot);if(state.approvals.script.status!=='approved'||!state.current.script)throw new Error('SCRIPT_APPROVAL_REQUIRED');if(!state.artifacts.voice||!state.artifacts.captions)throw new Error('VOICE_AND_CAPTIONS_REQUIRED');
  const layoutProfile=await loadApprovedLayout(projectRoot,state);const script=validateScript(JSON.parse(await readFile(path.join(projectRoot,state.current.script),'utf8')));const captions=validateCaptions(JSON.parse(await readFile(path.join(projectRoot,state.artifacts.captions),'utf8'))) as Caption[];const renderer=await rendererRoot();const relative=`windi-job/${state.workflowId}`;const staging=path.join(renderer,'public',relative);await mkdir(staging,{recursive:true,mode:0o700});
  const audioSource=await safeFile(projectRoot,path.join(projectRoot,state.artifacts.voice));const audioName=`audio${path.extname(audioSource)||'.mp3'}`;await copyFile(audioSource,path.join(staging,audioName));
  if(!state.artifacts.imageManifest)throw new Error('IMAGE_MANIFEST_REQUIRED');const manifest=JSON.parse(await readFile(path.join(projectRoot,state.artifacts.imageManifest),'utf8')) as ImageManifest;let beats=timedBeats(script,captions);const exact=JSON.parse(await readFile(path.join(projectRoot,"windi/timing/beat-timing.json"),"utf8").catch(()=>"null"));if(exact?.scriptVersion===script.version&&path.resolve(projectRoot,state.artifacts.voice)===exact.audio&&exact.beats.length===beats.length)beats=beats.map((b,i)=>{if(exact.beats[i].id!==b.id)throw new Error("BEAT_TIMING_MISMATCH");return {...b,startMs:exact.beats[i].startMs,endMs:exact.beats[i].endMs};});for(const [index,beat] of beats.entries()){const job=manifest.jobs[index];if(!job)throw new Error(`IMAGE_JOB_MISSING_${index+1}`);let expected=path.join(projectRoot,job.output);if(!path.extname(expected)){for(const extension of ['.png','.jpg','.webp','.gif']){const candidate=`${expected}${extension}`;if(await lstat(candidate).catch(()=>null)){expected=candidate;break;}}}const original=await safeFile(projectRoot,expected);const source=job.provider==='flow'?(await cleanFlowImage(projectRoot,original)).output:original;const name=`scene-${String(index+1).padStart(2,'0')}${path.extname(source)}`;await copyFile(source,path.join(staging,name));(beat as typeof beat&{image:string}).image=`${relative}/${name}`;}
  const presentation=JSON.parse(await readFile(path.join(projectRoot,'.windi','presentation.json'),'utf8').catch(error=>{if(error.code==='ENOENT')return 'null';throw error;}));
  const sampleRanges=JSON.parse(await readFile(path.join(projectRoot,'windi','timing','sample-ranges.json'),'utf8').catch(error=>{if(error.code==='ENOENT')return '[]';throw error;}));
  const props={title:script.title,layout:layoutProfile.basePreset,layoutProfile,presentation,sampleRanges,audio:`${relative}/${audioName}`,audioEnvelope:await audioEnvelope(audioSource),beats,captions,brand:'WINDI STUDIO'};const propsPath=path.join(staging,'render-props.json');await writeFile(propsPath,JSON.stringify(props,null,2),{mode:0o600});return {renderer,propsPath,scriptVersion:script.version,captions,state};
}
export async function previewVideo(projectRoot:string){const prepared=await prepareRender(projectRoot);await run(prepared.renderer,['studio','src/index.ts','--no-open','--props',prepared.propsPath]);}
export async function renderVideo(projectRoot:string){
  const prepared=await prepareRender(projectRoot);const outputDir=path.join(projectRoot,'windi','renders');const qaDir=path.join(projectRoot,'windi','qa');const timingDir=path.join(projectRoot,'windi','timing');await mkdir(outputDir,{recursive:true});await mkdir(qaDir,{recursive:true});await mkdir(timingDir,{recursive:true});
  const render=await uniqueOutput(path.join(outputDir,'final.mp4'));const cover=await uniqueOutput(path.join(outputDir,'cover.png'));const captionsSrt=path.join(timingDir,'captions.srt');await writeFile(captionsSrt,toSrt(prepared.captions),{mode:0o600});
  await run(prepared.renderer,['render','src/index.ts','WindiVideo',render,'--props',prepared.propsPath,'--codec','h264','--crf','18']);await run(prepared.renderer,['still','src/index.ts','WindiVideo',cover,'--props',prepared.propsPath,'--frame','0']);
  const [videoInfo,coverInfo]=await Promise.all([lstat(render),lstat(cover)]);const qa={schemaVersion:1,passed:videoInfo.size>1000&&coverInfo.size>100,checkedAt:new Date().toISOString(),checks:{videoBytes:videoInfo.size,coverBytes:coverInfo.size,captionCount:prepared.captions.length,sceneCount:prepared.state.artifacts.imageManifest?(JSON.parse(await readFile(path.join(projectRoot,prepared.state.artifacts.imageManifest),'utf8')) as ImageManifest).jobs.length:0,audio:true},outputs:{render,cover,captionsSrt}};const qaFile=path.join(qaDir,`qa-script-v${String(prepared.scriptVersion).padStart(2,'0')}.json`);await writeFile(qaFile,`${JSON.stringify(qa,null,2)}\n`,{mode:0o600});await registerRenderArtifacts(projectRoot,{render,cover,captionsSrt,qa:qaFile});return {render,cover,captionsSrt,qa:qaFile,passed:qa.passed};
}
