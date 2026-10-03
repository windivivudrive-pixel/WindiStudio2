import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {startWorkflow} from '../src/workflow.ts';
import {approvePostizPost,inspectPostizPost,listPostizChannels,postizPostStatus,preparePostizPost,submitPostizPost} from '../src/postiz-publish.ts';

const base='http://127.0.0.1:5000/api/public/v1';
const json=(value:unknown)=>new Response(JSON.stringify(value),{status:200,headers:{'Content-Type':'application/json'}});
async function fixture(){
  const root=await mkdtemp(path.join(tmpdir(),'windi-postiz-')),secret=await mkdtemp(path.join(tmpdir(),'windi-postiz-key-'));
  const keyFile=path.join(secret,'key');await writeFile(keyFile,'test-key\n',{mode:0o600});
  const state=await startWorkflow(root,'test-project',{topic:'Test',audience:'Test',style:'Test'});
  const render=path.join(root,'windi','renders','final.mp4'),qa=path.join(root,'windi','qa','qa.json');
  await mkdir(path.dirname(render),{recursive:true});await mkdir(path.dirname(qa),{recursive:true});
  await writeFile(render,Buffer.alloc(2048,1));await writeFile(qa,JSON.stringify({passed:true,outputs:{render}}));
  state.stage='complete';state.artifacts.render=path.relative(root,render);state.artifacts.qa=path.relative(root,qa);await writeFile(path.join(root,'.windi','workflow.json'),JSON.stringify(state));
  return {root,keyFile,render};
}
const integrations=[{id:'tiktok-1',name:'@creator',providerIdentifier:'tiktok',disabled:false},{id:'facebook-1',name:'Windi Page',providerIdentifier:'facebook',disabled:false}];

test('Postiz approval binds QA MP4, caption, channel and visibility',async()=>{
  const {root,keyFile,render}=await fixture();
  const transport=(async()=>json(integrations)) as typeof fetch;
  const channels=await listPostizChannels(base,keyFile,transport);assert.equal(channels.length,2);
  const privatePost=await preparePostizPost(root,'Caption','tiktok-1',base,keyFile,undefined,transport);
  const publicPost=await preparePostizPost(root,'Caption','tiktok-1',base,keyFile,'PUBLIC_TO_EVERYONE',transport);
  assert.equal(privatePost.visibility,'SELF_ONLY');assert.notEqual(privatePost.approvalCode,publicPost.approvalCode);
  assert.equal((await approvePostizPost(root,privatePost.approvalCode)).status,'approved');
  await writeFile(render,Buffer.alloc(2048,2));
  await assert.rejects(()=>approvePostizPost(root,publicPost.approvalCode),/POSTIZ_VIDEO_CHANGED/);
});

test('Postiz submits approved TikTok video once with DIRECT_POST and private visibility',async()=>{
  const {root,keyFile}=await fixture();let submits=0;let payload:any;
  const transport=(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=String(input);assert.equal(new Headers(init?.headers).get('Authorization'),'test-key');
    if(url.endsWith('/integrations'))return json(integrations);
    if(url.includes('/integration-settings/'))return json({output:{rules:'Video posting rules',maxLength:2200,settings:{}}});
    if(url.endsWith('/upload')){assert.ok(init?.body instanceof FormData);return json({id:'media-1',path:'https://media.example.com/uploads/video.mp4'});}
    if(url.endsWith('/posts')){submits++;payload=JSON.parse(String(init?.body));return json([{postId:'post-1'}]);}
    if(url.includes('/posts?'))return json({posts:[{id:'post-1',state:'PUBLISHED',releaseURL:'https://www.tiktok.com/@creator/video/123'}]});
    throw new Error('Unexpected URL');
  }) as typeof fetch;
  const prepared=await preparePostizPost(root,'Test caption','tiktok-1',base,keyFile,undefined,transport);
  await assert.rejects(()=>submitPostizPost(root,prepared.approvalCode,keyFile,transport),/POSTIZ_NOT_APPROVED/);
  await approvePostizPost(root,prepared.approvalCode);
  const result=await submitPostizPost(root,prepared.approvalCode,keyFile,transport);
  assert.equal(result.status,'submitted');assert.deepEqual(result.postIds,['post-1']);assert.equal(submits,1);
  assert.equal(payload.posts[0].settings.content_posting_method,'DIRECT_POST');assert.equal(payload.posts[0].settings.privacy_level,'SELF_ONLY');
  assert.equal(payload.posts[0].value[0].image[0].path,'https://media.example.com/uploads/video.mp4');
  const inspected=await inspectPostizPost(root,prepared.approvalCode,keyFile,transport);assert.equal(inspected.remotePosts[0].state,'PUBLISHED');assert.equal(inspected.remotePosts[0].releaseURL,'https://www.tiktok.com/@creator/video/123');
  await assert.rejects(()=>submitPostizPost(root,prepared.approvalCode,keyFile,transport),/POSTIZ_NOT_APPROVED/);
});

test('Postiz uncertain create response blocks duplicate upload and post',async()=>{
  const {root,keyFile}=await fixture();let posts=0;
  const transport=(async(input:RequestInfo|URL)=>{
    const url=String(input);if(url.endsWith('/integrations'))return json(integrations);
    if(url.includes('/integration-settings/'))return json({output:{rules:'',maxLength:2200}});
    if(url.endsWith('/upload'))return json({id:'media-1',path:'https://media.example.com/uploads/video.mp4'});
    if(url.endsWith('/posts')){posts++;throw new Error('connection dropped');}
    throw new Error('Unexpected URL');
  }) as typeof fetch;
  const prepared=await preparePostizPost(root,'Caption','facebook-1',base,keyFile,undefined,transport);assert.equal(prepared.visibility,'PUBLIC');
  await approvePostizPost(root,prepared.approvalCode);
  await assert.rejects(()=>submitPostizPost(root,prepared.approvalCode,keyFile,transport),/connection dropped/);
  assert.equal((await postizPostStatus(root,prepared.approvalCode)).status,'outcome_unknown');
  await assert.rejects(()=>submitPostizPost(root,prepared.approvalCode,keyFile,transport),/POSTIZ_NOT_APPROVED/);
  await assert.rejects(()=>preparePostizPost(root,'Other caption','facebook-1',base,keyFile,undefined,transport),/POSTIZ_VIDEO_ALREADY_ATTEMPTED/);
  assert.equal(posts,1);
});

test('Postiz refuses media URL that TikTok cannot fetch',async()=>{
  const {root,keyFile}=await fixture();let posts=0;
  const transport=(async(input:RequestInfo|URL)=>{
    const url=String(input);if(url.endsWith('/integrations'))return json(integrations);
    if(url.includes('/integration-settings/'))return json({output:{rules:'',maxLength:2200}});
    if(url.endsWith('/upload'))return json({id:'media-1',path:'http://127.0.0.1:5000/uploads/video.mp4'});
    if(url.endsWith('/posts')){posts++;return json([{id:'unexpected'}]);}
    throw new Error('Unexpected URL');
  }) as typeof fetch;
  const prepared=await preparePostizPost(root,'Caption','tiktok-1',base,keyFile,undefined,transport);
  await approvePostizPost(root,prepared.approvalCode);
  await assert.rejects(()=>submitPostizPost(root,prepared.approvalCode,keyFile,transport),/POSTIZ_UPLOAD_PUBLIC_HTTPS_REQUIRED/);
  assert.equal(posts,0);assert.equal((await postizPostStatus(root,prepared.approvalCode)).status,'action_required');
});
