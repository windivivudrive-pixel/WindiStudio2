import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,stat} from 'node:fs/promises';
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
});
