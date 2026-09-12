import {setTimeout as delay} from 'node:timers/promises';
import type {JobRow,Store} from './store.ts';
import {providerUrl,type Provider} from './protocol.ts';

export type BrowserControl={id:string;tag:string;role:string|null;type:string|null;label:string|null;text:string;placeholder:string|null;disabled:boolean;contentEditable?:boolean;accept:string|null;multiple:boolean;href:string|null;src:string|null;nearbyText?:string;nearbyMedia?:string[]};
export type Snapshot={url:string;title:string;text:string;controls:BrowserControl[];media?:Array<{id:string;src:string|null;width:number|null;height:number|null;nearbyText:string;downloadNode:string|null}>};
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
  flowUploadReference?(tabId:number,args:{jobId:string;file:string}):Promise<{mediaId:string}>;
  flowDirectStatus?(tabId:number):Promise<{ready:boolean;strategy:string;projectId?:string|null}>;
  flowRecoverDownload?(tabId:number,args:{jobId:string}):Promise<{downloadId:number}>;
  flowRefreshSession?(tabId:number):Promise<{ready:boolean;strategy:string;projectId?:string|null}>;
  flowDirectGenerate?(tabId:number,args:{jobId:string;prompt:string;aspect:FlowAspect;model:'NARWHAL';references?:string[]}):Promise<{mode:string;downloadId:number}>;
  chatgptSaveOriginal?(tabId:number,args:{jobId:string}):Promise<{downloadId:number}>;
}

export class ProviderActionRequired extends Error {readonly code:string;constructor(code:string,message:string){super(message);this.code=code;}}
export type FlowAspect='portrait'|'landscape'|'square'|'3x4'|'4x3';
export function flowAspectFromPrompt(prompt:string):FlowAspect {
  const ratios=[...prompt.matchAll(/\b(\d+)\s*[:x×]\s*(\d+)\b/gi)].map(match=>`${match[1]}:${match[2]}`);
  const supported:Record<string,FlowAspect>={'9:16':'portrait','16:9':'landscape','1:1':'square','3:4':'3x4','4:3':'4x3'};
  const selected=[...new Set(ratios)];
  if(selected.length>1)throw new ProviderActionRequired('FLOW_ASPECT_AMBIGUOUS','Prompt có nhiều tỷ lệ. Hãy chỉ định một tỷ lệ ảnh đầu ra.');
  if(selected.length){if(!supported[selected[0]])throw new ProviderActionRequired('FLOW_ASPECT_UNSUPPORTED','Flow hỗ trợ 9:16, 16:9, 1:1, 3:4 hoặc 4:3.');return supported[selected[0]];}
  if(/\b(square|vuông)\b/iu.test(prompt))return 'square';
  if(/\b(landscape|horizontal)\b|ảnh ngang/iu.test(prompt))return 'landscape';
  return 'portrait';
}
const textOf=(control:BrowserControl)=>`${control.label||''} ${control.placeholder||''} ${control.text||''} ${control.nearbyText||''}`.toLocaleLowerCase();
const failurePattern=/(something went wrong|try again|đã xảy ra lỗi|thử lại|rate limit|too many requests|quota|credit|captcha|verify you are|sign in|log in|đăng nhập)/i;
function userProblem(snapshot:Snapshot){
  const text=snapshot.text;
  if(!failurePattern.test(text))return null;
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
  const exact=buttons.find(control=>/^(send prompt|send|gửi)$/i.test(textOf(control).trim()));
  return exact||buttons.find(control=>/\b(send prompt|send|gửi)\b/i.test(textOf(control))&&!/stop|cancel|mic|dictation/i.test(textOf(control)))||null;
}
function chooseNewWorkspace(provider:Provider,snapshot:Snapshot){
  const candidates=snapshot.controls.filter(control=>!control.disabled&&/new project|tạo dự án|new chat|cuộc trò chuyện mới|chat mới/i.test(textOf(control)));
  return provider==='flow'?candidates.find(control=>/project|dự án/i.test(textOf(control)))||candidates[0]||null:candidates.find(control=>/chat|trò chuyện/i.test(textOf(control)))||candidates[0]||null;
}
function meaningfulMedia(snapshot:Snapshot){return (snapshot.media||[]).filter(media=>{
  const width=media.width||0,height=media.height||0;
  return width>=128&&height>=128&&(Boolean(media.src)||width*height>=128*128);
});}
export function downloadNode(snapshot:Snapshot,before:Snapshot){
  const previous=new Set(meaningfulMedia(before).map(media=>media.src||media.id));
  const generated=meaningfulMedia(snapshot).find(media=>!previous.has(media.src||media.id));
  const isAccountAppDownload=(control:BrowserControl)=>/(download apps|get chatgpt desktop|get chatgpt mobile|tải ứng dụng)/i.test(textOf(control));
  const isExactSave=(control:BrowserControl)=>/^(save|lưu)$/i.test((control.label||'').trim())||/^(save|lưu)$/i.test((control.text||'').trim());
  const candidates=snapshot.controls.filter(control=>!control.disabled&&!isAccountAppDownload(control)&&(/(download|tải xuống|lưu ảnh|save image)/i.test(textOf(control))||isExactSave(control)));
  const exact=candidates.find(control=>/^(download media|tải nội dung nghe nhìn)$/i.test((control.label||'').trim())||/^(download media|tải nội dung nghe nhìn)$/i.test((control.text||'').trim())||isExactSave(control));
  if(exact)return exact.id;
  if(generated?.downloadNode)return generated.downloadNode;
  if(!candidates.length)return null;
  if(generated)return candidates.find(control=>control.nearbyMedia?.includes(generated.id))?.id||(candidates.length===1?candidates[0].id:null);
  return null;
}
export function originalDownloadNode(snapshot:Snapshot){return snapshot.controls.find(control=>!control.disabled&&/(^|\s)(1k\s+original size|original size|kích thước gốc)(\s|$)/i.test(textOf(control)))?.id||null;}
function newResult(snapshot:Snapshot,before:Snapshot){
  const prior=new Set(meaningfulMedia(before).map(media=>media.src||media.id));return meaningfulMedia(snapshot).find(media=>!prior.has(media.src||media.id));
}
function generatedImageControl(snapshot:Snapshot){
  return snapshot.controls.find(control=>!control.disabled&&(control.tag==='BUTTON'||control.role==='button')&&/\bgenerated image\b|\bảnh (?:đã )?tạo\b/i.test(textOf(control)))||null;
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
    await browser.flowRecoverDownload(tabId,{jobId:job.id});
    store.updateJob(job.id,{status:'downloading'});
    return waitForDownload(browser,provider,job.id);
  }
  await browser.trackDownload(provider,tabId,job.id);
  const empty={...snapshot,controls:[],media:[]} as Snapshot;let opened=false;const deadline=Date.now()+90_000;
  while(Date.now()<deadline){const problem=userProblem(snapshot);if(problem)throw problem;const node=downloadNode(snapshot,empty);if(node){store.updateJob(job.id,{status:'downloading',user_message:'Đang tải bản gốc của kết quả đã đối chiếu.'});if(provider==='chatgpt'&&browser.chatgptSaveOriginal){await browser.chatgptSaveOriginal(tabId,{jobId:job.id});return waitForDownload(browser,provider,job.id);}return startOriginalDownload(browser,provider,job.id,tabId,node);}const media=newVisualResult(snapshot,empty);if(media&&!opened){await browser.click(provider,tabId,media.id);opened=true;}await delay(750);snapshot=await browser.snapshot(provider,tabId);}
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
  const provider=job.provider;let workspace=store.workspace(job.project_id,provider);
  if(provider==='flow'&&!workspace)throw new ProviderActionRequired('FLOW_WORKSPACE_REQUIRED','Project chưa liên kết workspace Flow. Mở một project Flow rồi chạy `windi project link --provider flow --url URL`; Windi không dùng selector để tự tạo project.');
  const opened=await browser.open(provider,workspace?.url||providerUrl(provider));let tabId=opened.tabId;
  // Flow RPC does not inspect DOM selectors, even during preparation/recovery.
  let snapshot:Snapshot=provider==='flow'?{url:opened.url,title:'Flow',text:'',controls:[]}:await browser.snapshot(provider,tabId);let problem=userProblem(snapshot);if(problem)throw problem;
  if(workspace&&reconciliationMode(job))return recoverExistingResult(store,browser,provider,job,tabId,snapshot);
  if(!workspace){
    let create=chooseNewWorkspace(provider,snapshot);
    const createControlDeadline=Date.now()+15_000;
    while(!create&&Date.now()<createControlDeadline){await delay(500);snapshot=await browser.snapshot(provider,tabId);problem=userProblem(snapshot);if(problem)throw problem;create=chooseNewWorkspace(provider,snapshot);}
    if(!create)throw new ProviderActionRequired('PROVIDER_UI_CHANGED',`Không tìm thấy nút tạo workspace ${provider==='flow'?'Flow':'ChatGPT'} mới. Hãy mở tab provider và kiểm tra giao diện.`);
    await browser.click(provider,tabId,create.id);
    const workspaceDeadline=Date.now()+15_000;
    do {await delay(500);snapshot=await browser.snapshot(provider,tabId);} while(Date.now()<workspaceDeadline&&(!snapshot.url||(provider==='flow'&&snapshot.url===providerUrl(provider))));
    if(!snapshot.url||(provider==='flow'&&snapshot.url===providerUrl(provider)))throw new ProviderActionRequired('PROVIDER_UI_CHANGED',`${provider==='flow'?'Flow':'ChatGPT'} chưa mở workspace mới sau khi bấm nút tạo. Job chưa gửi prompt và có thể tiếp tục an toàn.`);
    workspace=store.upsertWorkspace(job.project_id,provider,snapshot.url,snapshot.title||null);
  }else if(snapshot.url!==workspace.url){workspace=store.upsertWorkspace(job.project_id,provider,snapshot.url,snapshot.title||null);}
  store.updateJob(job.id,{status:'preparing',workspace_url:workspace.url,error_code:null,user_message:null});
  const baseline=snapshot;const uploadFiles=[...(job.kind==='edit'&&job.source_path?[job.source_path]:[]),...store.references(job)];
  if(provider==='flow'){
    if(job.kind!=='create')throw new ProviderActionRequired('FLOW_DIRECT_INPUT_UNSUPPORTED','Flow hiện hỗ trợ tạo ảnh mới với ref; chỉnh sửa ảnh gốc chưa được hỗ trợ.');
    if(!browser.flowDirectStatus||!browser.flowDirectGenerate)throw new ProviderActionRequired('FLOW_DIRECT_SESSION_NOT_READY','Extension chưa có adapter Flow direct. Hãy reload Windi Connect rồi tiếp tục cùng job.');
    const aspect=flowAspectFromPrompt(job.prompt);
    let direct=await browser.flowDirectStatus(tabId);
    if(!direct.ready&&browser.flowRefreshSession)direct=await browser.flowRefreshSession(tabId);
    if(!direct.ready)throw new ProviderActionRequired('FLOW_DIRECT_SESSION_NOT_READY','Phiên API trực tiếp của Flow chưa sẵn sàng. Hãy mở tab Flow đúng profile, kiểm tra đăng nhập rồi tiếp tục cùng job; Windi không dùng selector UI và không tự gửi lại.');
    const references:string[]=[];
    if(uploadFiles.length&&!browser.flowUploadReference)throw new ProviderActionRequired('FLOW_REFERENCE_ADAPTER_REQUIRED','Hãy reload Windi Connect để bật upload ảnh ref.');
    for(const file of uploadFiles){const uploaded=await browser.flowUploadReference!(tabId,{jobId:job.id,file});references.push(uploaded.mediaId);}
    await browser.trackDownload(provider,tabId,job.id);
    store.updateJob(job.id,{status:'submitted',submitted_at:new Date().toISOString(),workspace_url:workspace.url});
    try {await browser.flowDirectGenerate(tabId,{jobId:job.id,prompt:job.prompt,aspect,model:'NARWHAL',references});}
    catch(error){const code=error instanceof Error?error.message:String(error);if(/^FLOW_DIRECT_(?:HTTP_(?:400|401|403|409|429)|SESSION_NOT_READY|CAPTCHA_UNAVAILABLE)$/.test(code))throw new ProviderActionRequired(code,'Phiên API trực tiếp của Flow chưa sẵn sàng. Hãy tải lại tab Flow, kiểm tra đăng nhập rồi tiếp tục cùng job; Windi không dùng selector UI và không tự gửi lại.');throw error;}
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
  await browser.trackDownload(provider,tabId,job.id);
  store.updateJob(job.id,{status:'submitted',submitted_at:new Date().toISOString(),workspace_url:workspace.url});
  await delay(120);
  const postFill=await browser.snapshot(provider,tabId);
  const submit=chooseSubmit(postFill);
  if(submit)await browser.click(provider,tabId,submit.id);
  else await browser.key(provider,tabId,'Enter');
  store.updateJob(job.id,{status:'generating'});
  const deadline=Date.now()+5*60_000;let openedResult=false;
  while(Date.now()<deadline){
    await delay(1_250);snapshot=await browser.snapshot(provider,tabId);if(snapshot.url!==workspace.url){workspace=store.upsertWorkspace(job.project_id,provider,snapshot.url,snapshot.title||null);store.updateJob(job.id,{workspace_url:workspace.url});}problem=userProblem(snapshot);if(problem)throw problem;
    const observed=(await browser.downloads(provider)).find(item=>item.jobId===job.id);if(observed?.state==='complete'&&observed.filename){store.updateJob(job.id,{status:'downloading'});return observed;}if(observed?.state==='interrupted')throw new ProviderActionRequired('DOWNLOAD_NOT_OBSERVED',`Trình duyệt không tải được ảnh gốc${observed.error?`: ${observed.error}`:''}.`);
    const node=downloadNode(snapshot,baseline);if(node&&hasNewResult(snapshot,baseline)){
      store.updateJob(job.id,{status:'downloading'});if(provider==='chatgpt'&&browser.chatgptSaveOriginal)await browser.chatgptSaveOriginal(tabId,{jobId:job.id});else await browser.click(provider,tabId,node);return waitForDownload(browser,provider,job.id);
    }
    const media=newVisualResult(snapshot,baseline);if(media&&!openedResult){await browser.click(provider,tabId,media.id);openedResult=true;}
  }
  throw new ProviderActionRequired('PROVIDER_UI_CHANGED','Provider chưa hiển thị ảnh mới kèm nút tải xuống trong thời gian chờ. Job được giữ lại để bạn xử lý trong tab.');
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
