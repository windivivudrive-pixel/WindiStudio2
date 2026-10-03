import test from 'node:test';
import assert from 'node:assert/strict';
import {flowImageOptions,flowVariantCount,assertFlowImageAspect} from '../src/flow-options.ts';
// @ts-ignore Shared extension module.
import {flowUiSubmit,flowUiResult} from '../extension/flow-ui.js';
// @ts-ignore Shared extension module.
import {flowPageRpc,buildFlowUploadRequest,flowUploadedMedia} from '../extension/flow-rpc.js';

test('explicit Flow options override prose and validate before quota is spent',()=>{
 assert.deepEqual(flowImageOptions({aspect:'4:3',model:'PRO',seed:'0'},'Use 9:16 as a reference'),{aspect:'4x3',model:'GEM_PIX_2',seed:0});
 assert.equal(flowImageOptions({model:'lite'},'cat').model,'HARBOR_SEAL');
 assert.equal(flowImageOptions({},'ratio 3:4').aspect,'3x4');
 for(const invalid of [{aspect:'21:9'},{model:'unknown'},{seed:-1},{seed:2.5},{seed:''}]){
  assert.throws(()=>flowImageOptions(invalid,'cat'));
 }
 for(const n of [0,5,2.5,'abc'])assert.throws(()=>flowVariantCount(n));
 assert.equal(flowVariantCount('4'),4);
});
test('actual image dimensions tolerate Flow native ratios and reject the wrong orientation',()=>{
 for(const [aspect,w,h] of [['portrait',768,1376],['landscape',1376,768],['square',1024,1024],['3x4',896,1200],['4x3',1200,896]] as const)assert.doesNotThrow(()=>assertFlowImageAspect(aspect,w,h));
 assert.throws(()=>assertFlowImageAspect('portrait',1376,768),/ASPECT_MISMATCH/);
 assert.throws(()=>assertFlowImageAspect('square',896,1200),/ASPECT_MISMATCH/);
});
test('completed attributed download survives a worker restart without another download click',async()=>{
 const saved={prompt:'exact cat',workspaceUrl:'https://flow.google.com/project/p',downloadId:12};let evaluations=0,remembered=0;
 const result=await flowUiResult({tabId:1,jobId:'job-1',prompt:'exact cat\n',storage:{get:async()=>({'flowUiJob:job-1':saved})},evaluate:async()=>{evaluations++;return saved.workspaceUrl;},downloads:{search:async()=>[{id:12,state:'complete'}]},remember:async(id:number)=>{remembered=id;}});
 assert.equal(result.downloadId,12);assert.equal(evaluations,1);assert.equal(remembered,12);
});
test('durable submission marker prevents sending the same job after worker restart',async()=>{
 let evaluated=false,clicked=false;
 await assert.rejects(flowUiSubmit({tabId:1,jobId:'job-1',prompt:'cat',aspect:'square',storage:{get:async()=>({'flowUiJob:job-1':{phase:'submitting'}})},evaluate:async()=>{evaluated=true;},click:async()=>{clicked=true;}}),/RESULT_UNKNOWN/);
 assert.equal(evaluated,false);assert.equal(clicked,false);
});
test('wrong selected asset cannot reach download controls during recovery',async()=>{
 const saved={prompt:'exact cat',workspaceUrl:'https://flow.google.com/project/p',beforeTiles:0};let calls=0,downloaded=false;
 const result=await flowUiResult({tabId:1,jobId:'job-1',prompt:saved.prompt,beforeTiles:0,storage:{get:async()=>({'flowUiJob:job-1':saved})},evaluate:async()=>++calls===1?saved.workspaceUrl+'/edit/other':{phase:'wrong-asset'},downloads:{search:async()=>{downloaded=true;return [];}}});
 assert.equal(result.phase,'wrong-asset');assert.equal(downloaded,false);
});
test('RPC uses the page session and never returns its CSRF/session tokens',async()=>{
 const globals=globalThis as any;const prior={location:globals.location,WIZ:globals.WIZ_global_data,fetch:globals.fetch};
 let target='',body='';globals.location={origin:'https://flow.google.com',pathname:'/project/test'};globals.WIZ_global_data={SNlM0e:'test-csrf',FdrFJe:'test-sid'};
 globals.fetch=async(url:string,args:any)=>{target=url;body=args.body.toString();return {status:200,text:async()=> 'result'};};
 try{
  assert.deepEqual(await flowPageRpc({rpcId:'ogiZ0b',request:[]}),{status:200,text:'result'});
  assert.equal(new URL(target,'https://flow.google.com').searchParams.get('f.sid'),'test-sid');
  assert.equal(new URLSearchParams(body).get('at'),'test-csrf');
 }finally{globals.location=prior.location;globals.WIZ_global_data=prior.WIZ;globals.fetch=prior.fetch;}
});
test('current reference reply uses media id rather than content id',()=>{
 assert.equal(flowUploadedMedia([['content-id','project-id','media-id','CAE']]),'media-id');
 const upload=buildFlowUploadRequest({projectId:'19c0caf9-a7e4-46e8-8206-bdc7c83a8b30',base64:'YWJj',mime:'image/png',name:'ref file.png',captcha:'test'});
 assert.equal(upload[3],1);assert.equal(upload[8],'ref_file.png');assert.equal(upload.length,12);
});
