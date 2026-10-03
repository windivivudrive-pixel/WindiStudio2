import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {setTimeout as delay} from 'node:timers/promises';

test('Grok extension uses a separate native port and never writes legacy provider status',async()=>{
  const state:any={combinedStatus:{flow:{connected:true,queued:2},chatgpt:{connected:true,queued:3}}};
  const original=JSON.stringify(state.combinedStatus);const hosts:string[]=[],messages:any[]=[],writes:string[]=[];
  let onDisconnect=()=>{},onMessage=(_message:any)=>{};
  const port={onDisconnect:{addListener(fn:any){onDisconnect=fn;}},onMessage:{addListener(fn:any){onMessage=fn;}},postMessage(m:any){messages.push(m);}};
  const chrome={debugger:{onDetach:{addListener(){}}},storage:{local:{async get(key:string){return {[key]:state[key]};},async set(patch:any){writes.push(...Object.keys(patch));Object.assign(state,patch);}}},runtime:{lastError:null as any,connectNative(host:string){hosts.push(host);return port;},onMessage:{addListener(){}}},alarms:{onAlarm:{addListener(){}}}};
  const source=await readFile(new URL('../extension/grok-background.js',import.meta.url),'utf8');
  vm.runInNewContext(source.replace(/^import .*;\n/gm, '').replace('export function handleGrokMessage','function handleGrokMessage'),{chrome,crypto:{randomUUID:()=> 'grok-test-installation'},URL});await delay(5);
  assert.deepEqual(hosts,['com.windistudio.connect.grok']);assert.equal(messages[0].type,'hello');
  onMessage({type:'status',status:{authenticated:true,complete:1}});await delay(5);assert.equal(state.grokStatus.authenticated,true);
  chrome.runtime.lastError={message:'Test disconnect'};onDisconnect();await delay(5);
  assert.equal(state.grokStatus.backendConnected,false);assert.equal(JSON.stringify(state.combinedStatus),original);assert.equal(writes.includes('combinedStatus'),false);
});

test('the combined listener routes Grok actions to one responder and login returns Web session state',async()=>{
  const combined=await readFile(new URL('../extension/combined-background.js',import.meta.url),'utf8');
  assert.match(combined,/if\(message.type==='grokAction'\)return handleGrokMessage\(message,reply\)/);
  const source=await readFile(new URL('../extension/grok-background.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/runtime\.onMessage\.addListener/);
  let response:any,opened:string|undefined;
  const chrome={debugger:{onDetach:{addListener(){}}},storage:{local:{async get(){return {};},async set(){}}},runtime:{lastError:null,connectNative(){return {onDisconnect:{addListener(){}},onMessage:{addListener(){}},postMessage(){}};},sendNativeMessage(_host:string,message:any,callback:any){assert.equal(message.op,'grok.login');callback({result:{authenticated:true,transport:'web'}});}},tabs:{async create({url}:{url:string}){opened=url;}},alarms:{onAlarm:{addListener(){}}}};
  const scope:any={chrome,crypto:{randomUUID:()=> 'test'},URL};vm.runInNewContext(source.replace(/^import .*;\n/gm, '').replace('export function handleGrokMessage','function handleGrokMessage'),scope);await delay(5);
  assert.equal(scope.handleGrokMessage({type:'grokAction',action:'login'},(r:any)=>{response=r;}),true);
  assert.equal(response.ok,true);assert.equal(opened,undefined);assert.equal(response.result.transport,'web');
});

test('Grok restores only its exact persisted post and leaves a recycled tab untouched',async()=>{
  const jobId='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const postUrl='https://grok.com/imagine/post/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb?conversation=cccccccc-cccc-cccc-cccc-cccccccccccc';
  const state:any={[`grokUIJob:${jobId}`]:{state:'generating',tabId:4,postUrl},grokActiveJob:jobId};
  const created:any[]=[];let reloads=0;
  const chrome={debugger:{onDetach:{addListener(){}}},storage:{local:{async get(key:string){return {[key]:state[key]};},async set(value:any){Object.assign(state,value);},async remove(key:string){delete state[key];}}},tabs:{async get(){return {id:4,url:'https://grok.com/imagine/post/a-different-user-post'};},async create(options:any){created.push(options);return {id:9,...options};},async reload(){reloads++;}},runtime:{connectNative(){return {onDisconnect:{addListener(){}},onMessage:{addListener(){}},postMessage(){}};}},alarms:{onAlarm:{addListener(){}}}};
  const source=await readFile(new URL('../extension/grok-background.js',import.meta.url),'utf8');
  const scope:any={chrome,crypto:{randomUUID:()=> 'test'},URL};
  vm.runInNewContext(source.replace(/^import .*;\n/gm,'').replace('export function handleGrokMessage','function handleGrokMessage'),scope);
  await scope.execute('ui.restore',{jobId});
  assert.equal(created.length,1);assert.equal(created[0].url,postUrl);assert.equal(state.grokWebTabId,9);
  await assert.rejects(()=>scope.refresh(),/GROK_JOB_ACTIVE/);assert.equal(reloads,0);
  await assert.rejects(()=>scope.execute('ui.restore',{jobId:'other',postUrl:'https://example.com/imagine/post/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb?conversation=cccccccc-cccc-cccc-cccc-cccccccccccc'}),/GROK_INVALID_POST_URL/);
});
