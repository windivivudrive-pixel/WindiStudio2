import {PROVIDER,HOST} from './provider.js';

const VERSION=2;
let port=null;
let connecting=null;
let queue=Promise.resolve();
const owned=new Set();
const managedTabs=new Set();
let activeDownloadJob=null;
const allowed=url=>{try{const u=new URL(url);return u.protocol==='https:'&&(PROVIDER==='chatgpt'?u.hostname==='chatgpt.com':u.hostname==='flow.google.com'||u.hostname==='labs.google'&&/^\/fx\/(?:[^/]+\/)?tools\/flow(?:\/|$)/.test(u.pathname));}catch{return false;}};
const state=async patch=>chrome.storage.local.set({status:{...(await chrome.storage.local.get('status')).status,...patch}});
const actionLabels={open:'Mở tab provider',snapshot:'Đọc trạng thái',click:'Thao tác trên web',fill:'Nhập nội dung',key:'Gửi yêu cầu',upload:'Gắn ảnh tham chiếu',downloads:'Kiểm tra file tải'};
async function recordActivity(entry){
  const {activity=[]}=await chrome.storage.local.get('activity');
  await chrome.storage.local.set({activity:[entry,...activity].slice(0,30)});
}
function connect(){
  if(connecting)return connecting;
  connecting=connectOnce().catch(error=>state({connected:false,error:error.message})).finally(()=>{connecting=null;});
  return connecting;
}
async function connectOnce(){
  if(port)return;
  let {installation,pairReset=false}=await chrome.storage.local.get(['installation','pairReset']);
  if(!installation){installation=crypto.randomUUID();await chrome.storage.local.set({installation});}
  await state({connected:false,error:'Đang kết nối…',installation,provider:PROVIDER});
  const current=chrome.runtime.connectNative(HOST);port=current;
  // Register synchronously: Chrome can reject a host before any storage await resolves.
  current.onDisconnect.addListener(()=>{const error=chrome.runtime.lastError?.message||'Mất kết nối backend';if(port!==current)return;port=null;void state({connected:false,error});});
  current.onMessage.addListener(message=>{
    if(message.type==='connected'){void chrome.storage.local.remove('pairReset').then(()=>state({connected:true,error:null,pairReset:false}));return;}
    if(message.type==='status'){void state({...(message.status||{}),connected:true,error:null});return;}
    if(message.error&&!message.op){void state({connected:false,error:message.error});return;}
    if(message.type!=='command'||message.version!==VERSION)return;
    queue=queue.then(async()=>{
      await state({operation:message.op,tabId:message.args?.tabId??null});
      try {const result=await execute(message.op,message.args);if(message.op==='key'&&message.args?.key==='Enter')await recordActivity({kind:'submit',label:actionLabels.key,state:'done',at:new Date().toISOString()});if(port===current)current.postMessage({type:'reply',version:VERSION,id:message.id,result});}
      catch(error){await recordActivity({kind:'bridge',label:actionLabels[message.op]||message.op,state:'failed',error:error.message,at:new Date().toISOString()});if(port===current)current.postMessage({type:'reply',version:VERSION,id:message.id,error:error.message});await state({error:error.message});}
      finally{await state({operation:null});}
    });
  });
  // The daemon sends the first status immediately after accepting hello. Do
  // not race a second status request through Cốc Cốc's native-message startup.
  try{current.postMessage({type:'hello',version:VERSION,profile:installation,reset:pairReset});}
  catch(error){if(port===current)port=null;try{current.disconnect();}catch{}throw error;}
}
async function ownedTab(tabId){
  const {managed={}}=await chrome.storage.session.get('managed');
  const tab=await chrome.tabs.get(tabId);
  if(!managedTabs.has(tabId)&&!managed[tabId]||!allowed(tab.url))throw new Error('TAB_NOT_OWNED_OR_WRONG_PROVIDER');
  managedTabs.add(tabId);
  return tab;
}
async function cdp(tabId,method,params={}){
  await ownedTab(tabId);
  if(!owned.has(tabId)){await chrome.debugger.attach({tabId},'1.3');owned.add(tabId);}
  return chrome.debugger.sendCommand({tabId},method,params);
}
chrome.debugger.onDetach.addListener(source=>owned.delete(source.tabId));
async function evaluate(tabId,fn,arg){
  const result=await cdp(tabId,'Runtime.evaluate',{expression:`(${fn.toString()})(${JSON.stringify(arg??null)})`,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||'PAGE_OPERATION_FAILED');
  return result.result.value;
}
async function execute(op,args={}){
  if(op==='open'){
    if(!allowed(args.url))throw new Error('INVALID_PROVIDER_URL');
    const existing=(await chrome.tabs.query({})).find(tab=>{try{const a=new URL(tab.url||tab.pendingUrl),b=new URL(args.url);return a.origin===b.origin&&a.pathname.replace(/\/$/,'')===b.pathname.replace(/\/$/,'')&&a.search===b.search;}catch{return false;}});
    const tab=existing||await chrome.tabs.create({url:args.url,active:false});managedTabs.add(tab.id);
    const {managed={}}=await chrome.storage.session.get('managed');managed[tab.id]={url:args.url};await chrome.storage.session.set({managed});
    return {tabId:tab.id,url:tab.url||args.url};
  }
  if(op==='downloads'){
    const {downloads=[]}=await chrome.storage.local.get('downloads');
    return downloads;
  }
  if(op==='trackDownload'){
    const tabId=Number(args.tabId);await ownedTab(tabId);
    if(typeof args.jobId!=='string'||!args.jobId)throw new Error('INVALID_JOB_ID');
    activeDownloadJob=args.jobId;return {tracking:true};
  }
  const tabId=Number(args.tabId);await ownedTab(tabId);
  if(op==='snapshot')return evaluate(tabId,()=>{
    const prefix=Math.random().toString(36).slice(2,10);
    document.querySelectorAll('[data-windi-node]').forEach(el=>el.removeAttribute('data-windi-node'));
    const nodes=[...document.querySelectorAll('button,a,input,textarea,select,[role="button"],[role="option"],[role="tab"],[role="menuitem"],[role="textbox"],[contenteditable="true"],img,video,canvas,[role="img"]')];
    const controls=nodes.filter(el=>el.getBoundingClientRect().width>0||el.matches('input[type="file"]')).map((el,i)=>{
      const id=`${prefix}-${i}`;el.setAttribute('data-windi-node',id);
      return {id,tag:el.tagName,role:el.getAttribute('role'),type:el.getAttribute('type'),label:el.getAttribute('aria-label')||el.getAttribute('alt'),text:(el.innerText||'').slice(0,180),placeholder:el.getAttribute('placeholder'),disabled:!!el.disabled,accept:el.getAttribute('accept'),multiple:el.multiple,href:el.getAttribute('href'),src:el.currentSrc||el.src||null,naturalWidth:el.naturalWidth||el.videoWidth||el.width||null,naturalHeight:el.naturalHeight||el.videoHeight||el.height||null};
    });
    const media=[...document.querySelectorAll('img,video,canvas,[role="img"]')].filter(el=>el.getBoundingClientRect().width>0).map(el=>{
      const container=el.closest('article,[role="article"],[data-message-author-role],li')||el.parentElement||el;
      const actions=[...container.querySelectorAll('[data-windi-node]')];
      const download=actions.find(action=>/download|tải xuống|lưu ảnh|save image/i.test(`${action.getAttribute('aria-label')||''} ${action.innerText||''}`));
      return {id:el.getAttribute('data-windi-node'),src:el.currentSrc||el.src||null,width:el.naturalWidth||el.videoWidth||el.width||null,height:el.naturalHeight||el.videoHeight||el.height||null,nearbyText:(container.innerText||'').slice(0,500),downloadNode:download?.getAttribute('data-windi-node')||null};
    });
    return {url:location.href,title:document.title,text:document.body.innerText.slice(-18000),controls,media};
  });
  if(!/^[a-z0-9]+-\d+$/.test(args.node||'')&&op!=='key')throw new Error('OBSERVED_NODE_REQUIRED');
  if(op==='click')return evaluate(tabId,node=>{const el=document.querySelector(`[data-windi-node="${node}"]`);if(!el||el.disabled)throw new Error('STALE_OR_DISABLED_NODE');el.click();return {clicked:true};},args.node);
  if(op==='fill'){
    await evaluate(tabId,node=>{const el=document.querySelector(`[data-windi-node="${node}"]`);if(!el||!(el.isContentEditable||el.matches('textarea,input:not([type="file"])')))throw new Error('NOT_EDITABLE');el.focus();if(el.isContentEditable){const range=document.createRange();range.selectNodeContents(el);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);}else el.select();},args.node);
    if(typeof args.text!=='string'||args.text.length>24000)throw new Error('INVALID_TEXT');
    await cdp(tabId,'Input.insertText',{text:args.text});return {filled:true};
  }
  if(op==='key'){
    if(!['Enter','Escape','Tab'].includes(args.key))throw new Error('INVALID_KEY');
    await cdp(tabId,'Input.dispatchKeyEvent',{type:'keyDown',key:args.key,code:args.key,windowsVirtualKeyCode:{Enter:13,Escape:27,Tab:9}[args.key]});
    await cdp(tabId,'Input.dispatchKeyEvent',{type:'keyUp',key:args.key,code:args.key});return {sent:true};
  }
  if(op==='upload'){
    const doc=await cdp(tabId,'DOM.getDocument');const found=await cdp(tabId,'DOM.querySelector',{nodeId:doc.root.nodeId,selector:`input[type="file"][data-windi-node="${args.node}"]`});
    if(!found.nodeId)throw new Error('FILE_INPUT_NOT_FOUND');
    await cdp(tabId,'DOM.setFileInputFiles',{nodeId:found.nodeId,files:args.files});return {uploaded:true};
  }
  throw new Error('UNSUPPORTED_OPERATION');
}
// Record only downloads attributed to an owned provider page. The gate runner
// must still match a download to the exact result before publishing an asset.
chrome.downloads.onCreated.addListener(async item=>{
  if(!allowed(item.referrer||''))return;
  if(!activeDownloadJob)return;
  const {downloads=[]}=await chrome.storage.local.get('downloads');
  downloads.push({id:item.id,jobId:activeDownloadJob,referrer:item.referrer,startTime:item.startTime});
  await chrome.storage.local.set({downloads:downloads.slice(-30)});
});
chrome.downloads.onChanged.addListener(async delta=>{
  const {downloads=[]}=await chrome.storage.local.get('downloads');const record=downloads.find(item=>item.id===delta.id);if(!record)return;
  const [item]=await chrome.downloads.search({id:delta.id});if(!item)return;
  Object.assign(record,{filename:item.filename,state:item.state,bytes:item.totalBytes,mime:item.mime});await chrome.storage.local.set({downloads});
});
chrome.alarms.create('connect',{periodInMinutes:0.5});
chrome.alarms.onAlarm.addListener(()=>void connect());
chrome.runtime.onMessage.addListener((message,_sender,reply)=>{
  if(message.type==='reconnect'){if(port){port.disconnect();port=null;}void connect().then(()=>reply({ok:true}));return true;}
  if(message.type==='openStatusTab')void chrome.storage.local.get('status').then(({status})=>status?.tabId?chrome.tabs.update(status.tabId,{active:true}):null);
  if(message.type==='resetPairing')void chrome.storage.local.set({pairReset:true}).then(()=>{if(port){port.disconnect();port=null;}return connect();}).then(()=>reply({ok:true})).catch(error=>reply({ok:false,error:error.message}));
  return message.type==='resetPairing';
});
void connect();
