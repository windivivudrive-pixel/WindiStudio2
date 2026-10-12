import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, rm, readFile, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apiSpeech, apiVoices, publicVoiceSettings, saveVoiceSettings, validateBaseUrl } from '../voice-api.mjs';
import { run } from '../process.mjs';
function wav(){const n=48000,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(n,24);b.writeUInt32LE(n*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.round(1000*Math.sin(i*2*Math.PI*440/n)),44+i*2);return b;}
const segments=[{id:'a',translation:'Xin chào',voice:'host'},{id:'b',translation:'Chào bạn',voice:'guest'}];
test('external TTS contracts, distinct speakers, cache invalidation, errors and cancellation',{timeout:20000},async()=>{
 const root=await mkdtemp(join(tmpdir(),'windi-voice-')),calls=[];let status=200,delay=false;
 const server=createServer(async(req,res)=>{
   let body='';for await(const chunk of req)body+=chunk;calls.push({url:req.url,auth:req.headers.authorization,xi:req.headers['xi-api-key'],body:body?JSON.parse(body):null});
   if(delay)return;
   res.writeHead(status,{'content-type':req.url.includes('/voices')?'application/json':'audio/wav'});
   res.end(req.url.includes('/voices')?JSON.stringify({voices:[{voice_id:'host',name:'MC'}],has_more:false}):wav());
 });server.listen(0,'127.0.0.1');await once(server,'listening');
 const baseUrl=`http://127.0.0.1:${server.address().port}/v1`;
 const execute=(name,args)=>run(name,args);
 try{
  await saveVoiceSettings(root,{provider:'openai',baseUrl,apiKey:'fixture-secret'});
  const safe=await publicVoiceSettings(root);assert.equal(safe.openai.configured,true);assert.ok(!JSON.stringify(safe).includes('fixture-secret'));
  if(process.platform!=='win32')assert.equal((await stat(join(root,'voice-api.json'))).mode&0o777,0o600);
  await assert.rejects(saveVoiceSettings(root,{provider:'openai',baseUrl:baseUrl+'/new',apiKey:''}),/Nhập lại/);
  const config={ttsProvider:'openai',apiModel:'test-model'};
  const input={root,config,segments,directory:join(root,'tts'),execute};
  await apiSpeech(input);assert.equal(calls.length,2);assert.deepEqual(calls.map(c=>c.body.voice),['host','guest']);assert.equal(calls[0].body.response_format,'mp3');assert.equal(calls[0].auth,'Bearer fixture-secret');
  assert.equal((await readFile(join(root,'tts/a.wav'))).toString('ascii',0,4),'RIFF');
  await apiSpeech(input);assert.equal(calls.length,2);
  await apiSpeech({...input,segments:[{...segments[0],voice:'new-voice'},segments[1]]});assert.equal(calls.length,3);assert.equal(calls[2].body.voice,'new-voice');
  const count=calls.length;await assert.rejects(apiSpeech({...input,segments:[segments[0],{...segments[1],voice:''}]}),/voice ID/);assert.equal(calls.length,count);
  await saveVoiceSettings(root,{provider:'elevenlabs',baseUrl,apiKey:'eleven-fixture'});
  assert.equal((await apiVoices(root,'elevenlabs'))[0].id,'host');assert.match(calls.at(-1).url,/^\/v2\/voices/);
  await writeFile(join(root,'tts/a.wav.json'),'local-marker');
  await apiSpeech({...input,config:{ttsProvider:'elevenlabs',apiModel:'eleven_v3'}});
  assert.match(calls.at(-1).url,/\/v1\/text-to-speech\/guest\?output_format=mp3_44100_128/);assert.equal(calls.at(-1).xi,'eleven-fixture');assert.equal(calls.at(-1).body.model_id,'eleven_v3');await assert.rejects(readFile(join(root,'tts/a.wav.json')));
  for(const code of [401,429]){status=code;await assert.rejects(apiSpeech({...input,directory:join(root,String(code))}),new RegExp('HTTP '+code));}
  // Exercise the real job pipeline and FFmpeg render with fixture audio, no paid API.
  status=200;process.env.WINDI_DUBBING_DATA=root;
  const pipeline=await import('../pipeline.mjs');
  const clip=join(root,'source.mp4');
  await run('ffmpeg',['-y','-v','error','-f','lavfi','-i','color=c=blue:s=160x90:r=30','-t','2','-c:v','libx264','-pix_fmt','yuv420p',clip]);
  let project=pipeline.createProject('two speakers');await pipeline.importVideo(project.id,clip);
  project=pipeline.updateProject(project.id,{config:{ttsProvider:'openai',apiModel:'fixture-model',subtitle:'none'},speakers:[{id:'host',name:'MC',voice:'host'},{id:'guest',name:'Khách',voice:'guest'}],segments:[{id:'a',start:0,end:1,text:'Hello',translation:'Xin chào',speaker:'host'},{id:'b',start:1,end:2,text:'Hi',translation:'Chào bạn',speaker:'guest'}]});
  async function job(step){pipeline.startJob(project.id,step,{vieneu:''});for(let i=0;i<400;i++){project=pipeline.getProject(project.id);if(project.job.status!=='running'){assert.equal(project.job.status,'done',project.job.message);return;}await new Promise(resolve=>setTimeout(resolve,10));}throw new Error('Job timed out');}
  await job('tts');assert.ok(project.segments.every(s=>Math.abs(s.ratio-1)<.01));
  assert.deepEqual(calls.slice(-2).map(c=>c.body.voice),['host','guest']);
  await job('render');assert.ok(project.artifacts.render.duration>=2);assert.ok((await stat(join(pipeline.projectDir(project.id),'dubbed.mp4'))).size>1000);
  assert.match(await readFile(join(pipeline.projectDir(project.id),'subtitles.srt'),'utf8'),/Xin chào/);
  status=200;delay=true;const controller=new AbortController();const pending=apiSpeech({...input,directory:join(root,'cancel'),signal:controller.signal});setTimeout(()=>controller.abort(),30);await assert.rejects(pending,/hủy/);
  await saveVoiceSettings(root,{provider:'openai',baseUrl,apiKey:'',clearKey:true});await assert.rejects(apiSpeech(input),/Chưa có API key/);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(root,{recursive:true,force:true});}
});
test('API endpoints reject credentials, query strings and remote plain HTTP',()=>{
 for(const url of ['http://example.com/v1','https://user:pass@example.com/v1','https://example.com/v1?key=secret','file:///etc/passwd'])assert.throws(()=>validateBaseUrl(url));
 assert.equal(validateBaseUrl('https://example.com/v1/'),'https://example.com/v1');
});
