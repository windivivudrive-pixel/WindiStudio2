import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {run} from '../process.mjs';
test('real export preserves short voice cadence at 24/48 kHz, remeasures old ratios, and diagnoses rate mismatch',{timeout:20000},async()=>{
 const root=await mkdtemp(join(tmpdir(),'windi-timing-'));process.env.WINDI_DUBBING_DATA=root;
 const p=await import('../pipeline.mjs');
 try{
  const source=join(root,'input.mp4');await run('ffmpeg',['-v','error','-f','lavfi','-i','color=s=180x320:r=30','-t','2','-c:v','libx264','-pix_fmt','yuv420p',source]);
  for(const [mode,rate] of [['v3turbo',48000],['v3nano',24000]]){
   let project=p.createProject(mode);await p.importVideo(project.id,source);
   project=p.updateProject(project.id,{config:{mode,ttsProvider:'local',subtitle:'none'},segments:[{id:'a',start:.5,end:1.5,text:'Hello',translation:'Xin chào'}]});
   const dir=p.projectDir(project.id);await mkdir(join(dir,'tts'));
   const raw=join(dir,'tts/a.wav');await run('ffmpeg',['-v','error','-f','lavfi','-i',`sine=frequency=440:sample_rate=${rate}:duration=0.6`,'-af','apad,atrim=duration=0.85',raw]);
   project.segments[0].ratio=1;project.artifacts.tts={runtime:'',provider:'local'};p.saveProject(project);
   async function render(){p.startJob(project.id,'render',{vieneu:''});for(let i=0;i<1000;i++){project=p.getProject(project.id);if(project.job.status!=='running')return;await new Promise(r=>setTimeout(r,10));}throw new Error('Timeout');}
   await render();assert.equal(project.job.status,'done',project.job.message);assert.equal(project.segments[0].timing.audioTempo,1);assert.equal(project.segments[0].audio.sampleRate,rate);
   const exported=join(dir,'dubbed.mp4');const measure=JSON.parse((await run('ffprobe',['-v','error','-show_format','-of','json',exported])).stdout);assert.ok(Math.abs(Number(measure.format.duration)-2)<.1);
   const decoded=join(dir,'decoded.wav');await run('ffmpeg',['-v','error','-i',exported,'-ss','0.5','-t','1','-ac','1','-ar','48000',decoded]);
   const bytes=await readFile(decoded);const offset=bytes.indexOf(Buffer.from('data'))+8;let last=0;for(let at=offset;at+2<=bytes.length;at+=2)if(Math.abs(bytes.readInt16LE(at))>500)last=(at-offset)/2/48000;
   assert.ok(last>.57&&last<.63,`voice must end near 0.6s instead of being slowed to 0.65s; actual=${last}`);
   const diagnostics=await p.diagnoseProject(project.id,{vieneu:''});assert.equal(diagnostics.files[0].rateMismatch,false);assert.equal(diagnostics.files[0].timing.audioTempo,1);
   // A stale stored ratio must not let severely mismatched audio through.
   await run('ffmpeg',['-y','-v','error','-f','lavfi','-i',`sine=sample_rate=${rate}:duration=1.4`,raw]);
   await render();assert.equal(project.job.status,'error');assert.match(project.job.message,/20%/);
   await run('ffmpeg',['-y','-v','error','-f','lavfi','-i',`sine=sample_rate=${rate===48000?24000:48000}:duration=1`,raw]);
   const wrong=await p.diagnoseProject(project.id,{vieneu:''});assert.equal(wrong.files[0].rateMismatch,true);
   await render();assert.equal(project.job.status,'error');assert.match(project.job.message,/Sample rate/);
  }
 }finally{await rm(root,{recursive:true,force:true});}
});
