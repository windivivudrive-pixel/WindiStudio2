import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const url='https://grok.com/imagine/post/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa?conversation=bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
async function fixture(){
  const source=await readFile(new URL('../extension/grok-ui-page.js',import.meta.url),'utf8');
  const storage=new Map<string,string>();let clicks=0;
  const video=(src:string,width=300,height=533)=>({currentSrc:src,src,readyState:4,videoWidth:720,videoHeight:1280,duration:6.04,getClientRects:()=>[{}],getBoundingClientRect:()=>({width,height,left:200,right:200+width,top:100,bottom:100+height})});
  const main=video('https://assets.grok.com/generated/final.mp4');
  const download={textContent:'Download',disabled:false,getAttribute:()=>null,getClientRects:()=>[{}],click(){clicks++;}};
  const doc:any={body:{innerText:''},querySelectorAll:(s:string)=>s==='video'?[video('https://assets.grok.com/old-1.mp4',80,80),main,video('https://assets.grok.com/old-2.mp4',80,80)]:[download]};
  const scope:any={location:{origin:'https://grok.com',href:url,pathname:new URL(url).pathname},sessionStorage:{getItem:(k:string)=>storage.get(k),setItem:(k:string,v:string)=>storage.set(k,v)},document:doc,innerWidth:1200,innerHeight:800,getComputedStyle:()=>({visibility:'visible'}),URL,Date,setTimeout};
  vm.runInNewContext(source.replace('export async function','async function'),scope);
  return {scope,doc,main,download,storage,clicks:()=>clicks};
}
test('UI collector excludes library thumbnails and persists the exact post across page reload',async()=>{
  const f=await fixture();const args={jobId:'job',record:{state:'generating',startedAt:Date.now(),postUrl:url}};
  const result=await f.scope.grokUIPage('poll',args);
  assert.equal(result.state,'complete');assert.equal(result.url,f.main.src);assert.equal(result.conversationId,'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
  f.doc.querySelectorAll=()=>[];
  const restored=await f.scope.grokUIPage('poll',{jobId:'job'});assert.equal(restored.url,result.url);
  assert.equal((await f.scope.grokUIPage('start',{jobId:'job'})).reused,true);assert.equal(f.clicks(),0);
});
test('UI collector never substitutes a different post and waits while generation is visible',async()=>{
  const f=await fixture();const record={state:'generating',postUrl:url};
  f.scope.location.href=url.replace('bbbbbbbb','dddddddd');
  assert.equal((await f.scope.grokUIPage('poll',{jobId:'job',record})).state,'missing');
  f.scope.location.href=url;f.doc.body.innerText='Generating 99 %';
  assert.equal((await f.scope.grokUIPage('poll',{jobId:'job',record})).state,'generating');
  f.doc.body.innerText='';f.download.disabled=true;
  assert.equal((await f.scope.grokUIPage('poll',{jobId:'job',record})).state,'generating');
});
test('UI collector does not guess between two large players',async()=>{
  const f=await fixture();const original=f.doc.querySelectorAll;
  f.doc.querySelectorAll=(s:string)=>s==='video'?[f.main,{...f.main,currentSrc:'https://assets.grok.com/other.mp4'}]:original(s);
  assert.equal((await f.scope.grokUIPage('poll',{jobId:'job',record:{state:'generating',postUrl:url}})).state,'generating');
});


test('Grok may replace a placeholder post while retaining the submitted conversation',async()=>{
  const f=await fixture();const final=url.replace('aaaaaaaa','eeeeeeee');f.scope.location.href=final;
  const result=await f.scope.grokUIPage('poll',{jobId:'job',record:{state:'generating',postUrl:url}});
  assert.equal(result.state,'complete');assert.equal(result.postUrl,final);
  assert.equal(result.conversationId,new URL(url).searchParams.get('conversation'));
});
