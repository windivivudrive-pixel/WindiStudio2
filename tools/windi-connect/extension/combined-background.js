import {flowUiSubmit,flowUiResult,flowUiAttachReferences} from './flow-ui.js';
import {withFlowBackground} from './flow-background.js';
import {ensureFlowWorkspace} from './workspace-bootstrap.js';
import {providerAlerts} from './provider-alerts.js';
import {handleGrokMessage} from './grok-background.js';
import {createDownloadStore} from './download-store.js';
const updateDownloads=createDownloadStore(chrome.storage.local);
import {ReferenceTransfer} from './reference-transfer.js';
import {flowUploadReference} from './flow-adapter.js';
const referenceTransfers=new ReferenceTransfer();
import {sameWorkspace,sameFlowProject,reuseWorkspaceTab,waitForWorkspaceTab} from './workspace-tab.js';
import {captureFlowSessionHeaders,flowDirectGenerate,flowDirectStatus,flowRefreshSession,installFlowSessionCapture,isFlowGenerationUrl,parseFlowImages} from './flow-adapter.js';
import {flowRpcOriginal,flowOriginalBlob} from './flow-rpc.js';

const VERSION=2;
const PROVIDERS={flow:{host:'com.windistudio.connect.flow',url:'https://flow.google.com/'},chatgpt:{host:'com.windistudio.connect.chatgpt',url:'https://chatgpt.com/'}};
const owned=new Set();const managedTabs=new Map();const bridges=new Map();const activeDownloads=new Map();const flowTrackedTabs=new Map();const flowResponses=new Map();const flowRequestUrls=new Map();const flowPendingHeaders=new Map();
const flowFocusEvents=[],flowWindowEvents=[];let flowOperation=null;
const recordWindow=event=>{flowWindowEvents.push({...event,at:Date.now(),operation:flowOperation});if(flowWindowEvents.length>40)flowWindowEvents.shift();};
chrome.windows.onBoundsChanged.addListener(window=>{if(window.type==='normal')recordWindow({id:window.id,state:window.state,focused:window.focused,event:'bounds'});});
chrome.windows.onFocusChanged.addListener(windowId=>{flowFocusEvents.push({windowId,at:Date.now(),operation:flowOperation});if(flowFocusEvents.length>40)flowFocusEvents.shift();});
const allowed=(provider,url)=>{try{const u=new URL(url);return u.protocol==='https:'&&(provider==='chatgpt'?u.hostname==='chatgpt.com':u.hostname==='flow.google.com'||u.hostname==='labs.google'&&/^\/fx\/(?:[^/]+\/)?tools\/flow(?:\/|$)/.test(u.pathname));}catch{return false;}};
async function rememberManagedTab(provider,tab){managedTabs.set(tab.id,provider);const {managed={}}=await chrome.storage.session.get('managed');managed[tab.id]=provider;await chrome.storage.session.set({managed});return tab;}
async function waitForProviderTab(provider,tabId){return waitForWorkspaceTab(chrome.tabs,tabId,url=>allowed(provider,url));}
async function createManagedTab(provider,url=PROVIDERS[provider].url){
  if(provider==='flow'){
    const {flowWindowId}=await chrome.storage.session.get('flowWindowId');
    if(flowWindowId){
      try{
        const window=await chrome.windows.get(flowWindowId,{populate:true});
        const {managed={}}=await chrome.storage.session.get('managed');
        const ownedTabs=window.tabs?.filter(tab=>managed[tab.id]==='flow')||[];
        if(ownedTabs.length){
          const match=ownedTabs.find(tab=>sameWorkspace(tab.url||tab.pendingUrl,url)||sameFlowProject(tab.url||tab.pendingUrl,url));
          const tab=match||await chrome.tabs.create({windowId:window.id,url,active:true});
          if(match&&!sameWorkspace(tab.url||tab.pendingUrl,url))await chrome.tabs.update(tab.id,{url});
          if(!tab.active)await chrome.tabs.update(tab.id,{active:true});
          await rememberManagedTab(provider,tab);
          return waitForProviderTab(provider,tab.id);
        }
      }catch{}
    }
    const window=await chrome.windows.create({url,focused:false,type:'normal',state:'minimized'});
    // Chromium variants may ignore minimized at creation. Apply it explicitly
    // without requesting focus, and never minimize a window opened by the user.
    const minimized=await chrome.windows.update(window.id,{state:'minimized'});
    recordWindow({id:window.id,state:minimized.state,focused:minimized.focused,event:'windi-minimized'});
    const tab=window.tabs?.[0];if(!tab?.id)throw new Error('FLOW_WINDOW_TAB_NOT_FOUND');
    await chrome.storage.session.set({flowWindowId:window.id});
    await rememberManagedTab(provider,tab);
    return waitForProviderTab(provider,tab.id);
  }
  const created=await reuseWorkspaceTab(chrome.tabs,url);await rememberManagedTab(provider,created);return waitForProviderTab(provider,created.id);
}
async function patchStatus(provider,patch){const {combinedStatus={}}=await chrome.storage.local.get('combinedStatus');combinedStatus[provider]={...(combinedStatus[provider]||{}),...patch,provider};await chrome.storage.local.set({combinedStatus});}
installFlowSessionCapture(flowAdapter=>patchStatus('flow',{flowAdapter}));
async function installation(){let {installation}=await chrome.storage.local.get('installation');if(!installation){installation=crypto.randomUUID();await chrome.storage.local.set({installation});}return installation;}
function connect(provider){const prior=bridges.get(provider);if(prior?.connecting)return prior.connecting;const bridge=prior||{port:null,connecting:null,queue:Promise.resolve()};bridges.set(provider,bridge);bridge.connecting=connectOnce(provider,bridge).catch(error=>patchStatus(provider,{connected:false,error:error.message})).finally(()=>{bridge.connecting=null;});return bridge.connecting;}
async function connectOnce(provider,bridge){
  if(bridge.port)return;const profile=await installation();const {pairReset={}}=await chrome.storage.local.get('pairReset');await patchStatus(provider,{connected:false,error:'Đang kết nối…'});
  const current=chrome.runtime.connectNative(PROVIDERS[provider].host);bridge.port=current;
  current.onDisconnect.addListener(()=>{const error=chrome.runtime.lastError?.message||'Mất kết nối backend';if(bridge.port!==current)return;bridge.port=null;void patchStatus(provider,{connected:false,error});});
  current.onMessage.addListener(message=>{
    if(message.type==='connected'){void patchStatus(provider,{connected:true,error:null});return;}
    if(message.type==='status'){void patchStatus(provider,{...(message.status||{}),connected:true,error:null});return;}
    if(message.error&&!message.op){void patchStatus(provider,{connected:false,error:message.error});return;}
    if(message.type!=='command'||message.version!==VERSION)return;
    bridge.queue=bridge.queue.then(async()=>{if(provider==='flow')flowOperation=message.op;await patchStatus(provider,{operation:message.op,tabId:message.args?.tabId??null});try{const result=await execute(provider,message.op,message.args);if(bridge.port===current)current.postMessage({type:'reply',version:VERSION,id:message.id,result});}catch(error){if(bridge.port===current)current.postMessage({type:'reply',version:VERSION,id:message.id,error:error.message});await patchStatus(provider,{error:error.message});}finally{if(provider==='flow')flowOperation=null;await patchStatus(provider,{operation:null});}});
  });
  current.postMessage({type:'hello',version:VERSION,profile:`${profile}:${provider}`,reset:pairReset[provider]===true});
}
async function ownedTab(provider,tabId){const tab=await chrome.tabs.get(tabId);if(!tab||!allowed(provider,tab.url))throw new Error('TAB_NOT_OWNED_OR_WRONG_PROVIDER');if(provider==='chatgpt'){try{await chrome.tabs.update(tabId,{active:true});}catch{}if(tab.windowId){try{await chrome.windows.update(tab.windowId,{focused:true});}catch{}}}managedTabs.set(tabId,provider);return tab;}
async function cdp(provider,tabId,method,params={}){await ownedTab(provider,tabId);if(!owned.has(tabId)){try{await chrome.debugger.attach({tabId},'1.3');}catch(e){if(!e?.message?.includes('already attached'))throw e;}owned.add(tabId);}return chrome.debugger.sendCommand({tabId},method,params);}
chrome.debugger.onDetach.addListener(source=>owned.delete(source.tabId));
async function evaluate(provider,tabId,fn,arg){
  if(chrome.scripting?.executeScript){
    try{
      const results=await chrome.scripting.executeScript({target:{tabId},func:fn,args:arg!==undefined?[arg]:[],world:'MAIN'});
      return results?.[0]?.result;
    }catch(err){
      if(provider==='flow')throw err;
    }
  }
  const result=await cdp(provider,tabId,'Runtime.evaluate',{expression:`(${fn.toString()})(${JSON.stringify(arg??null)})`,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||'PAGE_OPERATION_FAILED');
  return result.result.value;
}
async function rememberDownload(provider,jobId,id,source){const [item]=await chrome.downloads.search({id});await updateDownloads(downloads=>{const current=downloads.find(record=>record.id===id);const record={...(current||{}),id,jobId,provider,source,referrer:item?.referrer,startTime:item?.startTime,filename:item?.filename,state:item?.state,bytes:item?.totalBytes,mime:item?.mime};if(current)Object.assign(current,record);else downloads.push(record);});return id;}
async function downloadOriginal(provider,jobId,url,source='provider-response'){if(typeof url!=='string'||!(/^https:\/\//.test(url)||provider==='flow'&&url.startsWith('blob:https://flow.google.com/')))throw new Error('INVALID_ORIGINAL_URL');if(!/^[a-zA-Z0-9_-]+$/.test(jobId))throw new Error('INVALID_JOB_ID');const id=await chrome.downloads.download({url,filename:`WindiConnect/${jobId}/original.png`,saveAs:false,conflictAction:'uniquify'});await rememberDownload(provider,jobId,id,source);return id;}
async function trustedClick(provider,tabId,point){await cdp(provider,tabId,'Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x,y:point.y,buttons:0});await new Promise(resolve=>setTimeout(resolve,350));await cdp(provider,tabId,'Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',buttons:1,clickCount:1});await new Promise(resolve=>setTimeout(resolve,120));await cdp(provider,tabId,'Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x,y:point.y,button:'left',buttons:0,clickCount:1});await new Promise(resolve=>setTimeout(resolve,400));}
async function chatgptSaveOriginal(tabId,jobId){
  if(!jobId)throw new Error('JOB_ID_REQUIRED');activeDownloads.set('chatgpt',jobId);
  const before=new Set((await chrome.downloads.search({limit:100,orderBy:['-startTime']})).map(item=>item.id));
  const imageInfo=await evaluate('chatgpt',tabId,()=>{
    const imgs=[...document.querySelectorAll('img')].filter(el=>{
      const r=el.getBoundingClientRect();
      return (r.width>=128&&r.height>=128)||(el.naturalWidth>=128&&el.naturalHeight>=128);
    });
    const target=imgs.filter(img=>{
      const s=img.currentSrc||img.src||'';
      return s.includes('backend-api/estuary')||s.includes('oaiusercontent')||s.includes('dalle');
    }).at(-1)||imgs.filter(img=>!/avatar|auth0|google/i.test(img.src||'')).at(-1);
    return target?(target.currentSrc||target.src):null;
  });
  if(imageInfo&&/^https?:\/\//.test(imageInfo)){
    const id=await chrome.downloads.download({url:imageInfo,filename:`WindiConnect/${jobId}/original.png`,saveAs:false,conflictAction:'uniquify'});
    await rememberDownload('chatgpt',jobId,id,'chatgpt-image-save');
    return {downloadId:id};
  }
  const pointForSave=()=>evaluate('chatgpt',tabId,()=>{
    const visible=el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&!el.disabled;};
    const target=[...document.querySelectorAll('button,[role="button"],a[download]')].filter(visible).filter(el=>!/(download apps|tải ứng dụng)/i.test(`${el.getAttribute('aria-label')||''} ${el.innerText||''} ${el.title||''}`)).find(el=>/(save|lưu|download|tải)/i.test(`${el.getAttribute('aria-label')||''} ${el.innerText||''} ${el.title||''}`.trim()));
    if(!target)return null;
    target.scrollIntoView({block:'center',inline:'center'});
    const r=target.getBoundingClientRect();
    return {x:r.left+r.width/2,y:r.top+r.height/2};
  });
  let save=null;for(let attempt=0;attempt<60&&!save;attempt++){save=await pointForSave();if(!save)await new Promise(resolve=>setTimeout(resolve,150));}
  if(save){
    await trustedClick('chatgpt',tabId,save);
    for(let attempt=0;attempt<80;attempt++){
      await new Promise(resolve=>setTimeout(resolve,150));
      const items=await chrome.downloads.search({limit:100,orderBy:['-startTime']});
      const fresh=items.filter(item=>!before.has(item.id));
      const strong=fresh.find(item=>/^ChatGPT Image/i.test(item.filename||'')||/(?:chatgpt|openai|oaiusercontent)\./i.test(`${item.url||''} ${item.finalUrl||''} ${item.referrer||''}`));
      const image=strong||fresh.find(item=>(item.mime||'').startsWith('image/')||/\.(?:png|jpe?g|webp|avif)$/i.test(item.filename||''));
      if(image){await rememberDownload('chatgpt',jobId,image.id,'chatgpt-image-save');return {downloadId:image.id};}
    }
  }
  if(!save)throw new Error('CHATGPT_SAVE_NOT_FOUND');
  throw new Error('CHATGPT_DOWNLOAD_NOT_STARTED');
}
chrome.debugger.onEvent.addListener((source,method,params)=>{
  const tabId=source.tabId;if(!tabId||managedTabs.get(tabId)!=='flow')return;
  if(method==='Network.requestWillBeSent'){
    const url=params?.request?.url||'',key=`${tabId}:${params.requestId}`;flowRequestUrls.set(key,url);captureFlowSessionHeaders(url,params?.request?.headers||{});const pendingHeaders=flowPendingHeaders.get(key);if(pendingHeaders){captureFlowSessionHeaders(url,pendingHeaders);flowPendingHeaders.delete(key);}
  }
  if(method==='Network.requestWillBeSentExtraInfo'){
    const key=`${tabId}:${params.requestId}`,url=flowRequestUrls.get(key);if(url)captureFlowSessionHeaders(url,params?.headers||{});else flowPendingHeaders.set(key,params?.headers||{});
  }
  if(!flowTrackedTabs.has(tabId))return;
  if(method==='Network.responseReceived'&&isFlowGenerationUrl(params?.response?.url||'')){flowResponses.set(`${tabId}:${params.requestId}`,{tabId,requestId:params.requestId,jobId:flowTrackedTabs.get(tabId)});return;}
  if(method!=='Network.loadingFinished')return;const key=`${tabId}:${params.requestId}`;const pending=flowResponses.get(key);if(!pending)return;flowResponses.delete(key);
  void chrome.debugger.sendCommand({tabId},'Network.getResponseBody',{requestId:pending.requestId}).then(async body=>{const raw=body.base64Encoded?atob(body.body):body.body;const urls=parseFlowImages(JSON.parse(raw));if(urls[0])await downloadOriginal('flow',pending.jobId,urls[0],'flow-api-response');}).catch(error=>patchStatus('flow',{error:`FLOW_ORIGINAL_CAPTURE_FAILED: ${error.message}`}));
});
async function execute(provider,op,args={}){
  if(provider==='flow'&&op==='flowResetSubmission'){
    const key=`flowUiJob:${String(args.jobId||'')}`;
    const stored=(await chrome.storage.local.get(key))[key];
    if(stored&&stored.workspaceUrl!==args.workspaceUrl)throw new Error('DOWNLOAD_RESULT_UNCLEAR');
    await chrome.storage.local.remove(key);return {reset:true};
  }
  if(provider==='flow'&&op==='flowUiInspect'){
    const tabId=Number(args.tabId);await ownedTab('flow',tabId);
    const tab=await chrome.tabs.get(tabId);const window=await chrome.windows.get(tab.windowId);
    const page=await evaluate('flow',tabId,()=>({url:location.href,visibility:document.visibilityState,documentFocused:document.hasFocus(),promptInfo:{text:document.querySelector('.ProseMirror')?.innerText,html:document.querySelector('.ProseMirror')?.parentElement?.outerHTML?.slice(0,12000)},pageText:(document.body?.innerText||'').slice(-2500),controls:[...document.querySelectorAll('button,[role="radio"],[role="option"],[role="menuitem"],input[type="file"],img')].map(el=>({tag:el.tagName,role:el.getAttribute('role'),label:el.getAttribute('aria-label'),text:(el.innerText||'').slice(0,100),alt:el.getAttribute('alt'),selected:el.getAttribute('aria-checked'),disabled:el.disabled,accept:el.getAttribute('accept')}))}));
    return {...page,window:{id:window.id,focused:window.focused,state:window.state},focusEvents:[...flowFocusEvents],windowEvents:[...flowWindowEvents],extensionVersion:chrome.runtime.getManifest().version};
  }
  if(op==='reloadExtension'){setTimeout(()=>chrome.runtime.reload(),100);return {reloaded:true};}
  if(provider==='flow'&&op==='flowEnsureWorkspace')return ensureFlowWorkspace({projectId:args.projectId,storage:chrome.storage.local,tabs:chrome.tabs,open:(url)=>createManagedTab('flow',url),adopt:(tab)=>rememberManagedTab('flow',tab),evaluate:(id,fn)=>withFlowBackground({tabId:id,cdp},()=>evaluate('flow',id,fn)),click:(id,point)=>withFlowBackground({tabId:id,cdp},()=>trustedClick('flow',id,point))});
  if(provider==='flow'&&op==='flowUiAttachReferences'){
    await ownedTab('flow',Number(args.tabId));
    return withFlowBackground({tabId:Number(args.tabId),cdp},()=>flowUiAttachReferences({tabId:Number(args.tabId),files:args.files,evaluate,cdp}));
  }
  if(provider==='flow'&&op==='flowBackgroundSubmit'){
    await ownedTab('flow',Number(args.tabId));
    const tabId=Number(args.tabId);
    return withFlowBackground({tabId,cdp},()=>flowUiSubmit({...args,tabId,storage:chrome.storage.local,evaluate,cdp,click:point=>trustedClick('flow',tabId,point)}));
  }
  if(provider==='flow'&&op==='flowBackgroundResult'){
    await ownedTab('flow',Number(args.tabId));
    return withFlowBackground({tabId:Number(args.tabId),cdp},()=>flowUiResult({...args,tabId:Number(args.tabId),storage:chrome.storage.local,evaluate,downloads:chrome.downloads,remember:(id)=>rememberDownload('flow',args.jobId,id,'flow-background-ui')}));
  }
  if(op==='open'){if(!allowed(provider,args.url))throw new Error('INVALID_PROVIDER_URL');const tab=await createManagedTab(provider,args.url);return {tabId:tab.id,url:tab.url||args.url};}
  if(op==='downloads')return updateDownloads(async downloads=>{const records=downloads.filter(item=>item.provider===provider);await Promise.all(records.map(async record=>{const [item]=await chrome.downloads.search({id:record.id});if(item)Object.assign(record,{filename:item.filename,state:item.state,bytes:item.totalBytes,mime:item.mime,endTime:item.endTime,error:item.error});}));return records;});
  if(provider==='flow'&&['snapshot','click','fill','key','upload'].includes(op))throw new Error('FLOW_RPC_ONLY');
  if(op==='trackDownload'){const tabId=Number(args.tabId);await ownedTab(provider,tabId);const jobId=String(args.jobId||'');if(!jobId)throw new Error('JOB_ID_REQUIRED');await updateDownloads(downloads=>{for(let i=downloads.length-1;i>=0;i--)if(downloads[i].provider===provider&&downloads[i].jobId===jobId)downloads.splice(i,1);});activeDownloads.set(provider,jobId);return {tracking:true};}
  if(op==='detachDebugger'){const tabId=Number(args.tabId);if(owned.has(tabId)){try{await chrome.debugger.detach({tabId});}catch{}owned.delete(tabId);}return {detached:true};}
  const tabId=Number(args.tabId);await ownedTab(provider,tabId);
  if(provider==='flow'&&['flowReferenceBegin','flowReferenceChunk','flowReferenceFinish'].includes(op)){
    const tab=await chrome.tabs.get(tabId);const workspace=new URL(tab.url);workspace.hash='';
    if(workspace.origin!=='https://flow.google.com')throw new Error('FLOW_REFERENCE_REQUIRES_CURRENT_HOST');
    const key=`${tabId}:${args.jobId}:${args.sha256}`;
    const cacheKey=`flowReference:${workspace.href}:${args.sha256}`;
    if(op==='flowReferenceBegin'){
      referenceTransfers.begin(key,args);
      const cached=(await chrome.storage.local.get(cacheKey))[cacheKey];
      if(cached?.mediaId){referenceTransfers.pending.delete(key);return {mediaId:cached.mediaId};}
      return {ready:true};
    }
    if(op==='flowReferenceChunk'){referenceTransfers.append(key,args.index,args.data);return {received:args.index};}
    const input=await referenceTransfers.finish(key);
    const result=await flowUploadReference({tabId,url:tab.url,base64:input.base64,mime:input.mime,name:input.name,evaluate});
    await chrome.storage.local.set({[cacheKey]:{...result,uploadedAt:new Date().toISOString()}});
    return result;
  }
  if(provider==='flow'&&op==='flowDirectStatus'){const tab=await chrome.tabs.get(tabId);return flowDirectStatus({tabId,url:tab.url||'',evaluate});}
  if(provider==='flow'&&op==='flowRecoverDownload'){
    const jobId=String(args.jobId||'');const key=`flowRpcResult:${jobId}`;
    const stored=(await chrome.storage.local.get(key))[key];const tab=await chrome.tabs.get(tabId);
    if(!stored){const saved=(await chrome.storage.local.get(`flowUiJob:${jobId}`))[`flowUiJob:${jobId}`];if(!saved)throw new Error('DOWNLOAD_RESULT_UNCLEAR');return withFlowBackground({tabId,cdp},()=>flowUiResult({tabId,jobId,prompt:saved.prompt,beforeTiles:saved.beforeTiles,storage:chrome.storage.local,evaluate,downloads:chrome.downloads,remember:id=>rememberDownload('flow',jobId,id,'flow-ui-recovery')}));}
    if(stored.workspaceUrl!==tab.url)throw new Error('DOWNLOAD_RESULT_UNCLEAR');
    const original=flowRpcOriginal(stored.data);
    const blob=await evaluate('flow',tabId,flowOriginalBlob,{url:original.url});
    await updateDownloads(downloads=>{for(let i=downloads.length-1;i>=0;i--)if(downloads[i].provider==='flow'&&downloads[i].jobId===jobId)downloads.splice(i,1);});
    const downloadId=await downloadOriginal('flow',jobId,blob.url,'flow-rpc-recovery');
    return {downloadId,mediaId:original.mediaId};
  }
  if(provider==='flow'&&op==='flowRefreshSession'){const tab=await chrome.tabs.get(tabId);return flowRefreshSession({tabId,url:tab.url||'',evaluate,cdp});}
  if(provider==='flow'&&op==='flowDirectGenerate'){
    const tab=await chrome.tabs.get(tabId);const jobId=String(args.jobId||'');if(!jobId)throw new Error('JOB_ID_REQUIRED');
    activeDownloads.set(provider,jobId);
    // Direct responses have one owner; the passive listener must not download
    // them a second time or assign unrelated browser downloads to this job.
    flowTrackedTabs.delete(tabId);
    return flowDirectGenerate({tabId,url:tab.url||'',prompt:args.prompt,aspect:args.aspect,model:args.model,seed:args.seed,references:args.references||[],evaluate,
      recordResult:async data=>{await chrome.storage.local.set({[`flowRpcResult:${jobId}`]:{jobId,tabId,workspaceUrl:tab.url,data,receivedAt:new Date().toISOString()}});},
      downloadOriginal:url=>downloadOriginal('flow',jobId,url,'flow-direct-api')});
  }
  if(provider==='chatgpt'&&op==='chatgptSaveOriginal')return chatgptSaveOriginal(tabId,String(args.jobId||''));
  if(op==='snapshot'){const alerts=await evaluate(provider,tabId,providerAlerts);const snapshot=await evaluate(provider,tabId,()=>{const prefix=Math.random().toString(36).slice(2,10);document.querySelectorAll('[data-windi-node]').forEach(el=>el.removeAttribute('data-windi-node'));const nodes=[...document.querySelectorAll('button,a,input,textarea,select,[role="button"],[role="option"],[role="tab"],[role="menuitem"],[role="textbox"],[contenteditable],[contenteditable="true"],.ProseMirror,img,video,canvas,[role="img"]')];const controls=nodes.filter(el=>el.getBoundingClientRect().width>0||el.matches('input[type="file"]')).map((el,i)=>{const id=`${prefix}-${i}`;el.setAttribute('data-windi-node',id);return {id,tag:el.tagName,role:el.getAttribute('role'),type:el.getAttribute('type'),label:el.getAttribute('aria-label')||el.getAttribute('alt'),text:(el.innerText||'').slice(0,180),placeholder:el.getAttribute('placeholder'),disabled:!!el.disabled,contentEditable:el.isContentEditable,accept:el.getAttribute('accept'),multiple:el.multiple,href:el.getAttribute('href'),src:el.currentSrc||el.src||null,naturalWidth:el.naturalWidth||el.videoWidth||el.width||null,naturalHeight:el.naturalHeight||el.videoHeight||el.height||null};});const media=[...document.querySelectorAll('img,video,canvas,[role="img"]')].filter(el=>el.getBoundingClientRect().width>0).map(el=>{const container=el.closest('article,[role="article"],[data-message-author-role],li')||el.parentElement||el;const actions=[...container.querySelectorAll('[data-windi-node]')];const download=actions.find(action=>/download|tải xuống|lưu ảnh|save image/i.test(`${action.getAttribute('aria-label')||''} ${action.innerText||''}`));return {id:el.getAttribute('data-windi-node'),src:el.currentSrc||el.src||null,width:el.naturalWidth||el.videoWidth||el.width||null,height:el.naturalHeight||el.videoHeight||el.height||null,nearbyText:(container.innerText||'').slice(0,500),downloadNode:download?.getAttribute('data-windi-node')||null};});const pm=document.querySelector('.ProseMirror')||document.querySelector('[contenteditable="true"]')||document.querySelector('[contenteditable]');const genBtns=[...document.querySelectorAll('button[aria-label="Start generation"],flow-generate-icon-button button')];const genBtn=genBtns.find(b=>b.getBoundingClientRect().width>0)||genBtns[0];const btnHost=genBtn?.closest('flow-generate-icon-button')||document.querySelector('flow-generate-icon-button');const btnRect=genBtn?.getBoundingClientRect();const promptBox=document.querySelector('flow-base-prompt-box');const chips=[...document.querySelectorAll('[role="button"],div')].filter(el=>(el.innerText||'').includes('The fish')).map(el=>({tag:el.tagName,text:el.innerText,html:el.outerHTML.slice(0,250)}));const flowPromptInfo={pmFound:Boolean(pm),pmText:pm?.innerText||'',btnFound:Boolean(genBtn),btnRect:btnRect?{left:btnRect.left,top:btnRect.top,width:btnRect.width,height:btnRect.height}:null,btnDisabled:Boolean(genBtn?.disabled),hostTooltip:btnHost?.getAttribute('mattooltip')||btnHost?.getAttribute('aria-label')||btnHost?.getAttribute('title')||null,btnTooltip:genBtn?.getAttribute('mattooltip')||genBtn?.getAttribute('aria-label')||null,chips,boxText:(promptBox?.innerText||'').slice(0,300),topAtBtn:btnRect?document.elementFromPoint(Math.round(btnRect.left+btnRect.width/2),Math.round(btnRect.top+btnRect.height/2))?.outerHTML?.slice(0,180):null};return {url:location.href,title:document.title,text:(document.body?.innerText||'').slice(-18000),controls,media,flowPromptInfo};});return {...snapshot,alerts};}
  if(!/^[a-z0-9]+-\d+$/.test(args.node||'')&&op!=='key')throw new Error('OBSERVED_NODE_REQUIRED');
  if(op==='click'){
    const target=await evaluate(provider,tabId,node=>{
      const nodeEl=document.querySelector(`[data-windi-node="${node}"]`);
      if(!nodeEl||nodeEl.disabled)return {error:'STALE_OR_DISABLED_NODE'};
      nodeEl.scrollIntoView({block:'center',inline:'center'});
      nodeEl.focus();
      const rect=nodeEl.getBoundingClientRect();
      if(rect.width<=0||rect.height<=0)return {error:'NODE_NOT_VISIBLE'};
      const pt={x:Math.round(rect.left+rect.width/2),y:Math.round(rect.top+rect.height/2)};
      return {point:pt};
    },args.node);
    if(target?.error)throw new Error(target.error);
    if(!target?.point)throw new Error('NODE_TARGET_INVALID');
    await trustedClick(provider,tabId,target.point);
    return {clicked:true};
  }
  if(op==='fill'){
    if(typeof args.text!=='string'||args.text.length>24000)throw new Error('INVALID_TEXT');
    await evaluate(provider,tabId,({node,text})=>{
      const el=document.querySelector(`[data-windi-node="${node}"]`);
      if(!el||!(el.isContentEditable||el.matches('textarea,input:not([type="file"])')))throw new Error('NOT_EDITABLE');
      el.focus();
      if(el.isContentEditable){
        let target=el.querySelector('p')||el;
        const range=document.createRange();
        range.selectNodeContents(target);
        const sel=window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('selectAll',false,null);
        document.execCommand('delete',false,null);
        document.execCommand('insertText',false,text);
      }else{
        el.select();
        document.execCommand('selectAll',false,null);
        document.execCommand('delete',false,null);
        document.execCommand('insertText',false,text);
      }
    },{node:args.node,text:args.text});
    await new Promise(resolve=>setTimeout(resolve,400));
    await cdp(provider,tabId,'Input.dispatchKeyEvent',{type:'keyDown',text:' ',unmodifiedText:' ',key:' ',code:'Space',windowsVirtualKeyCode:32});
    await cdp(provider,tabId,'Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
    await new Promise(resolve=>setTimeout(resolve,100));
    await cdp(provider,tabId,'Input.dispatchKeyEvent',{type:'keyDown',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});
    await cdp(provider,tabId,'Input.dispatchKeyEvent',{type:'keyUp',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});
    await new Promise(resolve=>setTimeout(resolve,350));
    return {filled:true};
  }
  if(op==='key'){
    if(!['Enter','Escape','Tab'].includes(args.key))throw new Error('INVALID_KEY');
    const keyCode={Enter:13,Escape:27,Tab:9}[args.key];
    await evaluate(provider,tabId,key=>{
      const code={Enter:13,Escape:27,Tab:9}[key];
      const active=document.activeElement||document.body;
      const opts={key,code:key,keyCode:code,which:code,bubbles:true,cancelable:true,view:window};
      active.dispatchEvent(new KeyboardEvent('keydown',opts));
      active.dispatchEvent(new KeyboardEvent('keypress',opts));
      active.dispatchEvent(new KeyboardEvent('keyup',opts));
      return true;
    },args.key);
    await cdp(provider,tabId,'Input.dispatchKeyEvent',{type:'keyDown',key:args.key,code:args.key,windowsVirtualKeyCode:keyCode,nativeVirtualKeyCode:keyCode,text:args.key==='Enter'?'\r':undefined,unmodifiedText:args.key==='Enter'?'\r':undefined});
    await new Promise(r=>setTimeout(r,60));
    await cdp(provider,tabId,'Input.dispatchKeyEvent',{type:'keyUp',key:args.key,code:args.key,windowsVirtualKeyCode:keyCode,nativeVirtualKeyCode:keyCode});
    await new Promise(resolve=>setTimeout(resolve,350));
    return {pressed:true};
  }
  if(op==='upload'){const doc=await cdp(provider,tabId,'DOM.getDocument');const found=await cdp(provider,tabId,'DOM.querySelector',{nodeId:doc.root.nodeId,selector:`input[type="file"][data-windi-node="${args.node}"]`});if(!found.nodeId)throw new Error('FILE_INPUT_NOT_FOUND');await cdp(provider,tabId,'DOM.setFileInputFiles',{nodeId:found.nodeId,files:args.files});return {uploaded:true};}
  throw new Error('UNSUPPORTED_OPERATION');
}
chrome.downloads.onCreated.addListener(async item=>{
  let provider=Object.keys(PROVIDERS).find(name=>allowed(name,item.referrer||''));
  if(!provider){
    const u=item.url||'';
    if(u.startsWith('blob:https://flow.google.com')||u.includes('flow.google.com')||u.includes('googleusercontent.com')||u.includes('flow-content.google'))provider='flow';
    else if(u.startsWith('blob:https://chatgpt.com')||u.includes('chatgpt.com')||u.includes('oaiusercontent.com'))provider='chatgpt';
    else if(activeDownloads.has('flow'))provider='flow';
    else if(activeDownloads.has('chatgpt'))provider='chatgpt';
  }
  if(!provider)return;
  const jobId=activeDownloads.get(provider);
  if(!jobId)return;
  await rememberDownload(provider,jobId,item.id,'provider-ui-download');
});
chrome.downloads.onChanged.addListener(delta=>{void updateDownloads(async downloads=>{const record=downloads.find(item=>item.id===delta.id);if(!record)return;const [item]=await chrome.downloads.search({id:delta.id});if(item)Object.assign(record,{filename:item.filename,state:item.state,bytes:item.totalBytes,mime:item.mime});});});
chrome.alarms.create('connect',{periodInMinutes:0.5});chrome.alarms.onAlarm.addListener(()=>Object.keys(PROVIDERS).forEach(provider=>void connect(provider)));
chrome.runtime.onMessage.addListener((message,_sender,reply)=>{if(message.type==='grokAction')return handleGrokMessage(message,reply);const provider=message.provider;if(!(provider in PROVIDERS))return false;if(message.type==='reconnect'){const bridge=bridges.get(provider);if(bridge?.port){bridge.port.disconnect();bridge.port=null;}void connect(provider).then(()=>reply({ok:true}));return true;}if(message.type==='openStatusTab'){void chrome.storage.local.get('combinedStatus').then(async({combinedStatus={}})=>{const tabId=combinedStatus[provider]?.tabId;if(tabId){try{const tab=await chrome.tabs.update(tabId,{active:true});await rememberManagedTab(provider,tab);return;}catch{await patchStatus(provider,{tabId:null});}}await createManagedTab(provider);}).catch(error=>patchStatus(provider,{error:error.message}));return false;}if(message.type==='resetPairing'){void chrome.storage.local.get('pairReset').then(async({pairReset={}})=>{pairReset[provider]=true;await chrome.storage.local.set({pairReset});const bridge=bridges.get(provider);if(bridge?.port){bridge.port.disconnect();bridge.port=null;}await connect(provider);reply({ok:true});});return true;}return false;});
for(const provider of Object.keys(PROVIDERS))void connect(provider);
