import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,cp,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {openStore} from '../src/store.ts';
import {registerProject,loadedProject} from '../src/project.ts';
import {publishOriginal,inspectImage} from '../src/assets.ts';

test('projects stay isolated after a folder copy and request keys are idempotent',async()=>{
  const home=await mkdtemp(path.join(tmpdir(),'windi-store-'));const projectRoot=path.join(home,'project');await mkdir(projectRoot);
  const store=await openStore(path.join(home,'state.sqlite'));const first=await registerProject(store,projectRoot);assert.ok(first.project);
  await mkdir(path.join(projectRoot,'prompts'));await writeFile(path.join(projectRoot,'prompts','one.txt'),'Một cảnh an toàn');
  const one=store.insertJob({projectId:first.project!.id,provider:'flow',kind:'create',requestKey:'scene-one',fingerprint:'same',prompt:'Một cảnh an toàn',references:[],outputPath:'assets/windi/one.png'});const reused=store.insertJob({projectId:first.project!.id,provider:'flow',kind:'create',requestKey:'scene-one',fingerprint:'same',prompt:'Một cảnh an toàn',references:[],outputPath:'assets/windi/one.png'});
  assert.equal(reused.reused,true);assert.equal(reused.job.id,one.job.id);assert.throws(()=>store.insertJob({projectId:first.project!.id,provider:'flow',kind:'create',requestKey:'scene-one',fingerprint:'different',prompt:'Khác',references:[],outputPath:'assets/windi/one.png'}),/REQUEST_KEY_CONTENT_MISMATCH/);
  const copyRoot=path.join(home,'copy');await cp(projectRoot,copyRoot,{recursive:true});const conflict=await registerProject(store,copyRoot);assert.ok(conflict.conflict);const fork=await registerProject(store,copyRoot,'fork');assert.ok(fork.project);assert.notEqual(fork.project!.id,first.project!.id);assert.equal((await loadedProject(store,copyRoot)).project.id,fork.project!.id);
  store.close();
});

test('scheduler alternates projects and a valid original is staged then published without overwrite',async()=>{
  const home=await mkdtemp(path.join(tmpdir(),'windi-assets-'));const firstRoot=path.join(home,'a'),secondRoot=path.join(home,'b');await mkdir(firstRoot);await mkdir(secondRoot);
  const store=await openStore(path.join(home,'state.sqlite'));const a=store.createProject('a',firstRoot,'assets/windi'),b=store.createProject('b',secondRoot,'assets/windi');
  const first=store.insertJob({projectId:a.id,provider:'flow',kind:'create',fingerprint:'a',prompt:'a',references:[],outputPath:'assets/windi/scene.png'}).job;store.insertJob({projectId:b.id,provider:'flow',kind:'create',fingerprint:'b',prompt:'b',references:[],outputPath:'assets/windi/scene.png'});
  assert.equal(store.nextQueued('flow',a.id)?.project_id,b.id);
  const source=path.join(home,'download.png');const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAF/gL+Qx+T7wAAAABJRU5ErkJggg==','base64');await writeFile(source,png);assert.deepEqual(inspectImage(png),{mime:'image/png',width:1,height:1,extension:'.png'});
  const stage=path.join(home,'stage');const published=await publishOriginal(first,firstRoot,source,stage);assert.match(published.path,/assets\/windi\/scene\.png$/);assert.deepEqual(await readFile(published.path),png);
  const next=await publishOriginal(first,firstRoot,source,stage);assert.match(next.path,/scene-v02\.png$/);store.close();
});

test('unknown results require an explicit no-result reconciliation before retry',async()=>{
  const home=await mkdtemp(path.join(tmpdir(),'windi-reconcile-'));const root=path.join(home,'project');await mkdir(root);
  const store=await openStore(path.join(home,'state.sqlite'));const project=store.createProject('project',root,'assets/windi');const job=store.insertJob({projectId:project.id,provider:'flow',kind:'create',fingerprint:'reconcile',prompt:'test',references:[],outputPath:'assets/windi/test.png'}).job;
  store.updateJob(job.id,{status:'unknown_result',error_code:'RESULT_NEEDS_RECONCILIATION'});
  assert.equal(store.resumeJob(job.id).status,'needs_user_action');
  assert.equal(store.retryAfterNoResult(job.id).status,'queued');
  assert.throws(()=>store.retryAfterNoResult(job.id),/JOB_NOT_AWAITING_RECONCILIATION/);store.close();
});

test('a reconciled existing result queues download recovery without resubmitting',async()=>{
  const home=await mkdtemp(path.join(tmpdir(),'windi-found-result-'));const root=path.join(home,'project');await mkdir(root);
  const store=await openStore(path.join(home,'state.sqlite'));const project=store.createProject('project',root,'assets/windi');const job=store.insertJob({projectId:project.id,provider:'flow',kind:'create',fingerprint:'found',prompt:'test',references:[],outputPath:'assets/windi/test.png'}).job;
  store.updateJob(job.id,{status:'needs_user_action',error_code:'RESULT_NEEDS_RECONCILIATION'});let recovered=store.recoverAfterFoundResult(job.id);assert.equal(recovered.status,'queued');assert.deepEqual(JSON.parse(recovered.result_json||'null'),{reconcileExisting:true});
  store.updateJob(job.id,{status:'failed',error_code:'PAGE_READ_FAILED'});recovered=store.recoverAfterFoundResult(job.id);assert.equal(recovered.status,'queued');assert.deepEqual(JSON.parse(recovered.result_json||'null'),{reconcileExisting:true});
  store.updateJob(job.id,{status:'needs_user_action',error_code:'DOWNLOAD_RESULT_UNCLEAR'});recovered=store.recoverAfterFoundResult(job.id);assert.equal(recovered.status,'queued');store.close();
});

test('an explicitly confirmed submitted failure can recover its visible result without resubmitting',async()=>{
  const home=await mkdtemp(path.join(tmpdir(),'windi-confirmed-result-'));const root=path.join(home,'project');await mkdir(root);
  const store=await openStore(path.join(home,'state.sqlite'));const project=store.createProject('project',root,'assets/windi');const job=store.insertJob({projectId:project.id,provider:'flow',kind:'create',fingerprint:'submitted-result',prompt:'test',references:[],outputPath:'assets/windi/test.png'}).job;
  store.updateJob(job.id,{status:'failed',submitted_at:new Date().toISOString(),error_code:'No tab with id: 1.'});
  const recovered=store.recoverAfterFoundResult(job.id);assert.equal(recovered.status,'queued');assert.deepEqual(JSON.parse(recovered.result_json||'null'),{reconcileExisting:true});store.close();
});

test('only a cancelled job that was submitted can recover an existing result',async()=>{
  const home=await mkdtemp(path.join(tmpdir(),'windi-cancelled-result-'));const root=path.join(home,'project');await mkdir(root);
  const store=await openStore(path.join(home,'state.sqlite'));const project=store.createProject('project',root,'assets/windi');const submitted=store.insertJob({projectId:project.id,provider:'flow',kind:'create',fingerprint:'submitted',prompt:'submitted',references:[],outputPath:'assets/windi/submitted.png'}).job;
  store.updateJob(submitted.id,{status:'submitted',submitted_at:new Date().toISOString()});store.cancelJob(submitted.id);const recovered=store.recoverAfterFoundResult(submitted.id);assert.equal(recovered.status,'queued');assert.deepEqual(JSON.parse(recovered.result_json||'null'),{reconcileExisting:true});
  const neverSent=store.insertJob({projectId:project.id,provider:'flow',kind:'create',fingerprint:'never-sent',prompt:'never-sent',references:[],outputPath:'assets/windi/never-sent.png'}).job;store.cancelJob(neverSent.id);assert.throws(()=>store.recoverAfterFoundResult(neverSent.id),/JOB_NOT_AWAITING_RECONCILIATION/);store.close();
});

test('a cancelled job that was never submitted can resume without reconciliation',async()=>{
  const home=await mkdtemp(path.join(tmpdir(),'windi-resume-unsent-'));const root=path.join(home,'project');await mkdir(root);
  const store=await openStore(path.join(home,'state.sqlite'));const project=store.createProject('project',root,'assets/windi');const job=store.insertJob({projectId:project.id,provider:'flow',kind:'create',fingerprint:'unsent',prompt:'unsent',references:[],outputPath:'assets/windi/unsent.png'}).job;
  store.cancelJob(job.id);assert.equal(store.resumeJob(job.id).status,'queued');store.close();
});

test('duplicate assets are detected only inside the same project and provider',async()=>{
  const home=await mkdtemp(path.join(tmpdir(),'windi-duplicate-'));const root=path.join(home,'project');await mkdir(root);
  const store=await openStore(path.join(home,'state.sqlite'));const project=store.createProject('project',root,'assets/windi');const first=store.insertJob({projectId:project.id,provider:'flow',kind:'create',fingerprint:'first',prompt:'first',references:[],outputPath:'assets/windi/first.png'}).job;const second=store.insertJob({projectId:project.id,provider:'flow',kind:'create',fingerprint:'second',prompt:'second',references:[],outputPath:'assets/windi/second.png'}).job;
  store.addAsset({job:first,path:path.join(root,'first.png'),mime:'image/png',width:1,height:1,sha256:'same-hash'});assert.equal(store.duplicateAsset(project.id,'flow','same-hash',second.id)?.job_id,first.id);assert.equal(store.duplicateAsset(project.id,'chatgpt','same-hash',second.id),undefined);store.close();
});

test('a verified manual recovery can replace one job asset without creating a duplicate row',async()=>{
  const home=await mkdtemp(path.join(tmpdir(),'windi-asset-replace-'));const root=path.join(home,'project');await mkdir(root);
  const store=await openStore(path.join(home,'state.sqlite'));const project=store.createProject('project',root,'assets/windi');const job=store.insertJob({projectId:project.id,provider:'flow',kind:'create',fingerprint:'replace',prompt:'replace',references:[],outputPath:'assets/windi/scene'}).job;
  const first=store.setAsset({job,path:path.join(root,'scene.jpg'),mime:'image/jpeg',width:768,height:1376,sha256:'old'});const second=store.setAsset({job,path:path.join(root,'scene.jpg'),mime:'image/jpeg',width:768,height:1376,sha256:'new'});
  assert.equal(second.id,first.id);assert.equal(store.assetForJob(job.id)?.sha256,'new');assert.equal((store.db.prepare('SELECT COUNT(*) AS count FROM assets WHERE job_id=?').get(job.id) as {count:number}).count,1);store.close();
});
