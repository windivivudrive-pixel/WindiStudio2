import {test} from 'node:test';
import assert from 'node:assert/strict';
import {grokWebOptions,referenceWebPrompt} from '../src/grok/options.ts';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('Web ref limits and aliases reflect ordered image attachments, with video refs supported by the Imagine composer',()=>{
  assert.equal(grokWebOptions({},8,false).model,'grok-imagine-image-edit');
  assert.throws(()=>grokWebOptions({},8,true),/TOO_MANY/);
  assert.equal(grokWebOptions({media:'video'},1,false).media,'video');
  assert.equal(grokWebOptions({media:'video'},0,true).media,'video');
  assert.throws(()=>grokWebOptions({media:'video'},3,false),/TOO_MANY/);
  assert.throws(()=>referenceWebPrompt('@image 3',2),/REFERENCE_NOT_FOUND/);
  assert.equal(grokWebOptions({media:'video'},1,false).aspect,'auto');
  assert.throws(()=>grokWebOptions({media:'video',aspect:'9:16'},1,false),/SINGLE_REF_USES_SOURCE_ASPECT/);
  assert.throws(()=>grokWebOptions({media:'video',duration:7},2,false),/INVALID_DURATION/);
  assert.throws(()=>grokWebOptions({resolution:'2k'},0,false),/RESOLUTION_UNSUPPORTED/);
  assert.throws(()=>referenceWebPrompt('@image3',2),/REFERENCE_NOT_FOUND/);
  assert.match(referenceWebPrompt('Use @image2 with @image1',2),/Use reference image 2 with reference image 1/);
});
test('Web upload binds bytes and ordered metadata IDs, rejects mismatched hashes',async()=>{
  const source=await readFile(new URL('../extension/grok-web-page.js',import.meta.url),'utf8');
  let sent:any;
  const scope:any={window:{},location:{origin:'https://grok.com'},crypto,atob,Blob,FormData,URL,Uint8Array,AbortSignal,fetch:async(_url:string,init:any)=>{sent=init.body;return Response.json({fileMetadata:{fileMetadataId:'asset-one'}});}};
  vm.runInNewContext(source.replace('export async function','async function'),scope);
  const bytes=Buffer.alloc(80,42),sha256=Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');
  await scope.grokWebPage('uploadBegin',{key:'one',sha256,size:80,mime:'image/png',name:'ref.png'});
  await scope.grokWebPage('uploadChunk',{key:'one',index:0,data:bytes.toString('base64')});
  const uploaded=await scope.grokWebPage('uploadFinish',{key:'one'});assert.equal(uploaded.assetId,'asset-one');assert.equal(uploaded.sha256,sha256);
  assert.equal(sent.get('file_source'),'IMAGINE_SELF_UPLOAD_FILE_SOURCE');assert.deepEqual(Buffer.from(await sent.get('file').arrayBuffer()),bytes);
  await scope.grokWebPage('uploadBegin',{key:'two',sha256:'a'.repeat(64),size:80,mime:'image/png',name:'ref.png'});
  await scope.grokWebPage('uploadChunk',{key:'two',index:0,data:bytes.toString('base64')});
  await assert.rejects(()=>scope.grokWebPage('uploadFinish',{key:'two'}),/HASH_MISMATCH/);
});
test('Web classifies a generic 403 image-edit rejection without telling the user to solve an invisible challenge',async()=>{
  const source=await readFile(new URL('../extension/grok-web-page.js',import.meta.url),'utf8');
  const scope:any={window:{},location:{origin:'https://grok.com'},crypto,atob,Blob,FormData,URL,Uint8Array,AbortSignal,fetch:async()=>new Response('{"error":"forbidden"}',{status:403})};
  vm.runInNewContext(source.replace('export async function','async function'),scope);
  await assert.rejects(()=>scope.grokWebPage('status'),/GROK_WEB_EDIT_BLOCKED/);
});
test('Web collector waits for final and completed and does not deliver a preview',async()=>{
  const source=await readFile(new URL('../extension/grok-web-page.js',import.meta.url),'utf8');let socket:any;const sent:any[]=[];
  class WS{constructor(){socket=this;}send(text:string){sent.push(JSON.parse(text));}close(){}}
  const scope:any={window:{},location:{origin:'https://grok.com'},URL,WebSocket:WS,setTimeout:()=>1,clearTimeout(){},AbortSignal};
  vm.runInNewContext(source.replace('export async function','async function'),scope);
  await scope.grokWebPage('start',{jobId:'job',media:'image',prompt:'fox',aspect:'9:16'});socket.onopen();assert.equal(sent[1].item.content[0].text,'fox');
  socket.onmessage({data:JSON.stringify({type:'image',image_id:'img',url:'https://imgen.x.ai/preview.jpg',percentage_complete:10})});
  assert.equal((await scope.grokWebPage('poll',{jobId:'job'})).state,'generating');
  socket.onmessage({data:JSON.stringify({type:'image',image_id:'img',url:'https://imgen.x.ai/final.jpg',percentage_complete:100})});
  assert.equal((await scope.grokWebPage('poll',{jobId:'job'})).state,'generating');
  socket.onmessage({data:JSON.stringify({type:'json',image_id:'img',current_status:'completed'})});
  assert.equal((await scope.grokWebPage('poll',{jobId:'job'})).url,'https://imgen.x.ai/final.jpg');
});

test('Web video collector accepts adjacent JSON values and resolves a relative final URL',async()=>{
  const source=await readFile(new URL('../extension/grok-web-page.js',import.meta.url),'utf8');
  const payload='{"result":{"conversation":{"conversationId":"conv-1"}}}{"result":{"response":{"streamingVideoGenerationResponse":{"progress":100,"videoUrl":"users/me/generated_video.mp4"}}}}';
  const scope:any={window:{},location:{origin:'https://grok.com'},crypto,atob,Blob,FormData,URL,Uint8Array,AbortSignal,TextDecoder,fetch:async()=>new Response(payload),setTimeout,clearTimeout};
  vm.runInNewContext(source.replace('export async function','async function'),scope);
  await scope.grokWebPage('start',{jobId:'video',media:'video',prompt:'clip',aspect:'9:16',duration:6,resolution:'720p'});
  for(let attempt=0;attempt<20;attempt++){const state=await scope.grokWebPage('poll',{jobId:'video'});if(state.state==='complete'){assert.equal(state.conversationId,'conv-1');assert.equal(state.url,'https://assets.grok.com/users/me/generated_video.mp4');return;}await new Promise(resolve=>setTimeout(resolve,5));}
  assert.fail('video did not reach its final media event');
});

test('Web runner preserves ref order, waits for the attributed download, and publishes it once',async context=>{
  const {mkdtemp,mkdir,writeFile,rm,realpath}=await import('node:fs/promises');
  const {tmpdir}=await import('node:os');const path=await import('node:path');const sharp=(await import('sharp')).default;
  const {openStore}=await import('../src/store.ts');const {registerProject}=await import('../src/project.ts');
  const {createGrokJob,resumeGrokJob}=await import('../src/grok/jobs.ts');const {GrokWebMedia}=await import('../src/grok/web.ts');
  const root=await realpath(await mkdtemp(path.join(tmpdir(),'windi-web-test-')));context.after(()=>rm(root,{recursive:true,force:true}));
  const project=path.join(root,'project');await mkdir(project);const store=await openStore(path.join(root,'state.sqlite'));context.after(()=>store.close());await registerProject(store,project);
  const red=await sharp({create:{width:64,height:64,channels:3,background:'red'}}).png().toBuffer();
  const blue=await sharp({create:{width:64,height:64,channels:3,background:'blue'}}).png().toBuffer();
  await writeFile(path.join(project,'red.png'),red);await writeFile(path.join(project,'blue.png'),blue);
  const job=(await createGrokJob(store,{project,references:['red.png','blue.png'],prompt:'Place @image2 left of @image1',output:'assets/result'})).job;
  await mkdir(path.join(root,'Windi','grok'),{recursive:true});const downloaded=path.join(root,'Windi','grok',job.id+'.image');await writeFile(downloaded,blue);let starts=0,uploads=0,meta:any,downloadChecks=0;
  const runner=new GrokWebMedia(store,path.join(root,'stage'),async(op,args)=>{
    if(op==='web.status')return {authenticated:true};
    if(op==='uploadBegin'){meta=args;return {};}
    if(op==='uploadChunk')return {};
    if(op==='uploadFinish')return {assetId:`asset-${++uploads}`,sha256:meta.sha256};
    if(op==='start'){starts++;assert.deepEqual(args.assets,['asset-1','asset-2']);assert.match(args.prompt,/reference image 2 left of reference image 1/);return {started:true};}
    if(op==='poll')return {state:'complete'};
    if(op==='download')return {downloadId:42};
    if(op==='downloadStatus')return {jobId:job.id,downloadId:42,path:downloaded,bytes:blue.length,state:++downloadChecks===1?'in_progress':'complete'};
    if(op==='originalPrepare')return {size:blue.length,sha256:Buffer.from(await crypto.subtle.digest('SHA-256',blue)).toString('hex')};
    if(op==='originalChunk')return {data:blue.subarray(args.offset,args.offset+131072).toString('base64')};
    throw new Error('Unexpected operation');
  },()=>{});
  await runner.run(job);assert.equal(store.job(job.id)?.status,'complete');assert.equal(starts,1);assert.equal(uploads,2);assert.equal(downloadChecks,2);
  assert.deepEqual(await readFile(JSON.parse(store.job(job.id)!.result_json!).path),blue);
  store.updateJob(job.id,{status:'failed'});await runner.run(resumeGrokJob(store,store.job(job.id)!));assert.equal(starts,1);assert.equal(store.latestAssets('grok').length,1);
});
