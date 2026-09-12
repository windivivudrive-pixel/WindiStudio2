import {createDownloadStore} from './download-store.js';
const updateDownloads=createDownloadStore(chrome.storage.local);
import {ReferenceTransfer} from './reference-transfer.js';
import {flowUploadReference} from './flow-adapter.js';
const referenceTransfers=new ReferenceTransfer();
import {reuseWorkspaceTab} from './workspace-tab.js';
import {captureFlowSessionHeaders,flowDirectGenerate,flowDirectStatus,flowRefreshSession,installFlowSessionCapture,isFlowGenerationUrl,parseFlowImages} from './flow-adapter.js';
import {flowRpcOriginal,flowOriginalBlob} from './flow-rpc.js';

const VERSION=2;
const PROVIDERS={flow:{host:'com.windistudio.connect.flow',url:'https://flow.google.com/'},chatgpt:{host:'com.windistudio.connect.chatgpt',url:'https://chatgpt.com/'}};
const owned=new Set();const managedTabs=new Map();const bridges=new Map();const activeDownloads=new Map();const flowTrackedTabs=new Map();const flowResponses=new Map();const flowRequestUrls=new Map();const flowPendingHeaders=new Map();
const allowed=(provider,url)=>{try{const u=new URL(url);return u.protocol==='https:'&&(provider==='chatgpt'?u.hostname==='chatgpt.com':u.hostname==='flow.google.com'||u.hostname==='labs.google'&&/^\/fx\/(?:[^/]+\/)?tools\/flow(?:\/|$)/.test(u.pathname));}catch{return false;}};
async function rememberManagedTab(provider,tab){managedTabs.set(tab.id,provider);const {managed={}}=await chrome.storage.session.get('managed');managed[tab.id]=provider;await chrome.storage.session.set({managed});return tab;}
async function waitForProviderTab(provider,tabId){for(let attempt=0;attempt<120;attempt++){const tab=await chrome.tabs.get(tabId);if(allowed(provider,tab.url||'')&&tab.status==='complete')return tab;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('PROVIDER_TAB_DID_NOT_LOAD');}
async function createManagedTab(provider,url=PROVIDERS[provider].url){const created=await reuseWorkspaceTab(chrome.tabs,url);await rememberManagedTab(provider,created);return waitForProviderTab(provider,created.id);}
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
    bridge.queue=bridge.queue.then(async()=>{await patchStatus(provider,{operation:message.op,tabId:message.args?.tabId??null});try{const result=await execute(provider,message.op,message.args);if(bridge.port===current)current.postMessage({type:'reply',version:VERSION,id:message.id,result});}catch(error){if(bridge.port===current)current.postMessage({type:'reply',version:VERSION,id:message.id,error:error.message});await patchStatus(provider,{error:error.message});}finally{await patchStatus(provider,{operation:null});}});
  });
  current.postMessage({type:'hello',version:VERSION,profile:`${profile}:${provider}`,reset:pairReset[provider]===true});
}
async function ownedTab(provider,tabId){const {managed={}}=await chrome.storage.session.get('managed');const tab=await chrome.tabs.get(tabId);if(managedTabs.get(tabId)!==provider&&managed[tabId]!==provider||!allowed(provider,tab.url))throw new Error('TAB_NOT_OWNED_OR_WRONG_PROVIDER');managedTabs.set(tabId,provider);return tab;}
async function cdp(provider,tabId,method,params={}){await ownedTab(provider,tabId);if(!owned.has(tabId)){await chrome.debugger.attach({tabId},'1.3');owned.add(tabId);}return chrome.debugger.sendCommand({tabId},method,params);}
chrome.debugger.onDetach.addListener(source=>owned.delete(source.tabId));
async function evaluate(provider,tabId,fn,arg){const result=await cdp(provider,tabId,'Runtime.evaluate',{expression:`(${fn.toString()})(${JSON.stringify(arg??null)})`,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||'PAGE_OPERATION_FAILED');return result.result.value;}
async function rememberDownload(provider,jobId,id,source){const [item]=await chrome.downloads.search({id});await updateDownloads(downloads=>{const current=downloads.find(record=>record.id===id);const record={...(current||{}),id,jobId,provider,source,referrer:item?.referrer,startTime:item?.startTime,filename:item?.filename,state:item?.state,bytes:item?.totalBytes,mime:item?.mime};if(current)Object.assign(current,record);else downloads.push(record);});return id;}
async function downloadOriginal(provider,jobId,url,source='provider-response'){if(typeof url!=='string'||!(/^https:\/\//.test(url)||provider==='flow'&&url.startsWith('blob:https://flow.google.com/')))throw new Error('INVALID_ORIGINAL_URL');if(!/^[a-zA-Z0-9_-]+$/.test(jobId))throw new Error('INVALID_JOB_ID');const id=await chrome.downloads.download({url,filename:`WindiConnect/${jobId}/original.png`,saveAs:false,conflictAction:'uniquify'});await rememberDownload(provider,jobId,id,source);return id;}
async function trustedClick(provider,tabId,point){await cdp(provider,tabId,'Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});await cdp(provider,tabId,'Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x,y:point.y,button:'left',clickCount:1});}
async function chatgptSaveOriginal(tabId,jobId){
  if(!jobId)throw new Error('JOB_ID_REQUIRED');activeDownloads.set('chatgpt',jobId);
  const before=new Set((await chrome.downloads.search({limit:100,orderBy:['-startTime']})).map(item=>item.id));
  const pointForSave=()=>evaluate('chatgpt',tabId,()=>{const visible=el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&!el.disabled;};const target=[...document.querySelectorAll('button,[role="button"]')].filter(visible).find(el=>/^(save|lưu)$/i.test(`${el.getAttribute('aria-label')||''} ${el.innerText||''}`.trim()));if(!target)return null;target.scrollIntoView({block:'center',inline:'center'});const r=target.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
  let save=null;for(let attempt=0;attempt<60&&!save;attempt++){save=await pointForSave();if(!save)await new Promise(resolve=>setTimeout(resolve,150));}
  if(!save)throw new Error('CHATGPT_SAVE_NOT_FOUND');await trustedClick('chatgpt',tabId,save);
  for(let attempt=0;attempt<80;attempt++){await new Promise(resolve=>setTimeout(resolve,150));const items=await chrome.downloads.search({limit:100,orderBy:['-startTime']});const fresh=items.filter(item=>!before.has(item.id));const strong=fresh.find(item=>/^ChatGPT Image/i.test(item.filename||'')||/(?:chatgpt|openai|oaiusercontent)\./i.test(`${item.url||''} ${item.finalUrl||''} ${item.referrer||''}`));const image=strong||fresh.find(item=>(item.mime||'').startsWith('image/')||/\.(?:png|jpe?g|webp|avif)$/i.test(item.filename||''));if(image){await rememberDownload('chatgpt',jobId,image.id,'chatgpt-image-save');return {downloadId:image.id};}}
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
  if(op==='open'){if(!allowed(provider,args.url))throw new Error('INVALID_PROVIDER_URL');const tab=await createManagedTab(provider,args.url);return {tabId:tab.id,url:tab.url||args.url};}
  if(op==='downloads')return updateDownloads(async downloads=>{const records=downloads.filter(item=>item.provider===provider);await Promise.all(records.map(async record=>{const [item]=await chrome.downloads.search({id:record.id});if(item)Object.assign(record,{filename:item.filename,state:item.state,bytes:item.totalBytes,mime:item.mime,endTime:item.endTime,error:item.error});}));return records;});
  if(op==='trackDownload'){const tabId=Number(args.tabId);await ownedTab(provider,tabId);const jobId=String(args.jobId||'');if(!jobId)throw new Error('JOB_ID_REQUIRED');await updateDownloads(downloads=>{for(let i=downloads.length-1;i>=0;i--)if(downloads[i].provider===provider&&downloads[i].jobId===jobId)downloads.splice(i,1);});activeDownloads.set(provider,jobId);if(provider==='flow'){flowTrackedTabs.set(tabId,jobId);await cdp(provider,tabId,'Network.enable');}return {tracking:true};}
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
    if(!stored||stored.workspaceUrl!==tab.url)throw new Error('DOWNLOAD_RESULT_UNCLEAR');
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
  if(op==='snapshot')return evaluate(provider,tabId,()=>{const prefix=Math.random().toString(36).slice(2,10);document.querySelectorAll('[data-windi-node]').forEach(el=>el.removeAttribute('data-windi-node'));const nodes=[...document.querySelectorAll('button,a,input,textarea,select,[role="button"],[role="option"],[role="tab"],[role="menuitem"],[role="textbox"],[contenteditable="true"],img,video,canvas,[role="img"]')];const controls=nodes.filter(el=>el.getBoundingClientRect().width>0||el.matches('input[type="file"]')).map((el,i)=>{const id=`${prefix}-${i}`;el.setAttribute('data-windi-node',id);return {id,tag:el.tagName,role:el.getAttribute('role'),type:el.getAttribute('type'),label:el.getAttribute('aria-label')||el.getAttribute('alt'),text:(el.innerText||'').slice(0,180),placeholder:el.getAttribute('placeholder'),disabled:!!el.disabled,contentEditable:el.isContentEditable,accept:el.getAttribute('accept'),multiple:el.multiple,href:el.getAttribute('href'),src:el.currentSrc||el.src||null,naturalWidth:el.naturalWidth||el.videoWidth||el.width||null,naturalHeight:el.naturalHeight||el.videoHeight||el.height||null};});const media=[...document.querySelectorAll('img,video,canvas,[role="img"]')].filter(el=>el.getBoundingClientRect().width>0).map(el=>{const container=el.closest('article,[role="article"],[data-message-author-role],li')||el.parentElement||el;const actions=[...container.querySelectorAll('[data-windi-node]')];const download=actions.find(action=>/download|tải xuống|lưu ảnh|save image/i.test(`${action.getAttribute('aria-label')||''} ${action.innerText||''}`));return {id:el.getAttribute('data-windi-node'),src:el.currentSrc||el.src||null,width:el.naturalWidth||el.videoWidth||el.width||null,height:el.naturalHeight||el.videoHeight||el.height||null,nearbyText:(container.innerText||'').slice(0,500),downloadNode:download?.getAttribute('data-windi-node')||null};});return {url:location.href,title:document.title,text:(document.body?.innerText||'').slice(-18000),controls,media};});
  if(!/^[a-z0-9]+-\d+$/.test(args.node||'')&&op!=='key')throw new Error('OBSERVED_NODE_REQUIRED');
  if(op==='click'){const point=await evaluate(provider,tabId,node=>{const el=document.querySelector(`[data-windi-node="${node}"]`);if(!el||el.disabled)throw new Error('STALE_OR_DISABLED_NODE');el.scrollIntoView({block:'center',inline:'center'});const rect=el.getBoundingClientRect();if(rect.width<=0||rect.height<=0)throw new Error('NODE_NOT_VISIBLE');return {x:rect.left+rect.width/2,y:rect.top+rect.height/2};},args.node);await trustedClick(provider,tabId,point);return {clicked:true};}
  if(op==='fill'){await evaluate(provider,tabId,node=>{const el=document.querySelector(`[data-windi-node="${node}"]`);if(!el||!(el.isContentEditable||el.matches('textarea,input:not([type="file"])')))throw new Error('NOT_EDITABLE');el.focus();if(el.isContentEditable){const range=document.createRange();range.selectNodeContents(el);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);}else el.select();},args.node);if(typeof args.text!=='string'||args.text.length>24000)throw new Error('INVALID_TEXT');await cdp(provider,tabId,'Input.insertText',{text:args.text});return {filled:true};}
  if(op==='key'){if(!['Enter','Escape','Tab'].includes(args.key))throw new Error('INVALID_KEY');await cdp(provider,tabId,'Input.dispatchKeyEvent',{type:'keyDown',key:args.key,code:args.key,windowsVirtualKeyCode:{Enter:13,Escape:27,Tab:9}[args.key]});await cdp(provider,tabId,'Input.dispatchKeyEvent',{type:'keyUp',key:args.key,code:args.key});return {sent:true};}
  if(op==='upload'){const doc=await cdp(provider,tabId,'DOM.getDocument');const found=await cdp(provider,tabId,'DOM.querySelector',{nodeId:doc.root.nodeId,selector:`input[type="file"][data-windi-node="${args.node}"]`});if(!found.nodeId)throw new Error('FILE_INPUT_NOT_FOUND');await cdp(provider,tabId,'DOM.setFileInputFiles',{nodeId:found.nodeId,files:args.files});return {uploaded:true};}
  throw new Error('UNSUPPORTED_OPERATION');
}
chrome.downloads.onCreated.addListener(async item=>{const provider=Object.keys(PROVIDERS).find(name=>allowed(name,item.referrer||''));if(!provider||provider==='flow')return;const jobId=activeDownloads.get(provider);if(!jobId)return;await rememberDownload(provider,jobId,item.id,'provider-ui-download');});
chrome.downloads.onChanged.addListener(delta=>{void updateDownloads(async downloads=>{const record=downloads.find(item=>item.id===delta.id);if(!record)return;const [item]=await chrome.downloads.search({id:delta.id});if(item)Object.assign(record,{filename:item.filename,state:item.state,bytes:item.totalBytes,mime:item.mime});});});
chrome.alarms.create('connect',{periodInMinutes:0.5});chrome.alarms.onAlarm.addListener(()=>Object.keys(PROVIDERS).forEach(provider=>void connect(provider)));
chrome.runtime.onMessage.addListener((message,_sender,reply)=>{const provider=message.provider;if(!(provider in PROVIDERS))return false;if(message.type==='reconnect'){const bridge=bridges.get(provider);if(bridge?.port){bridge.port.disconnect();bridge.port=null;}void connect(provider).then(()=>reply({ok:true}));return true;}if(message.type==='openStatusTab'){void chrome.storage.local.get('combinedStatus').then(async({combinedStatus={}})=>{const tabId=combinedStatus[provider]?.tabId;if(tabId){try{const tab=await chrome.tabs.update(tabId,{active:true});await rememberManagedTab(provider,tab);return;}catch{await patchStatus(provider,{tabId:null});}}await createManagedTab(provider);}).catch(error=>patchStatus(provider,{error:error.message}));return false;}if(message.type==='resetPairing'){void chrome.storage.local.get('pairReset').then(async({pairReset={}})=>{pairReset[provider]=true;await chrome.storage.local.set({pairReset});const bridge=bridges.get(provider);if(bridge?.port){bridge.port.disconnect();bridge.port=null;}await connect(provider);reply({ok:true});});return true;}return false;});
for(const provider of Object.keys(PROVIDERS))void connect(provider);
