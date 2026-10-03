import {flowImageOptions, type FlowAspect, type FlowModel} from './flow-options.ts';
import {setTimeout as delay} from 'node:timers/promises';
import type {JobRow,Store} from './store.ts';
import {providerUrl,type BrowserProvider as Provider} from './protocol.ts';

export type BrowserControl={id:string;tag:string;role:string|null;type:string|null;label:string|null;text:string;placeholder:string|null;disabled:boolean;contentEditable?:boolean;accept:string|null;multiple:boolean;href:string|null;src:string|null;nearbyText?:string;nearbyMedia?:string[]};
export type Snapshot={url:string;title:string;text:string;alerts?:string[];controls:BrowserControl[];media?:Array<{id:string;src:string|null;width:number|null;height:number|null;nearbyText:string;downloadNode:string|null}>};
export type Download={id:number;jobId?:string;filename?:string;state?:string;bytes?:number;mime?:string;endTime?:string;error?:string};
export interface BrowserBridge {
  open(provider:Provider,url:string):Promise<{tabId:number;url:string}>;
  snapshot(provider:Provider,tabId:number):Promise<Snapshot>;
  click(provider:Provider,tabId:number,node:string):Promise<unknown>;
  fill(provider:Provider,tabId:number,node:string,text:string):Promise<unknown>;
  key(provider:Provider,tabId:number,key:'Enter'|'Escape'|'Tab'):Promise<unknown>;
  upload(provider:Provider,tabId:number,node:string,files:string[]):Promise<unknown>;
  trackDownload(provider:Provider,tabId:number,jobId:string):Promise<unknown>;
  downloads(provider:Provider):Promise<Download[]>;
  flowEnsureWorkspace?(projectId:string):Promise<{tabId:number;url:string}>;
  flowUiAttachReferences?(tabId:number,args:{jobId:string;files:string[]}):Promise<{attached:number}>;
  flowUploadReference?(tabId:number,args:{jobId:string;file:string}):Promise<{mediaId:string}>;
  flowDirectStatus?(tabId:number):Promise<{ready:boolean;strategy:string;projectId?:string|null}>;
  flowRecoverDownload?(tabId:number,args:{jobId:string}):Promise<{downloadId?:number;phase?:string}>;
  flowRefreshSession?(tabId:number):Promise<{ready:boolean;strategy:string;projectId?:string|null}>;
  flowDirectGenerate?(tabId:number,args:{jobId:string;prompt:string;aspect:FlowAspect;model:FlowModel;seed?:number;references?:string[]}):Promise<{mode:string;downloadId:number}>;
  flowBackgroundSubmit?(tabId:number,args:{jobId:string;prompt:string;aspect:FlowAspect;model:FlowModel}):Promise<{submitted:boolean;visibility:string;beforeTiles:number}>;
  flowBackgroundResult?(tabId:number,args:{jobId:string;prompt:string;beforeTiles:number}):Promise<{phase:string;downloadId?:number}>;
  chatgptSaveOriginal?(tabId:number,args:{jobId:string}):Promise<{downloadId:number}>;
  detachDebugger?(tabId:number):Promise<unknown>;
}

export class ProviderActionRequired extends Error {readonly code:string;constructor(code:string,message:string){super(message);this.code=code;}}
export type {FlowAspect} from './flow-options.ts';
export function flowAspectFromPrompt(prompt:string):FlowAspect {
  try {return flowImageOptions({},prompt).aspect;}
  catch(error){const code=(error as Error).message;throw new ProviderActionRequired(code,code==='FLOW_ASPECT_AMBIGUOUS'?'Prompt có nhiều tỷ lệ. Hãy chỉ định một tỷ lệ ảnh đầu ra.':'Flow hỗ trợ 9:16, 16:9, 1:1, 3:4 hoặc 4:3.');}
}
export function isChatConversation(url:string){try{const parsed=new URL(url);return parsed.origin==='https://chatgpt.com'&&/\/c\/[^/]+/.test(parsed.pathname);}catch{return false;}}
const textOf=(control:BrowserControl)=>`${control.label||''} ${control.placeholder||''} ${control.text||''} ${control.nearbyText||''}`.toLocaleLowerCase();
const failurePattern=/(something went wrong|try again|đã xảy ra lỗi|thử lại|rate limit|too many requests|quota|credit|captcha|verify you are|sign in|log in|đăng nhập|unusual activity|hoạt động bất thường)/i;
export function userProblem(snapshot:Snapshot){
  // Never scan conversation text: a prompt can legitimately mention quota/credits.
  const text=(snapshot.alerts||[]).join("\n");
  if(!failurePattern.test(text))return null;
  if(/unusual activity|hoạt động bất thường/i.test(text))return new ProviderActionRequired('PROVIDER_UNUSUAL_ACTIVITY','Google Flow yêu cầu xác minh bảo mật do phát hiện hoạt động bất thường. Vui lòng kiểm tra tab Flow.');
  if(/captcha|verify you are/i.test(text))return new ProviderActionRequired('PROVIDER_CAPTCHA_REQUIRED','Provider yêu cầu xác minh CAPTCHA trong tab đang mở.');
  if(/sign in|log in|đăng nhập/i.test(text))return new ProviderActionRequired('PROVIDER_LOGIN_REQUIRED','Hãy đăng nhập lại provider trong tab đang mở.');
  if(/quota|credit|rate limit|too many requests/i.test(text))return new ProviderActionRequired('PROVIDER_QUOTA_OR_ERROR','Tài khoản provider đang hết quota hoặc tạm giới hạn.');
  return new ProviderActionRequired('PROVIDER_QUOTA_OR_ERROR','Provider báo lỗi tạo ảnh. Hãy đọc thông báo trong tab rồi tiếp tục job.');
}
function chooseComposer(snapshot:Snapshot){
  const promptLike=(control:BrowserControl)=>/prompt|message|describe|what do you want to create|nhập|tạo ảnh|ask/i.test(textOf(control));
  const candidates=snapshot.controls.filter(control=>!control.disabled&&(control.contentEditable||control.tag==='TEXTAREA'||control.role==='textbox'||control.tag==='INPUT'&&promptLike(control)));
  return candidates.find(control=>control.contentEditable)||candidates.find(control=>control.tag==='TEXTAREA')||candidates.find(control=>control.role==='textbox')||candidates.find(control=>control.tag==='INPUT'&&promptLike(control))||null;
}
function chooseUpload(snapshot:Snapshot){return snapshot.controls.find(control=>control.tag==='INPUT'&&control.type==='file'&&!control.disabled)||null;}
function chooseSubmit(snapshot:Snapshot){
  const buttons=snapshot.controls.filter(control=>!control.disabled&&(control.tag==='BUTTON'||control.role==='button'));
  const exact=buttons.find(control=>/^(send prompt|send|gửi|start generation|bắt đầu tạo|tạo)$/i.test(textOf(control).trim()));
  return exact||buttons.find(control=>/\b(send prompt|send|gửi|start generation|bắt đầu tạo|tạo)\b/i.test(textOf(control))&&!/stop|cancel|mic|dictation/i.test(textOf(control)))||buttons.find(control=>control.type==='submit'&&!/stop|cancel/i.test(textOf(control)))||null;
}
function chooseNewWorkspace(provider:Provider,snapshot:Snapshot){
  const candidates=snapshot.controls.filter(control=>!control.disabled&&/new project|tạo dự án|new chat|cuộc trò chuyện mới|chat mới/i.test(textOf(control)));
  return provider==='flow'?candidates.find(control=>/project|dự án/i.test(textOf(control)))||candidates[0]||null:candidates.find(control=>/chat|trò chuyện/i.test(textOf(control)))||candidates[0]||null;
}
export async function closeChatGPTImageViewer(browser:BrowserBridge,tabId:number,snapshot:Snapshot){
  const close=snapshot.controls.find(control=>!control.disabled&&/^(close fullscreen view|close image)$/i.test(textOf(control).trim()));
  if(!close)return snapshot;
  await browser.click('chatgpt',tabId,close.id);
  await delay(150);
  return browser.snapshot('chatgpt',tabId);
}
function meaningfulMedia(snapshot:Snapshot){return (snapshot.media||[]).filter(media=>{
  const width=media.width||0,height=media.height||0;
  return width>=128&&height>=128&&(Boolean(media.src)||width*height>=128*128);
});}
export function downloadNode(snapshot:Snapshot,before:Snapshot){
  const previous=new Set(meaningfulMedia(before).map(media=>media.src||media.id));
  const generated=meaningfulMedia(snapshot).filter(media=>!previous.has(media.src||media.id)).at(-1);
  const isAccountAppDownload=(control:BrowserControl)=>/(download apps|get chatgpt desktop|get chatgpt mobile|tải ứng dụng)/i.test(textOf(control));
  const isExactSave=(control:BrowserControl)=>/^(save|lưu)$/i.test((control.label||'').trim())||/^(save|lưu)$/i.test((control.text||'').trim());
  const isDownloadOrSave=(control:BrowserControl)=>/^(save|lưu|download|download image|download full resolution|download media|tải xuống|tải ảnh|tải về|lưu ảnh)$/i.test((control.label||'').trim())||/^(save|lưu|download|download image|download full resolution|download media|tải xuống|tải ảnh|tải về|lưu ảnh)$/i.test((control.text||'').trim());
  const candidates=snapshot.controls.filter(control=>!control.disabled&&!isAccountAppDownload(control)&&(/(download|tải xuống|lưu ảnh|save image|tải ảnh|tải về)/i.test(textOf(control))||isDownloadOrSave(control)));
  if(generated?.downloadNode)return generated.downloadNode;
  if(!candidates.length)return null;
  if(generated){
    const nearby=candidates.find(control=>control.nearbyMedia?.includes(generated.id));
    if(nearby)return nearby.id;
  }
  const exact=candidates.find(control=>/^(download media|tải nội dung nghe nhìn)$/i.test((control.label||'').trim())||/^(download media|tải nội dung nghe nhìn)$/i.test((control.text||'').trim())||isExactSave(control));
  if(exact)return exact.id;
  const downloadBtn=candidates.filter(isDownloadOrSave).at(-1);
  if(downloadBtn)return downloadBtn.id;
  if(candidates.length===1)return candidates[0].id;
  return null;
}
export function originalDownloadNode(snapshot:Snapshot){return snapshot.controls.find(control=>!control.disabled&&/(^|\s)(1k\s+original size|original size|kích thước gốc)(\s|$)/i.test(textOf(control)))?.id||null;}
function newResult(snapshot:Snapshot,before:Snapshot){
  const prior=new Set(meaningfulMedia(before).map(media=>media.src||media.id));return meaningfulMedia(snapshot).filter(media=>!prior.has(media.src||media.id)).at(-1);
}
function generatedImageControl(snapshot:Snapshot){
  return snapshot.controls.filter(control=>!control.disabled&&(control.tag==='BUTTON'||control.role==='button')&&/\bgenerated image\b|\bảnh (?:đã )?tạo\b/i.test(textOf(control))).at(-1)||null;
}
function newVisualResult(snapshot:Snapshot,before:Snapshot){return newResult(snapshot,before)||generatedImageControl(snapshot);}
function hasNewResult(snapshot:Snapshot,before:Snapshot){
  return Boolean(newVisualResult(snapshot,before));
}
function reconciliationMode(job:JobRow){try{return JSON.parse(job.result_json||'null')?.reconcileExisting===true;}catch{return false;}}

async function recoverExistingResult(store:Store,browser:BrowserBridge,provider:Provider,job:JobRow,tabId:number,snapshot:Snapshot){
  store.updateJob(job.id,{status:'preparing',workspace_url:snapshot.url,error_code:null,user_message:'Đang đối chiếu kết quả đã có; Windi sẽ không gửi lại prompt.'});
  if(provider==='flow'){
    if(!browser.flowRecoverDownload)throw new ProviderActionRequired('DOWNLOAD_RESULT_UNCLEAR','Không có phản hồi Flow đã lưu để phục hồi. Không gửi lại prompt.');
    const existing=(await browser.downloads(provider)).filter(item=>item.jobId===job.id&&item.state==='complete'&&item.filename).sort((a,b)=>b.id-a.id)[0];
    if(existing)return existing;
    const deadline=Date.now()+5*60_000;
    while(Date.now()<deadline){
      const result=await browser.flowRecoverDownload(tabId,{jobId:job.id});
      if(result.phase==='wrong-asset')throw new ProviderActionRequired('FLOW_RESULT_MISMATCH','Không xác nhận được prompt của ảnh đang mở. Giữ job để đối chiếu, không tải nhầm ảnh.');
      if(result.phase==='download-option-missing')throw new ProviderActionRequired('FLOW_UI_DOWNLOAD_OPTION_MISSING','Flow chưa hiện lựa chọn tải ảnh gốc. Giữ kết quả để tiếp tục cùng job.');
      if(result.downloadId)break;
      const complete=(await browser.downloads(provider)).find(item=>item.jobId===job.id&&item.state==='complete'&&item.filename);
      if(complete)return complete;
      await delay(1250);
    }
    store.updateJob(job.id,{status:'downloading'});
    return await waitForDownload(browser,provider,job.id);
  }
  await browser.trackDownload(provider,tabId,job.id);
  const empty={...snapshot,controls:[],media:[]} as Snapshot;let opened=false;const deadline=Date.now()+90_000;
  while(Date.now()<deadline){const problem=userProblem(snapshot);if(problem)throw problem;const node=downloadNode(snapshot,empty);if(node){store.updateJob(job.id,{status:'downloading',user_message:'Đang tải bản gốc của kết quả đã đối chiếu.'});if(provider==='chatgpt'&&browser.chatgptSaveOriginal){await browser.chatgptSaveOriginal(tabId,{jobId:job.id});return await waitForDownload(browser,provider,job.id);}return startOriginalDownload(browser,provider,job.id,tabId,node);}const media=newVisualResult(snapshot,empty);if(media&&!opened){await browser.click(provider,tabId,media.id);opened=true;}await delay(750);snapshot=await browser.snapshot(provider,tabId);}
  throw new ProviderActionRequired('DOWNLOAD_RESULT_UNCLEAR','Không tìm thấy kết quả hiện hữu hoặc nút tải bản gốc trong workspace đã đối chiếu.');
}

async function startOriginalDownload(browser:BrowserBridge,provider:Provider,jobId:string,tabId:number,node:string){
  await browser.click(provider,tabId,node);
  if(provider==='flow'){
    for(let attempt=0;attempt<12;attempt++){
      await delay(250);const started=(await browser.downloads(provider)).find(item=>item.jobId===jobId);if(started)return waitForDownload(browser,provider,jobId);
      const snapshot=await browser.snapshot(provider,tabId);const original=originalDownloadNode(snapshot);if(original){await browser.click(provider,tabId,original);break;}
    }
  }
  return waitForDownload(browser,provider,jobId);
}

export async function runProviderJob(store:Store,browser:BrowserBridge,job:JobRow){
  if(job.provider==='grok')throw new Error('GROK_BROWSER_OPERATIONS_UNSUPPORTED');
  const provider=job.provider;let workspace=store.workspace(job.project_id,provider);
  if(provider==='chatgpt'&&workspace&&!isChatConversation(workspace.url))workspace=undefined;
  if(!workspace&&reconciliationMode(job))throw new ProviderActionRequired('DOWNLOAD_RESULT_UNCLEAR','Chưa có liên kết tới kết quả cũ. Giữ nguyên job để đối chiếu, không tạo workspace hay gửi lại prompt.');
  let opened:{tabId:number;url:string};
  if(provider==='flow'&&!workspace){
    if(!browser.flowEnsureWorkspace)throw new ProviderActionRequired('FLOW_WORKSPACE_REQUIRED','Cần cập nhật backend và extension Windi Connect để tự tạo project Flow.');
    try{opened=await browser.flowEnsureWorkspace(job.project_id);}catch(error){
      const code=error instanceof Error?error.message:String(error);
      if(code==='FLOW_WORKSPACE_CREATION_UNCERTAIN')throw new ProviderActionRequired(code,'Đã yêu cầu tạo project Flow nhưng chưa xác nhận được URL. Giữ tab Flow đang mở và tiếp tục cùng job; Windi sẽ kiểm tra lại trước khi tạo thêm.');
      if(code==='FLOW_WORKSPACE_CREATE_UNAVAILABLE')throw new ProviderActionRequired(code,'Không tìm thấy nút tạo project Flow. Kiểm tra đăng nhập hoặc thông báo trong tab Flow rồi tiếp tục cùng job.');
      throw error;
    }
    if(!/^https:\/\/flow\.google\.com\/project\/[0-9a-f-]{36}(?:[/?#]|$)/i.test(opened.url))throw new ProviderActionRequired('FLOW_WORKSPACE_REQUIRED','Chưa xác nhận được project Flow mới.');
    workspace=store.upsertWorkspace(job.project_id,provider,opened.url,'Windi');
  }else opened=await browser.open(provider,workspace?.url||providerUrl(provider));
  let tabId=opened.tabId;
  try {
  // Flow owns a separate workspace tab; its image adapter binds exact settings.
  let snapshot:Snapshot=provider==='flow'?{url:opened.url,title:'Flow',text:'',controls:[]}:await browser.snapshot(provider,tabId);
  if(provider==='chatgpt')snapshot=await closeChatGPTImageViewer(browser,tabId,snapshot);
  let problem=userProblem(snapshot);if(problem)throw problem;
  if(workspace&&reconciliationMode(job))return await recoverExistingResult(store,browser,provider,job,tabId,snapshot);
  if(!workspace){
    let create=chooseNewWorkspace(provider,snapshot);
    const createControlDeadline=Date.now()+15_000;
    while(!create&&Date.now()<createControlDeadline){await delay(500);snapshot=await browser.snapshot(provider,tabId);problem=userProblem(snapshot);if(problem)throw problem;create=chooseNewWorkspace(provider,snapshot);}
    if(!create)throw new ProviderActionRequired('PROVIDER_UI_CHANGED',`Không tìm thấy nút tạo workspace ${provider==='flow'?'Flow':'ChatGPT'} mới. Hãy mở tab provider và kiểm tra giao diện.`);
    await browser.click(provider,tabId,create.id);
    const workspaceDeadline=Date.now()+15_000;
    do {await delay(500);snapshot=await browser.snapshot(provider,tabId);} while(Date.now()<workspaceDeadline&&(!snapshot.url||(provider==='chatgpt'&&isChatConversation(snapshot.url))));
    if(!snapshot.url||(provider==='chatgpt'&&isChatConversation(snapshot.url)))throw new ProviderActionRequired('PROVIDER_UI_CHANGED',`${provider==='flow'?'Flow':'ChatGPT'} chưa mở workspace mới sau khi bấm nút tạo. Job chưa gửi prompt và có thể tiếp tục an toàn.`);
    workspace=provider==='chatgpt'&&!isChatConversation(snapshot.url)?{project_id:job.project_id,provider,url:snapshot.url,title:null,updated_at:new Date().toISOString()}:store.upsertWorkspace(job.project_id,provider,snapshot.url,snapshot.title||null);
  }else if(snapshot.url!==workspace.url&&(provider!=='chatgpt'||isChatConversation(snapshot.url))){workspace=store.upsertWorkspace(job.project_id,provider,snapshot.url,snapshot.title||null);}
  store.updateJob(job.id,{status:'preparing',workspace_url:provider==='chatgpt'&&!isChatConversation(workspace.url)?null:workspace.url,error_code:null,user_message:null});
  const baseline=snapshot;const uploadFiles=[...(job.kind==='edit'&&job.source_path?[job.source_path]:[]),...store.references(job)];
  if(provider==='flow'){
    const options=flowImageOptions(JSON.parse(job.options_json||'{}'),job.prompt);
    const {aspect,model,seed}=options;
    if(seed===undefined&&browser.flowBackgroundSubmit&&browser.flowBackgroundResult&&(!uploadFiles.length||browser.flowUiAttachReferences)){
      if(browser.flowUiAttachReferences){const refs=await browser.flowUiAttachReferences(tabId,{jobId:job.id,files:uploadFiles});if(refs.attached!==uploadFiles.length)throw new ProviderActionRequired('FLOW_UI_REFERENCE_NOT_ATTACHED','Flow chưa gắn đủ ảnh tham chiếu; chưa gửi lệnh tạo.');}
      await browser.trackDownload(provider,tabId,job.id);
      store.updateJob(job.id,{status:'submitted',submitted_at:new Date().toISOString(),workspace_url:workspace.url});
      const submitted=await browser.flowBackgroundSubmit(tabId,{jobId:job.id,prompt:job.prompt,aspect,model}).catch(error=>{
        if(error instanceof Error&&error.message==='FLOW_BACKGROUND_UNAVAILABLE')throw new ProviderActionRequired('FLOW_UI_START_BACKGROUND_UNAVAILABLE','Trình duyệt chưa hỗ trợ gửi lệnh Flow ở nền. Cập nhật trình duyệt và extension rồi tiếp tục cùng job; chưa gửi prompt.');
        throw error;
      });
      store.updateJob(job.id,{status:'generating'});
      const deadline=Date.now()+5*60_000;
      while(Date.now()<deadline){
        await delay(1_250);
        const result=await browser.flowBackgroundResult(tabId,{jobId:job.id,prompt:job.prompt,beforeTiles:submitted.beforeTiles});
        if(result.phase==='wrong-asset')throw new ProviderActionRequired('FLOW_RESULT_MISMATCH','Flow mở ảnh khác với prompt vừa gửi. Giữ nguyên kết quả, không tải nhầm ảnh.');
        if(result.phase==='download-option-missing')throw new ProviderActionRequired('FLOW_UI_DOWNLOAD_OPTION_MISSING','Flow đã tạo ảnh nhưng không thấy lựa chọn tải ảnh gốc. Giữ kết quả trong workspace để tiếp tục cùng job.');
        const observed=(await browser.downloads(provider)).find(item=>item.jobId===job.id);
        if(observed?.state==='complete'&&observed.filename)return observed;
        if(observed?.state==='interrupted')throw new ProviderActionRequired('DOWNLOAD_NOT_OBSERVED',`Flow tải ảnh bị gián đoạn${observed.error?`: ${observed.error}`:''}.`);
        if(result.phase==='downloading'){
          store.updateJob(job.id,{status:'downloading'});
          return await waitForDownload(browser,provider,job.id);
        }
      }
      throw new ProviderActionRequired('FLOW_RESULT_NOT_OBSERVED','Flow chưa hiện ảnh mới hoặc chưa tải được ảnh gốc. Giữ nguyên job để kiểm tra trong workspace.');
    }
    let direct=browser.flowDirectStatus?await browser.flowDirectStatus(tabId):{ready:false,strategy:'none'};
    if(!direct.ready&&browser.flowRefreshSession)direct=await browser.flowRefreshSession(tabId);
    if(direct.strategy!=='flow-rpc'||!direct.ready)throw new ProviderActionRequired('FLOW_DIRECT_SESSION_NOT_READY','Phiên RPC của Flow chưa sẵn sàng. Hãy mở Flow đúng profile, kiểm tra đăng nhập rồi tiếp tục cùng job; Windi không tự focus tab hoặc dùng selector để gửi prompt.');
    if(!browser.flowDirectGenerate)throw new ProviderActionRequired('FLOW_DIRECT_SESSION_NOT_READY','Extension chưa có adapter Flow RPC. Hãy reload Windi Connect rồi tiếp tục cùng job.');
    const references:string[]=[];
    if(uploadFiles.length&&!browser.flowUploadReference)throw new ProviderActionRequired('FLOW_REFERENCE_ADAPTER_REQUIRED','Hãy reload Windi Connect để bật upload ảnh ref.');
    for(const file of uploadFiles){const uploaded=await browser.flowUploadReference!(tabId,{jobId:job.id,file});references.push(uploaded.mediaId);}
    await browser.trackDownload(provider,tabId,job.id);
    store.updateJob(job.id,{status:'submitted',submitted_at:new Date().toISOString(),workspace_url:workspace.url});
    try{await browser.flowDirectGenerate(tabId,{jobId:job.id,prompt:job.prompt,aspect,model,seed,references});}
    catch(error){
      const code=error instanceof Error?error.message:String(error);
      if(code.includes('FLOW_ERROR_UNUSUAL_ACTIVITY')||code.includes('PUBLIC_ERROR_UNUSUAL_ACTIVITY'))throw new ProviderActionRequired('FLOW_UNUSUAL_ACTIVITY','Google Flow yêu cầu xác minh hành vi. Mở tab Flow để kiểm tra tài khoản rồi tiếp tục đúng job; Windi không chuyển sang điều khiển giao diện.');
      if(/^FLOW_DIRECT_(?:HTTP_(?:400|401|403|409|429)|SESSION_NOT_READY|CAPTCHA_UNAVAILABLE)$/.test(code))throw new ProviderActionRequired(code,'Phiên RPC của Flow chưa sẵn sàng. Kiểm tra đăng nhập hoặc thông báo trong tab Flow rồi tiếp tục đúng job.');
      throw error;
    }
    store.updateJob(job.id,{status:'downloading'});
    for(let attempt=0;;attempt++){
      try{return await waitForDownload(browser,provider,job.id);}
      catch(error){
        if(!(error instanceof ProviderActionRequired)||error.code!=='DOWNLOAD_NOT_OBSERVED'||attempt>=2||!browser.flowRecoverDownload)throw error;
        store.updateJob(job.id,{user_message:`Đang phục hồi tải ảnh gốc (${attempt+1}/2), giữ nguyên kết quả đã tạo.`});
        await browser.flowRecoverDownload(tabId,{jobId:job.id});
      }
    }
  }
  if(uploadFiles.length){const input=chooseUpload(snapshot);if(!input)throw new ProviderActionRequired('PROVIDER_UI_CHANGED','Không tìm thấy vùng đính kèm ảnh trong giao diện provider.');await browser.upload(provider,tabId,input.id,uploadFiles);await delay(500);snapshot=await browser.snapshot(provider,tabId);}
  let composer=chooseComposer(snapshot);const composerDeadline=Date.now()+15_000;
  while(!composer&&Date.now()<composerDeadline){await delay(500);snapshot=await browser.snapshot(provider,tabId);problem=userProblem(snapshot);if(problem)throw problem;composer=chooseComposer(snapshot);}
  if(!composer)throw new ProviderActionRequired('PROVIDER_UI_CHANGED','Không tìm thấy ô nhập prompt trong giao diện provider.');
  await browser.fill(provider,tabId,composer.id,job.prompt);
  // ChatGPT enables Send asynchronously after programmatic input. Do not
  // record a submission or fall back to Enter until an enabled send button
  // is observed; otherwise a job can appear to generate without ever leaving
  // the composer.
  let submit:BrowserControl|null=null;
  const submitDeadline=Date.now()+15_000;
  while(!submit&&Date.now()<submitDeadline){
    await delay(250);
    snapshot=await browser.snapshot(provider,tabId);
    problem=userProblem(snapshot);if(problem)throw problem;
    submit=chooseSubmit(snapshot);
  }
  if(!submit)throw new ProviderActionRequired('PROVIDER_UI_CHANGED','ChatGPT chưa bật nút gửi prompt. Job chưa được gửi và có thể tiếp tục an toàn.');
  await browser.trackDownload(provider,tabId,job.id);
  await browser.click(provider,tabId,submit.id);
  store.updateJob(job.id,{status:'submitted',submitted_at:new Date().toISOString(),workspace_url:provider==='chatgpt'&&!isChatConversation(workspace.url)?null:workspace.url});
  store.updateJob(job.id,{status:'generating'});
  const deadline=Date.now()+5*60_000;let openedResult=false;
  while(Date.now()<deadline){
    await delay(1_250);snapshot=await browser.snapshot(provider,tabId);if(snapshot.url!==workspace.url&&isChatConversation(snapshot.url)){workspace=store.upsertWorkspace(job.project_id,provider,snapshot.url,snapshot.title||null);store.updateJob(job.id,{workspace_url:workspace.url});}problem=userProblem(snapshot);if(problem)throw problem;
    const observed=(await browser.downloads(provider)).find(item=>item.jobId===job.id);if(observed?.state==='complete'&&observed.filename){store.updateJob(job.id,{status:'downloading'});return observed;}if(observed?.state==='interrupted')throw new ProviderActionRequired('DOWNLOAD_NOT_OBSERVED',`Trình duyệt không tải được ảnh gốc${observed.error?`: ${observed.error}`:''}.`);
    const node=downloadNode(snapshot,baseline);const readyImage=provider==='chatgpt'?newResult(snapshot,baseline):null;
    if((node||(provider==='chatgpt'&&openedResult))&&(provider==='chatgpt'?Boolean(readyImage):hasNewResult(snapshot,baseline))){
      if(provider==='chatgpt'&&browser.chatgptSaveOriginal){
        try{await browser.chatgptSaveOriginal(tabId,{jobId:job.id});store.updateJob(job.id,{status:'downloading'});return await waitForDownload(browser,provider,job.id);}
        catch(err){if(err instanceof Error&&err.message==='CHATGPT_SAVE_NOT_FOUND')continue;if(node)await browser.click(provider,tabId,node);else throw err;}
      }else if(node)await browser.click(provider,tabId,node);
      store.updateJob(job.id,{status:'downloading'});return await waitForDownload(browser,provider,job.id);
    }
    const media=provider==='chatgpt'?readyImage:newVisualResult(snapshot,baseline);if(media&&!openedResult){await browser.click(provider,tabId,media.id);openedResult=true;}
  }
  throw new ProviderActionRequired('PROVIDER_UI_CHANGED','Provider chưa hiển thị ảnh mới kèm nút tải xuống trong thời gian chờ. Job được giữ lại để bạn xử lý trong tab.');
  } catch(error) {
    if(provider==='flow'&&error instanceof Error&&/^No tab with id: \d+\.$/.test(error.message))throw new ProviderActionRequired('TAB_NOT_OWNED_OR_WRONG_PROVIDER','Cửa sổ Flow xử lý đã bị đóng. Giữ job và tiếp tục cùng ID để đối chiếu ảnh đã gửi; Windi không tự tạo lại.');
    throw error;
  } finally {
    // Release the browser debugging banner at rest, retaining the workspace
    // and durable submission/download records for the next job or recovery.
    if(provider==='flow'&&browser.detachDebugger)await browser.detachDebugger(tabId).catch(()=>{});
  }
}

async function waitForDownload(browser:BrowserBridge,provider:Provider,jobId:string){
  const deadline=Date.now()+90_000;
  while(Date.now()<deadline){
    const records=await browser.downloads(provider);const matching=records.filter(item=>item.jobId===jobId).sort((a,b)=>b.id-a.id);const download=matching.find(item=>item.state==='complete'&&item.filename)||matching[0];
    if(download?.state==='complete'&&download.filename)return download;
    if(download?.state==='interrupted')throw new ProviderActionRequired('DOWNLOAD_NOT_OBSERVED',`Trình duyệt không tải được ảnh gốc${download.error?`: ${download.error}`:''}.`);
    await delay(600);
  }
  throw new ProviderActionRequired('DOWNLOAD_NOT_OBSERVED','Không thấy file ảnh gốc được tải từ kết quả của job này.');
}
