import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { apiVoices, apiSpeech, saveVoiceSettings, publicVoiceSettings } from '../voice-api.mjs';
import { run } from '../process.mjs';
const host='11111111-1111-4111-8111-111111111111',guest='22222222-2222-4222-8222-222222222222';
const secret='windi_voice_'+ 'fixture'.repeat(8);
function wav(){const b=Buffer.alloc(44+48000*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(48000,24);b.writeUInt32LE(96000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);return b;}
async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'windi-voice-native-')),calls=[],assets=[],jobs=new Map();
 let failAudio=false,lostPost=false,newStatus='ready',invalidTiming=false,paged=true;
 const storage=createServer((req,res)=>{assets.push({url:req.url,authorization:req.headers.authorization});res.writeHead(failAudio?503:200,{'content-type':'audio/wav'});res.end(wav());});
 storage.listen(0,'127.0.0.1');await once(storage,'listening');
 const server=createServer(async(req,res)=>{
   let raw='';for await(const chunk of req)raw+=chunk;
   const body=raw?JSON.parse(raw):null;calls.push({url:req.url,method:req.method,key:req.headers['idempotency-key'],authorization:req.headers.authorization,body});
   const url=new URL(req.url,'http://localhost');
   const json=(value,code=200)=>{res.writeHead(code,{'content-type':'application/json'});res.end(JSON.stringify(value));};
   if(url.pathname==='/api/v1/voice/voices')return json(url.searchParams.has('cursor')?{data:[{id:guest,name:'Khách mời',language:'vi',kind:'clone'}],has_more:false}:{data:[{id:host,name:'MC',language:'vi',kind:'public'}],has_more:paged,next_page:paged?'page2':null});
   if(url.pathname==='/api/v1/voice/generations' && req.method==='POST'){
     const key=req.headers['idempotency-key'];let job=jobs.get(key);
     if(!job){job={id:randomUUID(),status:newStatus};jobs.set(key,job);}
     if(lostPost){lostPost=false;res.destroy();return;}
     return json(job,job.status==='ready'?201:202);
   }
   const match=url.pathname.match(/^\/api\/v1\/voice\/generations\/([^/]+)(\/audio)?$/);
   if(match){const job=[...jobs.values()].find(j=>j.id===match[1]);if(!job)return json({},404);
     if(match[2]){res.writeHead(307,{Location:`http://127.0.0.1:${storage.address().port}/signed-audio?fixture=signature`});return res.end();}
     if(job.status==='pending')job.status='ready';
     return json({...job,...(url.searchParams.has('include')?{timestamps:invalidTiming?null:{words:['Xin','chào'],start:[0,.3],end:[.3,.8]}}:{})});
   }
   json({},404);
 });server.listen(0,'127.0.0.1');await once(server,'listening');
 const baseUrl=`http://127.0.0.1:${server.address().port}`;
 await saveVoiceSettings(root,{provider:'windi',baseUrl,apiKey:secret});
 const input={root,config:{ttsProvider:'windi',apiModel:''},segments:[{id:'a',voice:host,translation:'Xin chào'},{id:'b',voice:guest,translation:'Chào bạn'}],directory:join(root,'tts'),execute:(name,args)=>run(name,args)};
 return {root,baseUrl,calls,assets,jobs,input,set:v=>{if('failAudio'in v)failAudio=v.failAudio;if('lostPost'in v)lostPost=v.lostPost;if('newStatus'in v)newStatus=v.newStatus;if('invalidTiming'in v)invalidTiming=v.invalidTiming;if('paged'in v)paged=v.paged;},close:async()=>{server.closeAllConnections();storage.closeAllConnections();await Promise.all([new Promise(r=>server.close(r)),new Promise(r=>storage.close(r))]);await rm(root,{recursive:true,force:true});}};
}
test('Windi Voice own API protocol, paginated voices/clones, distinct IDs and signed audio without token',{timeout:15000},async()=>{
 const f=await fixture();try{
  const voices=await apiVoices(f.root,'windi');assert.deepEqual(voices.map(v=>v.id),[host,guest]);assert.match(voices[1].label,/Giọng clone/);assert.ok(!JSON.stringify(await publicVoiceSettings(f.root)).includes(secret));
  await assert.rejects(saveVoiceSettings(f.root,{provider:'windi',baseUrl:f.baseUrl+'/v1',apiKey:secret}),/URL gốc/);
  await assert.rejects(saveVoiceSettings(f.root,{provider:'windi',baseUrl:f.baseUrl,apiKey:'wrong-key'}),/API key Windi/);
  await apiSpeech(f.input);
  const posts=f.calls.filter(c=>c.method==='POST');assert.equal(posts.length,2);assert.deepEqual(posts.map(c=>c.body.voice_id),[host,guest]);assert.deepEqual(posts[0].body,{text:'Xin chào',voice_id:host,language:'vi',speed:1});assert.ok(posts.every(c=>c.key && c.authorization==='Bearer '+secret));
  assert.equal(f.assets.length,2);assert.ok(f.assets.every(c=>c.authorization===undefined));
  assert.equal((await readFile(join(f.input.directory,'a.wav'))).toString('ascii',0,4),'RIFF');
  const timing=JSON.parse(await readFile(join(f.input.directory,'a.wav.windi-timing.json'),'utf8'));assert.equal(timing.timestamps.words[0],'Xin');assert.ok(timing.generationId);
  await apiSpeech(f.input);assert.equal(f.calls.filter(c=>c.method==='POST').length,2);assert.equal(f.assets.length,2);
  const n=f.calls.length;await assert.rejects(apiSpeech({...f.input,segments:[f.input.segments[0],{...f.input.segments[1],voice:'not-uuid'}]}),/UUID/);assert.equal(f.calls.length,n);
 }finally{await f.close();}
});
test('Windi Voice resumes signed download failure and missing timing without regenerating',{timeout:15000},async()=>{
 const f=await fixture();const input={...f.input,segments:[f.input.segments[0]]};try{
  f.set({failAudio:true});await assert.rejects(apiSpeech(input),/link mới/);assert.equal(f.jobs.size,1);
  f.set({failAudio:false});await apiSpeech(input);assert.equal(f.calls.filter(c=>c.method==='POST').length,1);assert.equal(f.jobs.size,1);
  const second={...input,directory:join(f.root,'invalid-timing')};f.set({invalidTiming:true});await assert.rejects(apiSpeech(second),/timestamp/);const count=f.calls.filter(c=>c.method==='POST').length;
  f.set({invalidTiming:false});await apiSpeech(second);assert.equal(f.calls.filter(c=>c.method==='POST').length,count);
 }finally{await f.close();}
});
test('Windi Voice persists idempotency before POST, handles pending, unknown and confirmed failure',{timeout:15000},async()=>{
 const f=await fixture();const input={...f.input,segments:[f.input.segments[0]]};try{
  f.set({lostPost:true});await assert.rejects(apiSpeech(input),/Không kết nối/);await apiSpeech(input);
  assert.equal(f.jobs.size,1);const posts=f.calls.filter(c=>c.method==='POST');assert.equal(posts[0].key,posts[1].key);
  f.set({newStatus:'pending'});await apiSpeech({...input,segments:[{...input.segments[0],translation:'Đang xử lý'}],directory:join(f.root,'pending')});
  f.set({newStatus:'unknown'});const unknown={...input,segments:[{...input.segments[0],translation:'Đối soát'}],directory:join(f.root,'unknown')};await assert.rejects(apiSpeech(unknown),/đối soát/);const count=f.jobs.size;await assert.rejects(apiSpeech(unknown),/đối soát/);assert.equal(f.jobs.size,count);
  f.set({newStatus:'failed'});const failed={...input,segments:[{...input.segments[0],translation:'Thử lại'}],directory:join(f.root,'failed')};await assert.rejects(apiSpeech(failed),/thất bại/);const previous=f.jobs.size;f.set({newStatus:'ready'});await apiSpeech(failed);assert.equal(f.jobs.size,previous+1);
  const controller=new AbortController();controller.abort();await assert.rejects(apiSpeech({...input,directory:join(f.root,'cancel'),signal:controller.signal}));
 }finally{await f.close();}
});
test('Windi Voice pipeline loads named voices and renders two speakers without a local TTS runtime',{timeout:15000},async()=>{
 const f=await fixture();try{
  process.env.WINDI_DUBBING_DATA=f.root;
  const pipeline=await import('../pipeline.mjs');
  const clip=join(f.root,'source.mp4');
  await run('ffmpeg',['-y','-v','error','-f','lavfi','-i','color=c=blue:s=160x90:r=30','-t','2','-c:v','libx264','-pix_fmt','yuv420p',clip]);
  let project=pipeline.createProject('Windi talkshow');await pipeline.importVideo(project.id,clip);
  project=pipeline.updateProject(project.id,{config:{ttsProvider:'windi',apiModel:'',subtitle:'none'},speakers:[{id:'host',name:'MC',voice:host},{id:'guest',name:'Khách mời',voice:guest}],segments:[{id:'a',start:0,end:1,text:'Hello',translation:'Xin chào',speaker:'host'},{id:'b',start:1,end:2,text:'Hi',translation:'Chào bạn',speaker:'guest'}]});
  async function job(step){pipeline.startJob(project.id,step,{vieneu:''});for(let i=0;i<500;i++){project=pipeline.getProject(project.id);if(project.job.status!=='running'){assert.equal(project.job.status,'done',project.job.message);return;}await new Promise(resolve=>setTimeout(resolve,10));}throw new Error('Job timed out');}
  await job('voices');assert.deepEqual(project.voices.map(v=>v.id),[host,guest]);
  await job('tts');assert.ok(project.segments.every(s=>Math.abs(s.ratio-1)<.01));
  assert.deepEqual(f.calls.filter(c=>c.method==='POST').map(c=>c.body.voice_id),[host,guest]);
  await job('render');assert.ok(project.artifacts.render.duration>=2);
  assert.ok((await stat(join(pipeline.projectDir(project.id),'dubbed.mp4'))).size>1000);
  assert.match(await readFile(join(pipeline.projectDir(project.id),'subtitles.srt'),'utf8'),/Chào bạn/);
 }finally{await f.close();}
});
