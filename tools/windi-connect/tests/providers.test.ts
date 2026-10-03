import assert from 'node:assert/strict';
import test from 'node:test';
import {closeChatGPTImageViewer,downloadNode,originalDownloadNode,ProviderActionRequired,runProviderJob,type Snapshot} from '../src/providers.ts';

const base=(patch:Partial<Snapshot>={}):Snapshot=>({url:'https://flow.google.com/project/test',title:'Google Flow',text:'',controls:[],media:[],...patch});

test('Flow asset editor selects the labelled download control instead of its icon',()=>{
  const snapshot=base({
    controls:[
      {id:'button-1',tag:'BUTTON',role:null,type:null,label:'Download media',text:'download',placeholder:null,disabled:false,accept:null,multiple:false,href:null,src:null},
      {id:'icon-1',tag:'MAT-ICON',role:'img',type:null,label:null,text:'download',placeholder:null,disabled:false,accept:null,multiple:false,href:null,src:null},
    ],
    media:[
      {id:'avatar',src:'https://example.com/avatar.png',width:32,height:32,nearbyText:'',downloadNode:null},
      {id:'icon-1',src:null,width:null,height:null,nearbyText:'download',downloadNode:'icon-1'},
      {id:'image-1',src:'https://example.com/image.png',width:382,height:512,nearbyText:'',downloadNode:null},
    ],
  });
  assert.equal(downloadNode(snapshot,base()),'button-1');
});

test('Flow download menu selects the original 1K item',()=>{
  const snapshot=base({controls:[
    {id:'original-1',tag:'BUTTON',role:'menuitem',type:null,label:null,text:'1K\nOriginal size',placeholder:null,disabled:false,accept:null,multiple:false,href:null,src:null},
    {id:'upscaled-2',tag:'BUTTON',role:'menuitem',type:null,label:null,text:'2K\nUpscaled',placeholder:null,disabled:false,accept:null,multiple:false,href:null,src:null},
  ]});
  assert.equal(originalDownloadNode(snapshot),'original-1');
});

test('ChatGPT ignores the profile Download apps menu and selects Save in the image viewer',()=>{
  const snapshot=base({
    url:'https://chatgpt.com/c/test',
    title:'Generated image',
    controls:[
      {id:'apps-1',tag:'BUTTON',role:null,type:null,label:'Download apps',text:'',placeholder:null,disabled:false,accept:null,multiple:false,href:null,src:null},
      {id:'save-1',tag:'BUTTON',role:null,type:null,label:'Save',text:'',placeholder:null,disabled:false,accept:null,multiple:false,href:null,src:null},
    ],
    media:[{id:'image-1',src:'https://example.com/generated.webp',width:1024,height:1536,nearbyText:'Generated image',downloadNode:null}],
  });
  assert.equal(downloadNode(snapshot,base({url:'https://chatgpt.com/'})),'save-1');
});

test('ChatGPT selects Download or Tải xuống in the image viewer',()=>{
  const snapshot=base({
    url:'https://chatgpt.com/c/test',
    title:'Generated image',
    controls:[
      {id:'apps-1',tag:'BUTTON',role:null,type:null,label:'Download apps',text:'',placeholder:null,disabled:false,accept:null,multiple:false,href:null,src:null},
      {id:'dl-1',tag:'BUTTON',role:null,type:null,label:'Download',text:'',placeholder:null,disabled:false,accept:null,multiple:false,href:null,src:null},
    ],
    media:[{id:'image-1',src:'https://example.com/generated.webp',width:1024,height:1536,nearbyText:'Generated image',downloadNode:null}],
  });
  assert.equal(downloadNode(snapshot,base({url:'https://chatgpt.com/'})),'dl-1');

  const snapshotVi=base({
    url:'https://chatgpt.com/c/test',
    title:'Generated image',
    controls:[
      {id:'apps-1',tag:'BUTTON',role:null,type:null,label:'Tải ứng dụng cho máy tính',text:'',placeholder:null,disabled:false,accept:null,multiple:false,href:null,src:null},
      {id:'dl-vi',tag:'BUTTON',role:null,type:null,label:'Tải xuống',text:'',placeholder:null,disabled:false,accept:null,multiple:false,href:null,src:null},
    ],
    media:[{id:'image-1',src:'https://example.com/generated.webp',width:1024,height:1536,nearbyText:'Generated image',downloadNode:null}],
  });
  assert.equal(downloadNode(snapshotVi,base({url:'https://chatgpt.com/'})),'dl-vi');
});

test('ChatGPT does not treat Download apps as an image export action',()=>{
  const snapshot=base({
    url:'https://chatgpt.com/c/test',
    controls:[
      {id:'apps-1',tag:'BUTTON',role:null,type:null,label:'Download apps',text:'',placeholder:null,disabled:false,accept:null,multiple:false,href:null,src:null},
    ],
    media:[{id:'image-1',src:'https://example.com/generated.webp',width:1024,height:1536,nearbyText:'Generated image',downloadNode:null}],
  });
  assert.equal(downloadNode(snapshot,base({url:'https://chatgpt.com/'})),null);
});

test('ChatGPT recovery prefers the latest generated image in a multi-image chat',()=>{
  const snapshot=base({
    url:'https://chatgpt.com/c/test',
    controls:[
      {id:'save-old',tag:'BUTTON',role:null,type:null,label:'Download image',text:'',placeholder:null,disabled:false,accept:null,multiple:false,href:null,src:null,nearbyMedia:['old']},
      {id:'save-new',tag:'BUTTON',role:null,type:null,label:'Download image',text:'',placeholder:null,disabled:false,accept:null,multiple:false,href:null,src:null,nearbyMedia:['new']},
    ],
    media:[
      {id:'old',src:'https://example.com/old.webp',width:1024,height:1536,nearbyText:'Generated image',downloadNode:null},
      {id:'new',src:'https://example.com/new.webp',width:1024,height:1536,nearbyText:'Generated image',downloadNode:null},
    ],
  });
  assert.equal(downloadNode(snapshot,base({url:'https://chatgpt.com/'})),'save-new');
});

test('ChatGPT closes an existing image viewer before preparing a new prompt',async()=>{
  const viewer=base({url:'https://chatgpt.com/c/test',controls:[{id:'close-1',tag:'BUTTON',role:null,type:null,label:'Close fullscreen view',text:'',placeholder:null,disabled:false,accept:null,multiple:false,href:null,src:null}]});
  const clean=base({url:'https://chatgpt.com/c/test'});const clicks:string[]=[];
  const browser:any={click:async(_provider:string,_tab:number,node:string)=>clicks.push(node),snapshot:async()=>clean};
  assert.equal(await closeChatGPTImageViewer(browser,7,viewer),clean);
  assert.deepEqual(clicks,['close-1']);
});

test('ChatGPT waits for image bytes before saving a generated result',async()=>{
  const url='https://chatgpt.com/c/cat-test';
  const composer:any={id:'composer',tag:'TEXTAREA',role:null,type:null,label:'Ask ChatGPT',text:'',placeholder:null,disabled:false,accept:null,multiple:false,href:null,src:null};
  const send:any={id:'send',tag:'BUTTON',role:null,type:null,label:'Send prompt',text:'',placeholder:null,disabled:false,accept:null,multiple:false,href:null,src:null};
  const progress:any={id:'progress',tag:'BUTTON',role:null,type:null,label:'Generated image 1',text:'Generated image 1',placeholder:null,disabled:false,accept:null,multiple:false,href:null,src:null};
  const media:any={id:'image',src:'https://oaiusercontent.com/cat.png',width:1672,height:941,nearbyText:'Generated image 1',downloadNode:null};
  let submitted=false,observations=0,opened=false,saves=0;
  const snapshot=()=>{if(!submitted)return base({url,controls:[composer,send]});observations++;return base({url,controls:[composer,progress],media:observations<3?[]:[media]});};
  const browser:any={open:async()=>({tabId:1,url}),snapshot:async()=>snapshot(),fill:async()=>{},trackDownload:async()=>{},click:async(_provider:string,_tab:number,id:string)=>{if(id==='send')submitted=true;if(id==='image')opened=true;},chatgptSaveOriginal:async()=>{assert.ok(opened);saves++;return {downloadId:1};},downloads:async()=>saves?[{id:1,jobId:'cat-job',state:'complete',filename:'/tmp/cat.png'}]:[]};
  const store:any={workspace:()=>({url}),references:()=>[],updateJob:()=>{},upsertWorkspace:()=>({url})};
  const job:any={id:'cat-job',project_id:'cat-project',provider:'chatgpt',kind:'create',prompt:'a cat',result_json:null};
  assert.equal((await runProviderJob(store,browser,job)).filename,'/tmp/cat.png');
  assert.ok(observations>=3);
  assert.equal(saves,1);
});

test('Flow does not silently fall back to UI when the direct session is unavailable',async()=>{
  let uiSubmits=0;
  const workspace={project_id:'project-1',provider:'flow',url:'https://flow.google.com/project/65761a43-b56d-41a6-aa44-b4861eac2c95',title:'Flow',updated_at:new Date().toISOString()};
  const job={id:'job-1',project_id:'project-1',provider:'flow',kind:'create',status:'queued',request_key:null,fingerprint:'fingerprint',prompt:'portrait scene',source_path:null,reference_paths:'[]',output_path:'/tmp/scene.png',workspace_url:workspace.url,error_code:null,user_message:null,result_json:null,staging_path:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),submitted_at:null,completed_at:null};
  const store={workspace:()=>workspace,references:()=>[],updateJob:()=>job,upsertWorkspace:()=>workspace} as any;
  const browser={
    open:async()=>({tabId:7,url:workspace.url}),snapshot:async()=>{throw new Error('FLOW_MUST_NOT_READ_DOM');},
    flowDirectStatus:async()=>({ready:false,strategy:'direct-api',projectId:'65761a43-b56d-41a6-aa44-b4861eac2c95'}),
    flowRefreshSession:async()=>({ready:false,strategy:'direct-api',projectId:'65761a43-b56d-41a6-aa44-b4861eac2c95'}),
    flowDirectGenerate:async()=>{throw new Error('MUST_NOT_GENERATE');},
    flowUiSubmit:async()=>{uiSubmits++;return {mode:'ui',submitted:true};},
  } as any;
  await assert.rejects(()=>runProviderJob(store,browser,job as any),(error:unknown)=>error instanceof ProviderActionRequired&&error.code==='FLOW_DIRECT_SESSION_NOT_READY');
  assert.equal(uiSubmits,0);
});

test('Flow unusual activity never starts selector automation',async()=>{
  const url='https://flow.google.com/project/65761a43-b56d-41a6-aa44-b4861eac2c95';
  let clicks=0,snapshots=0;
  const browser:any={open:async()=>({tabId:7,url}),flowDirectStatus:async()=>({ready:true,strategy:'flow-rpc'}),trackDownload:async()=>{},flowDirectGenerate:async()=>{throw new Error('FLOW_ERROR_UNUSUAL_ACTIVITY');},click:async()=>{clicks++;},snapshot:async()=>{snapshots++;}};
  const store:any={workspace:()=>({url}),references:()=>[],updateJob:()=>{}};
  const job:any={id:'unusual',project_id:'project',provider:'flow',kind:'create',prompt:'a cat',result_json:null};
  await assert.rejects(()=>runProviderJob(store,browser,job),(error:unknown)=>error instanceof ProviderActionRequired&&error.code==='FLOW_UNUSUAL_ACTIVITY');
  assert.equal(clicks,0);
  assert.equal(snapshots,0);
});

test('Flow RPC submit and recovery never inspect or click UI and recovery never resubmits',async()=>{
  const url='https://flow.google.com/project/65761a43-b56d-41a6-aa44-b4861eac2c95';
  const job:any={id:'rpc-job',project_id:'p',provider:'flow',kind:'create',prompt:'scene',result_json:null};
  const updates:any[]=[];let submits=0,recoveries=0;
  const store:any={workspace:()=>({url}),references:()=>[],updateJob:(_id:any,patch:any)=>updates.push(patch)};
  const forbidden=async()=>{throw new Error('FLOW_MUST_NOT_USE_UI');};
  const browser:any={open:async()=>({tabId:7,url}),snapshot:forbidden,click:forbidden,fill:forbidden,key:forbidden,upload:forbidden,
    flowDirectStatus:async()=>({ready:true,strategy:'flow-rpc'}),trackDownload:async()=>{},
    flowDirectGenerate:async()=>{assert.ok(updates.some(x=>x.submitted_at));submits++;return {downloadId:1};},
    flowRecoverDownload:async()=>{recoveries++;return {downloadId:2};},
    downloads:async()=>[{id:1,jobId:job.id,state:'complete',filename:'/tmp/original.jpg'}]};
  await runProviderJob(store,browser,job);
  job.result_json=JSON.stringify({reconcileExisting:true});
  await runProviderJob(store,browser,job);
  assert.equal(submits,1);assert.equal(recoveries,0); // Existing complete download is reused directly.
});

test('Flow without a workspace and without the bootstrap adapter requests an update',async()=>{
  let opens=0;
  const job={id:'job-2',project_id:'project-2',provider:'flow',kind:'create',status:'queued',request_key:null,fingerprint:'fingerprint',prompt:'portrait scene',source_path:null,reference_paths:'[]',output_path:'/tmp/scene.png',workspace_url:null,error_code:null,user_message:null,result_json:null,staging_path:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),submitted_at:null,completed_at:null};
  const store={workspace:()=>undefined} as any;
  const browser={open:async()=>{opens++;return {tabId:8,url:'https://flow.google.com/'};}} as any;
  await assert.rejects(()=>runProviderJob(store,browser,job as any),(error:unknown)=>error instanceof ProviderActionRequired&&error.code==='FLOW_WORKSPACE_REQUIRED');
  assert.equal(opens,0);
});

test('Flow uploads refs before submit and stops generation if any upload fails',async()=>{
 const url='https://flow.google.com/project/65761a43-b56d-41a6-aa44-b4861eac2c95';
 const job:any={id:'ref-job',project_id:'p',provider:'flow',kind:'create',prompt:'scene 16:9',result_json:null};
 const events:string[]=[];let fail=false;
 const store:any={workspace:()=>({url}),references:()=>['/project/ref.png'],updateJob:(_id:any,p:any)=>{if(p.submitted_at)events.push('submitted');}};
 const browser:any={open:async()=>({tabId:7,url}),flowDirectStatus:async()=>({ready:true,strategy:'flow-rpc'}),trackDownload:async()=>{},
 flowUploadReference:async(_id:any,args:any)=>{assert.equal(args.file,'/project/ref.png');events.push('upload');if(fail)throw new Error('UPLOAD_FAILED');return {mediaId:'ref-media'};},
 flowDirectGenerate:async(_id:any,args:any)=>{events.push('generate');assert.deepEqual(args.references,['ref-media']);assert.equal(args.aspect,'landscape');},
 downloads:async()=>[{id:1,jobId:job.id,state:'complete',filename:'/tmp/original.jpg'}]};
 await runProviderJob(store,browser,job);assert.deepEqual(events,['upload','submitted','generate']);
 events.length=0;fail=true;await assert.rejects(runProviderJob(store,browser,job),/UPLOAD_FAILED/);assert.deepEqual(events,['upload']);
});

test('unsupported background submit reports a presubmit error instead of activating a window',async()=>{
  const url='https://flow.google.com/project/65761a43-b56d-41a6-aa44-b4861eac2c95';
  const job:any={id:'bg-job',project_id:'p',provider:'flow',kind:'create',prompt:'scene',result_json:null};
  const store:any={workspace:()=>({url}),references:()=>[],updateJob:()=>{}};
  let resultCalls=0,detaches=0;
  const browser:any={open:async()=>({tabId:7,url}),trackDownload:async()=>{},flowUiAttachReferences:async()=>({attached:0}),
    flowBackgroundSubmit:async()=>{throw new Error('FLOW_BACKGROUND_UNAVAILABLE');},
    detachDebugger:async(tabId:number)=>{assert.equal(tabId,7);detaches++;},flowBackgroundResult:async()=>{resultCalls++;},snapshot:async()=>{throw new Error('must not activate UI');}};
  await assert.rejects(runProviderJob(store,browser,job),(error:unknown)=>error instanceof ProviderActionRequired&&error.code==='FLOW_UI_START_BACKGROUND_UNAVAILABLE');
  assert.equal(resultCalls,0);assert.equal(detaches,1);
});

test('closing a processing tab keeps an accepted job recoverable',async()=>{
  const url='https://flow.google.com/project/65761a43-b56d-41a6-aa44-b4861eac2c95';
  const job:any={id:'closed-job',project_id:'p',provider:'flow',kind:'create',prompt:'scene',result_json:null};
  const store:any={workspace:()=>({url}),references:()=>[],updateJob:()=>{}};
  const browser:any={open:async()=>({tabId:7,url}),trackDownload:async()=>{},flowUiAttachReferences:async()=>({attached:0}),
    flowBackgroundSubmit:async()=>{throw new Error('No tab with id: 7.');},flowBackgroundResult:async()=>{},detachDebugger:async()=>{throw new Error('already gone');}};
  await assert.rejects(runProviderJob(store,browser,job),(error:unknown)=>error instanceof ProviderActionRequired&&error.code==='TAB_NOT_OWNED_OR_WRONG_PROVIDER');
});
