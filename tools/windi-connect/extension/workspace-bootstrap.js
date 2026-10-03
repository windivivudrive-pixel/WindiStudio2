// Only workspace creation uses UI. Generation and download remain Flow RPC.
const workspaceUrl=url=>{try{const u=new URL(url);return u.origin==='https://flow.google.com'&&/^\/project\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:\/|$)/i.test(u.pathname);}catch{return false;}};
export function newFlowProjectControl(){
  const visible=el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&!el.disabled;};
  const candidates=[...document.querySelectorAll('button,a,[role="button"]')].filter(visible);
  const target=candidates.find(el=>[el.getAttribute('aria-label'),el.innerText].some(text=>/^\s*(?:(?:add|\+)\s*)?(?:new project|create project|dự án mới|tạo dự án)(?:\s*\+)?\s*$/i.test(text||'')));
  if(!target)return null;
  target.scrollIntoView({block:'center'});const r=target.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};
}
export async function ensureFlowWorkspace({projectId,storage,tabs,open,adopt,evaluate,click,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
  if(typeof projectId!=='string'||!projectId||projectId.length>200)throw new Error('INVALID_PROJECT_ID');
  const key=`windiFlowWorkspace:${projectId}`;
  let state=(await storage.get(key))[key];
  if(state?.url&&workspaceUrl(state.url)){const tab=await open(state.url);return {tabId:tab.id,url:tab.url||state.url};}
  let tab=state?.tabId?await tabs.get(state.tabId).catch(()=>null):null;
  if(tab&&!(tab.url||'').startsWith('https://flow.google.com/'))tab=null;
  if(!tab&&state?.clicked)throw new Error('FLOW_WORKSPACE_CREATION_UNCERTAIN');
  if(!tab){tab=await open('https://flow.google.com/');state={tabId:tab.id,clicked:false};await storage.set({[key]:state});}
  await adopt(tab);
  for(let attempt=0;attempt<80;attempt++){
    tab=await tabs.get(tab.id);
    if(workspaceUrl(tab.url)){await storage.set({[key]:{...state,url:tab.url}});return {tabId:tab.id,url:tab.url};}
    if(!state.clicked){
      const point=await evaluate(tab.id,newFlowProjectControl);
      if(point){
        // Persist intent before dispatch: a lost reply must not create a second project.
        state={...state,clicked:true};await storage.set({[key]:state});await click(tab.id,point);
      }
    }
    await pause(400);
  }
  throw new Error(state.clicked?'FLOW_WORKSPACE_CREATION_UNCERTAIN':'FLOW_WORKSPACE_CREATE_UNAVAILABLE');
}
