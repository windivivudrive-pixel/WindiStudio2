// Match the exact workspace, ignoring only a trailing slash/hash. Never navigate
// a different project or adopt an unrelated provider tab.
export function sameWorkspace(left,right){
  try {const a=new URL(left),b=new URL(right);return a.origin===b.origin&&a.pathname.replace(/\/$/,'')===b.pathname.replace(/\/$/,'')&&a.search===b.search;}catch{return false;}
}
export async function reuseWorkspaceTab(tabs,url){
  const existing=(await tabs.query({})).find(tab=>sameWorkspace(tab.url||tab.pendingUrl,url));
  return existing||tabs.create({url,active:false});
}
