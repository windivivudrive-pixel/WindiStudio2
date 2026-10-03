import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdtemp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {startWorkflow} from '../src/workflow.ts';
import {approveFacebookReel,checkFacebookPage,facebookReelStatus,prepareFacebookReel,submitFacebookReel} from '../src/facebook-reels.ts';

const json=(value:unknown)=>new Response(JSON.stringify(value),{status:200,headers:{'Content-Type':'application/json'}});
async function fixture(){
  const root=await mkdtemp(path.join(tmpdir(),'windi-facebook-'));
  const tokenDir=await mkdtemp(path.join(tmpdir(),'windi-facebook-secret-'));
  const tokenFile=path.join(tokenDir,'page-token.txt');await writeFile(tokenFile,'local-test-token\n',{mode:0o600});
  const state=await startWorkflow(root,'test-project',{topic:'Test',audience:'Test',style:'Test'});
  const render=path.join(root,'windi','renders','final.mp4'),qa=path.join(root,'windi','qa','qa.json');
  await mkdir(path.dirname(render),{recursive:true});await mkdir(path.dirname(qa),{recursive:true});
  await writeFile(render,Buffer.alloc(2048,1));await writeFile(qa,JSON.stringify({passed:true,outputs:{render}}));
  state.stage='complete';state.artifacts.render=path.relative(root,render);state.artifacts.qa=path.relative(root,qa);
  await writeFile(path.join(root,'.windi','workflow.json'),JSON.stringify(state));
  return {root,render,tokenFile};
}

test('Facebook Reel approval binds QA video, Page, caption and draft/public state',async()=>{
  const {root,render}=await fixture();
  const draft=await prepareFacebookReel(root,'Caption','1234567890');
  const publicReel=await prepareFacebookReel(root,'Caption','1234567890','PUBLISHED');
  assert.equal(draft.visibility,'DRAFT');assert.notEqual(draft.approvalCode,publicReel.approvalCode);
  assert.equal((await approveFacebookReel(root,draft.approvalCode)).status,'approved');
  await writeFile(render,Buffer.alloc(2048,2));
  await assert.rejects(()=>approveFacebookReel(root,publicReel.approvalCode),/FACEBOOK_VIDEO_CHANGED/);
});

test('Page token identity is checked without returning the token',async()=>{
  const {tokenFile}=await fixture();
  const transport=(async()=>json({id:'1234567890',name:'Trang thử'})) as typeof fetch;
  const result=await checkFacebookPage(tokenFile,'1234567890','v25.0',transport);
  assert.deepEqual(result,{ready:true,pageId:'1234567890',pageName:'Trang thử',reason:'OK'});
  assert.equal(JSON.stringify(result).includes('local-test-token'),false);
});

test('Facebook draft upload follows Meta start, binary upload and finish once',async()=>{
  const {root,tokenFile}=await fixture();
  const record=await approveFacebookReel(root,(await prepareFacebookReel(root,'Caption','1234567890')).approvalCode);
  const calls:Array<{url:string;method:string;headers:Headers}>=[];
  const transport=(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=String(input),method=init?.method||'GET',headers=new Headers(init?.headers);calls.push({url,method,headers});
    if(method==='GET')return json({id:'1234567890',name:'Trang thử'});
    if(url.endsWith('/me/video_reels')&&calls.filter(call=>call.url.endsWith('/me/video_reels')).length===1)return json({video_id:'987654321',upload_url:'https://rupload.facebook.com/video-upload/v25.0/987654321'});
    if(url.startsWith('https://rupload.facebook.com/'))return json({success:true});
    return json({success:true});
  }) as typeof fetch;
  const submitted=await submitFacebookReel(root,record.approvalCode,tokenFile,'v25.0',transport);
  assert.equal(submitted.status,'draft');assert.equal(submitted.videoId,'987654321');
  assert.equal(calls.length,4);
  assert.equal(calls[1].method,'POST');assert.equal(calls[2].headers.get('file_size'),'2048');
  assert.equal(calls[2].headers.get('Content-Length'),'2048');
  assert.equal(calls[2].headers.get('Authorization'),'OAuth local-test-token');
  assert.equal(calls[3].method,'POST');
  await assert.rejects(()=>submitFacebookReel(root,record.approvalCode,tokenFile,'v25.0',transport),/FACEBOOK_REEL_NOT_APPROVED/);
});

test('published Reel is verified only after Meta returns completed status and permalink',async()=>{
  const {root,tokenFile}=await fixture();
  const record=await approveFacebookReel(root,(await prepareFacebookReel(root,'Caption','1234567890','PUBLISHED')).approvalCode);
  let starts=0;
  const transport=(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=String(input);
    if(url.includes('/me?fields='))return json({id:'1234567890',name:'Trang thử'});
    if(url.includes('/me/video_reels')&&init?.body instanceof URLSearchParams&&init.body.get('upload_phase')==='start'){starts++;return json({video_id:'987654321',upload_url:'https://rupload.facebook.com/video-upload/v25.0/987654321'});}
    if(url.startsWith('https://rupload.facebook.com/'))return json({success:true});
    if(url.includes('/me/video_reels'))return json({success:true});
    return json({id:'987654321',status:{publishing_phase:{status:'complete'}},permalink_url:'https://www.facebook.com/reel/987654321'});
  }) as typeof fetch;
  const done=await submitFacebookReel(root,record.approvalCode,tokenFile,'v25.0',transport);
  assert.equal(done.status,'verified');assert.equal(done.postUrl,'https://www.facebook.com/reel/987654321');assert.equal(starts,1);
});

test('uncertain Meta upload preserves video ID and blocks duplicate submission',async()=>{
  const {root,tokenFile}=await fixture();
  const record=await approveFacebookReel(root,(await prepareFacebookReel(root,'Caption','1234567890')).approvalCode);
  const transport=(async(input:RequestInfo|URL)=>{
    const url=String(input);
    if(url.includes('/me?fields='))return json({id:'1234567890',name:'Trang thử'});
    if(url.includes('/me/video_reels'))return json({video_id:'987654321',upload_url:'https://rupload.facebook.com/video-upload/v25.0/987654321'});
    throw new Error('network disconnected');
  }) as typeof fetch;
  await assert.rejects(()=>submitFacebookReel(root,record.approvalCode,tokenFile,'v25.0',transport),/network disconnected/);
  const status=await facebookReelStatus(root,record.approvalCode);
  assert.equal(status.status,'outcome_unknown');assert.equal(status.videoId,'987654321');
  await assert.rejects(()=>submitFacebookReel(root,record.approvalCode,tokenFile,'v25.0',transport),/FACEBOOK_REEL_NOT_APPROVED/);
  await assert.rejects(()=>prepareFacebookReel(root,'Other caption','1234567890'),/FACEBOOK_REEL_ALREADY_ATTEMPTED/);
  assert.equal(JSON.parse(await readFile(path.join(root,'.windi','facebook-reels',`${record.approvalCode}.json`),'utf8')).status,'outcome_unknown');
});
