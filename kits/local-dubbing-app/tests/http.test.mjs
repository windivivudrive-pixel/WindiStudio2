import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { request as httpRequest } from 'node:http';

test('HTTP persistence, chat handoff, stale revision, origin guard and private files',{timeout:15000},async()=>{
 const root=mkdtempSync(join(tmpdir(),'windi-http-'));
 const port=19000+Math.floor(Math.random()*10000),base=`http://127.0.0.1:${port}`;
 const server=spawn(process.execPath,[join(dirname(fileURLToPath(import.meta.url)),'../server.mjs')],{env:{...process.env,LOCAL_DUBBING_PORT:String(port),WINDI_DUBBING_DATA:root},stdio:['ignore','pipe','pipe']});
 try{
  await Promise.race([once(server.stdout,'data'),once(server,'error').then(([e])=>{throw e;}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Server start timed out')),5000).unref())]);
  async function api(path,body,method='POST'){const r=await fetch(base+path,body?{method,headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(body)}:{});return [r,await r.json()];}
  let [r,p]=await api('/api/projects',{name:'chat flow'});assert.equal(r.status,200);
  const secret='fixture-private-voice-key';
  let [,voiceConfig]=await api('/api/voice-config',{provider:'openai',baseUrl:'https://example.com/v1',apiKey:secret});
  assert.equal(voiceConfig.openai.configured,true);assert.ok(!JSON.stringify(voiceConfig).includes(secret));
  [,voiceConfig]=await api('/api/voice-config');assert.ok(!JSON.stringify(voiceConfig).includes(secret));
  assert.equal((await fetch(base+'/voice-api.json')).status,404);
  assert.equal((await fetch(base+'/api/projects/'+p.id+'/file/voice-api.json')).status,400);
  [,p]=await api('/api/projects/'+p.id,{config:{provider:'chat'},segments:[{id:'x',start:0,end:2,text:'Hello',translation:''}]},'PATCH');
  await api('/api/projects/'+p.id+'/job',{step:'translate'});
  await new Promise(r=>setTimeout(r,80));
  const [,request]=await api('/api/projects/'+p.id+'/request');assert.equal(request.revision,p.revision);
  [r]=await api('/api/projects/'+p.id+'/translation',{revision:-1,segments:[{id:'x',translation:'Xin chào'}]});assert.equal(r.status,400);
  [r,p]=await api('/api/projects/'+p.id+'/translation',{revision:request.revision,segments:[{id:'x',translation:'Xin chào'}]});assert.equal(r.status,200);assert.equal(p.segments[0].translation,'Xin chào');
  const [,saved]=await api('/api/projects/'+p.id);assert.equal(saved.segments[0].translation,'Xin chào');
  assert.ok(!JSON.stringify(saved).includes(secret));
  [r,p]=await api('/api/projects/'+p.id+'/preferences',{config:{ttsProvider:'openai',apiModel:'fixture-model',translationStyle:'concise',delivery:'calm',translationNotes:'Giữ tên sản phẩm',uiTheme:'light'},speakers:[{id:'speaker_1',name:'Người đọc',voice:'fixture-voice'}],voiceApi:{provider:'openai',baseUrl:'https://example.com/v1',apiKey:secret}});
  assert.equal(r.status,200);assert.equal(p.config.provider,'chat');assert.equal(p.speakers[0].voice,'fixture-voice');assert.ok(!JSON.stringify(p).includes(secret));
  const [,context]=await api('/api/projects/'+p.id+'/context');
  assert.equal(context.config.delivery,'calm');assert.match(context.prompt,/Ưu tiên lời ngắn/);assert.match(context.prompt,/Điềm tĩnh/);assert.ok(!JSON.stringify(context).includes(secret));
  const [,created]=await api('/api/projects',{name:'inherited preferences'});
  assert.equal(created.config.translationStyle,'concise');assert.equal(created.config.uiTheme,'light');assert.equal(created.speakers[0].voice,'fixture-voice');assert.deepEqual(created.segments,[]);
  const [,beforeInvalid]=await api('/api/projects/'+p.id);
  [r]=await api('/api/projects/'+p.id+'/preferences',{config:{delivery:'invalid'},voiceApi:{provider:'openai',baseUrl:'https://example.com/v1',clearKey:true}});
  assert.equal(r.status,400);
  assert.deepEqual((await api('/api/projects/'+p.id))[1],beforeInvalid);
  assert.equal((await api('/api/voice-config'))[1].openai.configured,true);
  const [,diagnostics]=await api('/api/projects/'+p.id+'/diagnostics');assert.equal(diagnostics.projectId,p.id);assert.ok(!JSON.stringify(diagnostics).includes(secret));
  const [,fonts]=await api('/api/subtitle-fonts');assert.ok(Array.isArray(fonts));assert.ok(fonts.every(f=>!('path' in f)));
  [r,p]=await api('/api/projects/'+p.id+'/preferences',{config:{fontFamily:'sans',backgroundColor:'#345678',backgroundOpacity:35}});
  assert.equal(r.status,200);assert.equal(p.config.backgroundOpacity,35);
  const [,captionDefaults]=await api('/api/projects',{name:'caption defaults'});
  assert.equal(captionDefaults.config.fontFamily,'sans');assert.equal(captionDefaults.config.backgroundColor,'#345678');assert.equal(captionDefaults.config.backgroundOpacity,35);
  assert.equal((await fetch(base+'/server.mjs')).status,404);
  assert.equal((await fetch(base+'/api/projects',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:'{}'})).status,403);
  const hostileHost=await new Promise((resolve,reject)=>{const req=httpRequest(base+'/api/projects',{headers:{Host:'untrusted.example'}},r=>{r.resume();resolve(r.statusCode);});req.on('error',reject);req.end();});
  assert.equal(hostileHost,403);
 }finally{server.kill('SIGTERM');await once(server,'close');rmSync(root,{recursive:true,force:true});}
});
