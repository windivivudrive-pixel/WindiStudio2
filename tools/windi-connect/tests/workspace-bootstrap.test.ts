import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore browser module
import {ensureFlowWorkspace} from '../extension/workspace-bootstrap.js';
import {isChatConversation,userProblem,runProviderJob} from '../src/providers.ts';
const url='https://flow.google.com/project/65761a43-b56d-41a6-aa44-b4861eac2c95';
function fixture(){
 const data:any={};let tab:any={id:1,url:'https://flow.google.com/'};let clicks=0,opens=0;
 const deps:any={projectId:'episode',storage:{get:async()=>data,set:async(p:any)=>Object.assign(data,p)},tabs:{get:async()=>tab},open:async(u:string)=>{opens++;tab={...tab,url:u};return tab;},adopt:async()=>{},evaluate:async()=>({x:1,y:2}),click:async()=>{clicks++;tab={...tab,url};},pause:async()=>{}};
 return {deps,data,counts:()=>({clicks,opens}),setTab:(value:any)=>{tab=value;}};
}
test('Flow creates once and reuses the saved workspace across retries',async()=>{
 const f=fixture();assert.equal((await ensureFlowWorkspace(f.deps)).url,url);
 assert.equal((await ensureFlowWorkspace(f.deps)).url,url);assert.equal(f.counts().clicks,1);
});
test('Flow recovers a project after the click reply is lost without another click',async()=>{
 const f=fixture();f.deps.click=async()=>{f.setTab({id:1,url});throw new Error('lost reply');};
 await assert.rejects(ensureFlowWorkspace(f.deps),/lost reply/);
 f.deps.click=async()=>{throw new Error('must not click again');};
 assert.equal((await ensureFlowWorkspace(f.deps)).url,url);
});
test('Flow timeout preserves uncertain creation and never clicks twice',async()=>{
 const f=fixture();let clicks=0;f.deps.click=async()=>{clicks++;};
 await assert.rejects(ensureFlowWorkspace(f.deps),/FLOW_WORKSPACE_CREATION_UNCERTAIN/);
 await assert.rejects(ensureFlowWorkspace(f.deps),/FLOW_WORKSPACE_CREATION_UNCERTAIN/);
 assert.equal(clicks,1);
});
test('Flow missing create control can be retried after login',async()=>{
 const f=fixture();f.deps.evaluate=async()=>null;
 await assert.rejects(ensureFlowWorkspace(f.deps),/FLOW_WORKSPACE_CREATE_UNAVAILABLE/);
 assert.equal(f.counts().clicks,0);f.deps.evaluate=async()=>({x:1,y:2});
 assert.equal((await ensureFlowWorkspace(f.deps)).url,url);
});
test('ChatGPT conversation prose cannot trigger quota or login errors',()=>{
 const snapshot:any={text:'Write a scene about credit, quota, try again and sign in.',alerts:[]};
 assert.equal(userProblem(snapshot),null);
 assert.equal(userProblem({...snapshot,alerts:['Too many requests. Try again later.']})?.code,'PROVIDER_QUOTA_OR_ERROR');
 assert.equal(userProblem({...snapshot,alerts:['Please sign in']})?.code,'PROVIDER_LOGIN_REQUIRED');
 assert.equal(isChatConversation('https://chatgpt.com/'),false);
 assert.equal(isChatConversation('https://chatgpt.com/auth/login'),false);
 assert.equal(isChatConversation('https://chatgpt.com/c/test'),true);
});
test('Flow auto workspace is persisted before any image submission',async()=>{
 const order:string[]=[];let workspace:any;const job:any={id:'j',project_id:'p',provider:'flow',kind:'create',prompt:'scene',result_json:null};
 const store:any={workspace:()=>workspace,upsertWorkspace:(_p:any,_provider:any,u:string)=>{order.push('save');return workspace={url:u};},references:()=>[],updateJob:()=>{}};
 const browser:any={flowEnsureWorkspace:async()=>{order.push('create');return {tabId:1,url};},flowDirectStatus:async()=>({ready:true,strategy:'flow-rpc'}),trackDownload:async()=>{},flowDirectGenerate:async()=>{order.push('generate');},downloads:async()=>[{id:1,jobId:'j',state:'complete',filename:'/tmp/image.png'}]};
 await runProviderJob(store,browser,job);assert.deepEqual(order,['create','save','generate']);
});
test('ChatGPT saves only a conversation URL after submission, before reporting an error',async()=>{
 const updates:any[]=[];const saved:string[]=[];let submitted=false;
 const control:any={id:'new',tag:'BUTTON',text:'New chat',label:'New chat',disabled:false};
 const snapshot=()=>({url:submitted?'https://chatgpt.com/c/new-conversation':'https://chatgpt.com/',title:'ChatGPT',text:'credit quota',alerts:submitted?['Too many requests']:[],controls:[control,{id:'prompt',tag:'TEXTAREA',text:'',disabled:false},{id:'send',tag:'BUTTON',text:'Send prompt',label:'Send prompt',disabled:false}]});
 const store:any={workspace:()=>undefined,upsertWorkspace:(_p:any,_provider:any,u:string)=>{saved.push(u);return {url:u};},references:()=>[],updateJob:(_id:any,p:any)=>updates.push(p)};
 const browser:any={open:async()=>({tabId:1,url:'https://chatgpt.com/'}),snapshot:async()=>snapshot(),click:async(_provider:any,_tab:any,node:string)=>{if(node==='send')submitted=true;},fill:async()=>{},trackDownload:async()=>{},key:async()=>{throw new Error('ENTER_MUST_NOT_BE_USED');}};
 await assert.rejects(runProviderJob(store,browser,{id:'j',project_id:'p',provider:'chatgpt',kind:'create',prompt:'scene',result_json:null} as any),/quota|giới hạn/);
 assert.deepEqual(saved,['https://chatgpt.com/c/new-conversation']);
 assert.equal(updates.find(p=>p.status==='submitted').workspace_url,null);
 assert.ok(updates.some(p=>p.workspace_url==='https://chatgpt.com/c/new-conversation'));
});
