import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,stat,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import net from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
import {parseLines,VERSION} from '../src/protocol.ts';

test('daemon isolates provider connections, persists pairing, and rejects disconnected or foreign commands',async context=>{
  const home=await mkdtemp(path.join(tmpdir(),'windi-connect-test-'));
  const port=32_000+(process.pid%10_000);
  const child=spawn(process.execPath,['src/daemon.ts'],{env:{...process.env,WINDI_HOME:home,WINDI_TEST_TCP_PORT:String(port)},stdio:'pipe'});
  let diagnostic='';child.stderr.on('data',chunk=>diagnostic+=chunk.toString());
  context.after(()=>child.kill());
  for(let i=0;i<100;i++){if(child.exitCode!==null)throw new Error(diagnostic);const ready=await new Promise<boolean>(resolve=>{const probe=net.createConnection({host:'127.0.0.1',port});probe.once('connect',()=>{probe.destroy();resolve(true);});probe.once('error',()=>resolve(false));});if(ready)break;await delay(30);}
  const call=(op:string,args:any={},version=VERSION)=>new Promise<any>((resolve,reject)=>{
    const s=net.createConnection({host:'127.0.0.1',port});const timer=setTimeout(()=>{s.destroy();reject(new Error('timeout'));},2000);
    s.on('connect',()=>s.write(JSON.stringify({id:randomUUID(),version,op,args})+'\n'));
    s.on('error',reject);s.on('data',parseLines(message=>{clearTimeout(timer);s.end();resolve(message);}));
  });
  assert.equal((await call('doctor')).result.phase,'production-candidate');
  assert.equal((await call('doctor',{},99)).error,'PROTOCOL_VERSION_MISMATCH');
  assert.equal((await call('browser',{provider:'flow',action:'snapshot',args:{tabId:1}})).error,'EXTENSION_DISCONNECTED');
  assert.equal((await call('browser',{provider:'flow',action:'open',args:{url:'https://example.com'}})).error,'PROVIDER_URL_REJECTED');
  const ext=net.createConnection({host:'127.0.0.1',port});context.after(()=>ext.destroy());
  const extensionErrors:string[]=[];
  await new Promise<void>((resolve,reject)=>{
    ext.on('error',reject);
    ext.on('connect',()=>ext.write(`${JSON.stringify({version:VERSION,type:'extension.hello',provider:'flow',profile:'test-flow-profile'})}\n${JSON.stringify({version:VERSION,type:'status.request'})}\n`));
    ext.on('data',parseLines(message=>{
      if(message.type==='connected')resolve();
      if(message.type==='command')ext.write(JSON.stringify({version:VERSION,type:'reply',id:message.id,result:{tabId:123}})+'\n');
      if(message.error)extensionErrors.push(message.error);
    }));
  });
  await delay(15);assert.deepEqual(extensionErrors,[]);
  assert.equal(JSON.parse(await readFile(path.join(home,'profile.json'),'utf8')).flow,'test-flow-profile');
  assert.equal((await call('pair',{provider:'flow',profile:'another-flow-profile'})).error,'PAIRING_REQUIRES_RESET');
  assert.deepEqual((await call('browser',{provider:'flow',action:'open',args:{url:'https://flow.google.com/'}})).result,{tabId:123});
  assert.equal((await call('doctor')).result.providers.chatgpt.connected,false);
  const before=(await call('doctor')).result.providers;
  assert.equal((await call('grok.status')).result.authenticated,false);
  assert.equal((await call('browser',{provider:'grok',action:'open',args:{url:'https://flow.google.com/'}})).error,'GROK_BROWSER_OPERATIONS_UNSUPPORTED');
  const project=path.join(home,'project');await mkdir(project);await call('project.init',{project});
  const created=await call('job.create',{project,provider:'grok',kind:'create',prompt:'A test image',output:'assets/grok/test'});
  assert.equal(created.result.job.status,'needs_user_action');assert.equal(created.result.job.error_code,'GROK_LOGIN_REQUIRED');
  await call('grok.logout');
  const after=(await call('doctor')).result.providers;
  assert.deepEqual(after.flow,before.flow);assert.deepEqual(after.chatgpt,before.chatgpt);

  ext.destroy();await delay(30);
  const batchArgs={project,provider:'flow',kind:'create',prompt:'An owl',output:'assets/windi/owl.jpg',aspect:'4:3',model:'lite',count:4,requestKey:'four-owls'};
  const variants=(await call('job.create',batchArgs)).result;
  assert.equal(variants.jobs.length,4);assert.equal(variants.reused,false);
  assert.deepEqual(variants.jobs.map((job:any)=>job.output_path),[1,2,3,4].map(n=>`assets/windi/owl-0${n}.jpg`));
  assert.deepEqual(variants.jobs[0].options,{aspect:'4x3',model:'HARBOR_SEAL'});
  const repeated=(await call('job.create',batchArgs)).result;
  assert.equal(repeated.reused,true);assert.deepEqual(repeated.jobs.map((j:any)=>j.id),variants.jobs.map((j:any)=>j.id));
  assert.equal((await call('job.create',{...batchArgs,count:2})).error,'REQUEST_KEY_CONTENT_MISMATCH');
  assert.equal((await call('job.create',{...batchArgs,model:'pro'})).error,'REQUEST_KEY_CONTENT_MISMATCH');
  assert.equal((await call('job.create',{...batchArgs,aspect:'21:9'})).error,'FLOW_ASPECT_UNSUPPORTED');

});
