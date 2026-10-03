// Match the exact workspace, ignoring only a trailing slash/hash. Never navigate
// a different project or adopt an unrelated provider tab.
export function sameWorkspace(left,right){
  try {const a=new URL(left),b=new URL(right);return a.origin===b.origin&&a.pathname.replace(/\/$/,'')===b.pathname.replace(/\/$/,'')&&a.search===b.search;}catch{return false;}
}
export function sameFlowProject(left,right){
  try{const a=new URL(left),b=new URL(right),project=u=>u.pathname.match(/^\/project\/([0-9a-f-]{36})(?:\/edit\/[0-9a-f-]{36})?\/?$/i)?.[1];return a.origin==='https://flow.google.com'&&b.origin===a.origin&&Boolean(project(a))&&project(a)===project(b)&&a.search===b.search;}catch{return false;}
}
export async function reuseWorkspaceTab(tabs,url){
  const existing=(await tabs.query({})).find(tab=>sameWorkspace(tab.url||tab.pendingUrl,url));
  if(existing)return existing;
  return tabs.create({url,active:false});
}

export async function waitForWorkspaceTab(tabs,tabId,allowed,{attempts=600,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
  let reloaded=false;
  for(let attempt=0;attempt<attempts;attempt++){
    const tab=await tabs.get(tabId);
    if(tab.discarded&&!reloaded){await tabs.reload(tabId);reloaded=true;}
    if(!tab.discarded&&allowed(tab.url||'')&&tab.status==='complete')return tab;
    await pause(100);
  }
  throw new Error('PROVIDER_TAB_DID_NOT_LOAD');
}
