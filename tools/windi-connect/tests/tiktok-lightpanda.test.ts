import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdtemp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {startWorkflow} from '../src/workflow.ts';
import {approveTikTokPost,prepareTikTokPost,publishTikTokPost,tikTokPostStatus} from '../src/tiktok-lightpanda.ts';

async function fixture(){
  const root=await mkdtemp(path.join(tmpdir(),'windi-tiktok-'));
  const state=await startWorkflow(root,'test-project',{topic:'Test',audience:'Test',style:'Test'});
  const render=path.join(root,'windi','renders','final.mp4');
  const qa=path.join(root,'windi','qa','qa.json');
  await mkdir(path.dirname(render),{recursive:true});
  await mkdir(path.dirname(qa),{recursive:true});
  await writeFile(render,Buffer.alloc(2048,1));
  await writeFile(qa,JSON.stringify({passed:true,outputs:{render}}));
  state.stage='complete';
  state.artifacts.render=path.relative(root,render);
  state.artifacts.qa=path.relative(root,qa);
  await writeFile(path.join(root,'.windi','workflow.json'),JSON.stringify(state));
  return {root,render,qa};
}

test('private TikTok preparation requires Windi QA for the exact render',async()=>{
  const {root,qa}=await fixture();
  const first=await prepareTikTokPost(root,'Caption approved later','@creator.test');
  assert.equal(first.status,'awaiting_approval');
  assert.equal(first.privacy,'SELF_ONLY');
  assert.equal(first.account,'creator.test');
  assert.equal((await tikTokPostStatus(root,first.approvalCode)).sha256,first.sha256);
  await writeFile(qa,JSON.stringify({passed:true,outputs:{render:path.join(root,'other.mp4')}}));
  await assert.rejects(()=>prepareTikTokPost(root,'New caption','creator.test'),/VIDEO_QA_REQUIRED/);
});

test('approval is bound to video bytes, caption, account, and privacy',async()=>{
  const {root,render}=await fixture();
  const first=await prepareTikTokPost(root,'Caption A','creator');
  const second=await prepareTikTokPost(root,'Caption B','creator');
  assert.notEqual(first.approvalCode,second.approvalCode);
  await assert.rejects(()=>approveTikTokPost(root,'0000000000000000'),/PROJECT_FILE_NOT_FOUND/);
  await writeFile(render,Buffer.alloc(2048,2));
  await assert.rejects(()=>approveTikTokPost(root,first.approvalCode),/TIKTOK_VIDEO_CHANGED/);
  const third=await prepareTikTokPost(root,'Caption A','creator');
  assert.notEqual(first.approvalCode,third.approvalCode);
  const approved=await approveTikTokPost(root,third.approvalCode);
  assert.equal(approved.status,'approved');
  assert.ok(approved.approvedAt);
  assert.equal(JSON.parse(await readFile(path.join(root,'.windi','tiktok-posts',`${third.approvalCode}.json`),'utf8')).status,'approved');
});

test('publishing refuses an unapproved video before starting Lightpanda',async()=>{
  const {root}=await fixture();
  const record=await prepareTikTokPost(root,'Caption','creator');
  const cookieFile=path.join(root,'cookies.json');
  await writeFile(cookieFile,'[{"domain":".tiktok.com","name":"test","value":"test"}]',{mode:0o600});
  await assert.rejects(()=>publishTikTokPost(root,record.approvalCode,cookieFile),/TIKTOK_POST_NOT_APPROVED/);
  assert.equal((await tikTokPostStatus(root,record.approvalCode)).status,'awaiting_approval');
});

test('uncertain submission blocks retry and a second caption for the same MP4',async()=>{
  const {root}=await fixture();
  const record=await prepareTikTokPost(root,'Caption','creator');
  const file=path.join(root,'.windi','tiktok-posts',`${record.approvalCode}.json`);
  await writeFile(file,JSON.stringify({...record,status:'outcome_unknown',attemptedAt:new Date().toISOString()}));
  const cookieFile=path.join(root,'cookies.json');
  await writeFile(cookieFile,'[{"domain":".tiktok.com","name":"test","value":"test"}]',{mode:0o600});
  await assert.rejects(()=>publishTikTokPost(root,record.approvalCode,cookieFile),/TIKTOK_POST_NOT_APPROVED/);
  await assert.rejects(()=>prepareTikTokPost(root,'Another caption','creator'),/TIKTOK_VIDEO_ALREADY_ATTEMPTED/);
});
