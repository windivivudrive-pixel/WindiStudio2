import {grokWebPage} from './grok-web-page.js';
import {grokUIPage} from './grok-ui-page.js';
// Own native port, tab and storage. Flow/ChatGPT state is never read or written.
const HOST='com.windistudio.connect.grok';
let original=null;
let port=null,connecting=false,attached=null,queue=Promise.resolve(),writes=Promise.resolve();
function status(patch){writes=writes.catch(()=>{}).then(async()=>{const {grokStatus={}}=await chrome.storage.local.get('grokStatus');await chrome.storage.local.set({grokStatus:{...grokStatus,...patch,provider:'grok',transport:'web'}});});return writes;}
const allowed=tab=>{try{return new URL(tab.url).origin==='https://grok.com';}catch{return false;}};
async function tabFor(open=false){
  const {grokWebTabId}=await chrome.storage.local.get('grokWebTabId');
  let tab=grokWebTabId?await chrome.tabs.get(grokWebTabId).catch(()=>null):null;
  if(!tab||!allowed(tab)){
    if(!open)throw new Error('GROK_LOGIN_REQUIRED');
    // Always create our own tab; do not navigate or attach to a user's working tab.
    tab=await chrome.tabs.create({url:'https://grok.com/imagine',active:true});
    await chrome.storage.local.set({grokWebTabId:tab.id});
  }
  if(open)await chrome.tabs.update(tab.id,{active:true});
  for(let i=0;i<100;i++){tab=await chrome.tabs.get(tab.id);if(tab.status==='complete'&&allowed(tab))return tab;await new Promise(r=>setTimeout(r,100));}
  throw new Error('GROK_TAB_NOT_READY');
}
async function page(op,args={},open=false,ui=false){
  const tab=await tabFor(open);
  if(attached!==tab.id){await chrome.debugger.attach({tabId:tab.id},'1.3');attached=tab.id;}
  const response=await chrome.debugger.sendCommand({tabId:tab.id},'Runtime.evaluate',{expression:`(${(ui?grokUIPage:grokWebPage).toString()})(${JSON.stringify(op)},${JSON.stringify(args)})`,awaitPromise:true,returnByValue:true});
  if(response.exceptionDetails){const description=response.exceptionDetails.exception?.description||'';throw new Error(description.match(/GROK_[A-Z0-9_]+/)?.[0]||'GROK_WEB_OPERATION_FAILED');}
  return response.result?.value;
}
chrome.debugger.onDetach.addListener(source=>{if(source.tabId===attached)attached=null;});
async function check(open=false){
  try{const {grokActiveJob}=await chrome.storage.local.get('grokActiveJob');
    if(grokActiveJob){const key=`grokUIJob:${grokActiveJob}`,record=(await chrome.storage.local.get(key))[key];if(record?.postUrl)await execute('ui.restore',{jobId:grokActiveJob});}
    const result=await page('status',{},open);await status({...result,error:null});return result;}
  catch(error){await status({authenticated:false,error:error.message});throw error;}
}
async function refresh(){
  const {grokActiveJob}=await chrome.storage.local.get('grokActiveJob');if(grokActiveJob)throw new Error('GROK_JOB_ACTIVE');
  const tab=await tabFor(true);
  if(attached===tab.id){await chrome.debugger.detach({tabId:tab.id}).catch(()=>{});attached=null;}
  await chrome.tabs.reload(tab.id);
  for(let i=0;i<100;i++){const current=await chrome.tabs.get(tab.id);if(current.status==='complete')return check();await new Promise(r=>setTimeout(r,100));}
  throw new Error('GROK_TAB_NOT_READY');
}
async function execute(op,args={}){
  if(op==='web.login')return check(true);
  if(op==='web.status')return check();
  if(op==='web.refresh')return refresh();
  if(op==='web.disconnect'){if(attached!==null)await chrome.debugger.detach({tabId:attached}).catch(()=>{});attached=null;await chrome.storage.local.remove('grokWebTabId');await status({authenticated:false});return {authenticated:false,transport:'web'};}
  if(op==='ui.restore'){
    const key=`grokUIJob:${args.jobId}`;
    const record=(await chrome.storage.local.get(key))[key];
    const post=record?.postUrl||args.postUrl;
    if(!post)return {restored:false};
    const u=new URL(post);
    if(u.origin!=='https://grok.com'||!/^\/imagine\/post\/[a-f0-9-]{36}$/.test(u.pathname)||! /^[a-f0-9-]{36}$/.test(u.searchParams.get('conversation')||''))throw new Error('GROK_INVALID_POST_URL');
    let tab=record?.tabId?await chrome.tabs.get(record.tabId).catch(()=>null):null;
    let sameConversation=false;try{const current=new URL(tab?.url);sameConversation=current.origin===u.origin&&current.pathname.startsWith('/imagine/post/')&&current.searchParams.get('conversation')===u.searchParams.get('conversation');}catch{}
    if(!sameConversation)tab=await chrome.tabs.create({url:u.href,active:false});
    await chrome.storage.local.set({grokWebTabId:tab.id,grokActiveJob:args.jobId,[key]:{...record,state:record?.state||'generating',postUrl:u.href,tabId:tab.id,submitIntent:true}});
    return {restored:true};
  }
  if(op==='ui.prepare'){
    const {grokActiveJob}=await chrome.storage.local.get('grokActiveJob');
    if(grokActiveJob&&grokActiveJob!==args.jobId)throw new Error('GROK_JOB_ACTIVE');
    const tab=await tabFor(true);
    await chrome.tabs.update(tab.id,{url:'https://grok.com/imagine'});
    await chrome.storage.local.set({grokActiveJob:args.jobId,[`grokUIJob:${args.jobId}`]:{state:'preparing',tabId:tab.id}});
    await page('reset',args,false,true);
    return {ready:true};
  }
  if(op==='ui.release'){
    const {grokActiveJob}=await chrome.storage.local.get('grokActiveJob');if(grokActiveJob===args.jobId)await chrome.storage.local.remove('grokActiveJob');return {ok:true};
  }
  if(op==='start'&&args.media==='video'){
    const key=`grokUIJob:${args.jobId}`,record=(await chrome.storage.local.get(key))[key];
    if(record?.submitIntent)return {started:true,reused:true};
    // Persist the uncertainty boundary before asking the page to submit. A lost
    // response is never permission to generate a duplicate paid job.
    await chrome.storage.local.set({[key]:{...record,submitIntent:true,state:'generating'}});
    try{const result=await page('start',args,false,true);await chrome.storage.local.set({[key]:{...record,...result}});return result;}
    catch(error){await chrome.storage.local.set({[key]:{...record,state:'failed',error:error.message}});await execute('ui.release',args);throw error;}
  }
  if(op==='poll'){
    const key=`grokUIJob:${args.jobId}`,record=(await chrome.storage.local.get(key))[key];
    if(record){
      if(record.state==='complete'||record.state==='failed')return record;
      const tab=await tabFor();
      if(record.tabId!==tab.id)throw new Error('GROK_WEB_RESULT_UNKNOWN');
      const result=await page('poll',{...args,record},false,true);
      await chrome.storage.local.set({[key]:{...record,...result}});return result;
    }
    return page(op,args);
  }
  if(['uploadBegin','uploadChunk','uploadFinish','start'].includes(op))return page(op,args);
  if(op==='download'){
    const key=`grokWebDownload:${args.jobId}`;
    const previous=(await chrome.storage.local.get(key))[key];if(previous)return previous;
    const result=await execute('poll',{jobId:args.jobId});
    if(result?.state!=='complete'||!result.url)throw new Error('GROK_RESULT_UNKNOWN');
    const u=new URL(result.url);const localBlob=u.protocol==='blob:'&&u.origin==='https://grok.com';if(!localBlob&&(u.protocol!=='https:'||u.username||u.password||u.port||!['assets.grok.com','imagine-public.x.ai','imgen.x.ai','grok.com'].includes(u.hostname)))throw new Error('GROK_UNTRUSTED_MEDIA_URL');
    if(!/^[a-f0-9-]{36}$/.test(args.jobId))throw new Error('GROK_INVALID_JOB_ID');
    const downloadId=await chrome.downloads.download({url:u.href,filename:`Windi/grok/${args.jobId}.${args.media==='video'?'mp4':'image'}`,saveAs:false,conflictAction:'uniquify'});
    const saved={downloadId,conversationId:result.conversationId||null};await chrome.storage.local.set({[key]:saved});return saved;
  }
  if(op==='originalPrepare'){
    const record=(await chrome.storage.local.get(`grokWebDownload:${args.jobId}`))[`grokWebDownload:${args.jobId}`];
    if(!record)throw new Error('GROK_DOWNLOAD_MISSING');
    const [item]=await chrome.downloads.search({id:record.downloadId});if(!item)throw new Error('GROK_DOWNLOAD_MISSING');
    const u=new URL(item.finalUrl||item.url);
    if(u.protocol!=='https:'||u.username||u.password||u.port||!['assets.grok.com','imagine-public.x.ai','imgen.x.ai'].includes(u.hostname))throw new Error('GROK_UNTRUSTED_MEDIA_URL');
    const response=await fetch(u.href,{credentials:'include',redirect:'error',signal:AbortSignal.timeout(55000)});
    if(!response.ok)throw new Error('GROK_DOWNLOAD_FAILED');
    if(Number(response.headers.get('content-length'))>512*1024*1024)throw new Error('GROK_MEDIA_TOO_LARGE');
    const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length<64||bytes.length>512*1024*1024)throw new Error('GROK_MEDIA_TOO_LARGE');
    original={jobId:args.jobId,bytes};const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
    return {size:bytes.length,sha256};
  }
  if(op==='originalChunk'){
    if(original?.jobId!==args.jobId||!Number.isInteger(args.offset)||args.offset<0)throw new Error('GROK_DOWNLOAD_MISSING');
    const bytes=original.bytes.subarray(args.offset,args.offset+131072);let text='';for(const byte of bytes)text+=String.fromCharCode(byte);return {data:btoa(text)};
  }
  if(op==='downloadStatus'){
    const record=(await chrome.storage.local.get(`grokWebDownload:${args.jobId}`))[`grokWebDownload:${args.jobId}`];
    if(!record)throw new Error('GROK_DOWNLOAD_MISSING');const [item]=await chrome.downloads.search({id:record.downloadId});if(!item)throw new Error('GROK_DOWNLOAD_MISSING');
    return {jobId:args.jobId,downloadId:record.downloadId,state:item.state,path:item.filename,bytes:item.totalBytes,error:item.error};
  }
  throw new Error('GROK_INVALID_OPERATION');
}
async function connect(){
  if(port||connecting)return;connecting=true;
  try{
    let {grokInstallation}=await chrome.storage.local.get('grokInstallation');
    if(!grokInstallation){grokInstallation=crypto.randomUUID();await chrome.storage.local.set({grokInstallation});}
    const current=chrome.runtime.connectNative(HOST);port=current;
    current.onDisconnect.addListener(()=>{const error=chrome.runtime.lastError?.message||'Mất kết nối Windi';if(port===current){port=null;void status({backendConnected:false,connected:false,error});}});
    current.onMessage.addListener(message=>{
      if(message.type==='connected')void status({backendConnected:true,error:null});
      if(message.type==='status')void status({...message.status,backendConnected:true});
      if(message.type==='command')queue=queue.catch(()=>{}).then(async()=>{try{const result=await execute(message.op,message.args);if(port===current)current.postMessage({type:'reply',version:2,id:message.id,result});}catch(error){if(port===current)current.postMessage({type:'reply',version:2,id:message.id,error:error.message});void status({error:error.message});}});
      if(message.error)void status({error:message.error});
    });
    current.postMessage({type:'hello',version:2,profile:grokInstallation});
  }catch{await status({backendConnected:false,connected:false,error:'Không kết nối được Grok native host. Cài lại Windi Connect bản mới.'});}
  finally{connecting=false;}
}
export function handleGrokMessage(message,reply){
  if(message.type!=='grokAction'||!['login','logout','status','doctor','reconnect','refresh'].includes(message.action))return false;
  if(message.action==='reconnect'){
    if(port){port.disconnect();port=null;}
    void connect().then(()=>{
      // Verify the web session before reporting success; sending a native hello
      // alone does not mean the browser session is connected.
      handleGrokMessage({type:'grokAction',action:'login'},reply);
    }).catch(error=>reply({error:error.message}));return true;
  }
  if(message.action==='refresh'){
    void refresh().then(result=>reply({ok:true,result})).catch(error=>reply({error:error.message}));return true;
  }
  chrome.runtime.sendNativeMessage(HOST,{version:2,id:crypto.randomUUID(),op:`grok.${message.action}`,args:{}},response=>{
    const error=chrome.runtime.lastError?.message||response?.error;
    if(error){void status({error});reply({error});return;}
    reply({ok:true,result:response?.result});port?.postMessage({type:'status.request',version:2});
  });return true;
}
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='connect'){void connect();port?.postMessage({type:'status.request',version:2});}});
void connect();
