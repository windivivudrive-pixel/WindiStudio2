import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat, open, readFile, readdir, rename, unlink, writeFile} from 'node:fs/promises';
import {loadWorkflow} from './workflow.ts';
import {safeFile, safeOutput} from './project.ts';

type Visibility='DRAFT'|'PUBLISHED';
type Status='awaiting_approval'|'approved'|'starting'|'uploading'|'finishing'|'submitted'|'draft'|'verified'|'action_required'|'outcome_unknown';
type RecordData={schemaVersion:1;workflowId:string;render:string;sha256:string;bytes:number;caption:string;pageId:string;visibility:Visibility;approvalCode:string;status:Status;approvedAt:string|null;attemptedAt:string|null;videoId:string|null;postUrl:string|null;reason:string|null};
type Transport=typeof fetch;
const dir=(root:string)=>path.join(root,'.windi','facebook-reels');
const file=(root:string,code:string)=>{if(!/^[a-f0-9]{16}$/.test(code))throw new Error('INVALID_FACEBOOK_APPROVAL_CODE');return path.join(dir(root),`${code}.json`);};
const validPageId=(id:string)=>{if(!/^\d{5,30}$/.test(id))throw new Error('INVALID_FACEBOOK_PAGE_ID');return id;};
const validVersion=(value:string)=>{if(!/^v\d+\.\d+$/.test(value))throw new Error('INVALID_META_GRAPH_VERSION');return value;};
const graph=(version:string,endpoint:string,fields?:string)=>`https://graph.facebook.com/${validVersion(version)}/${endpoint}${fields?`?fields=${encodeURIComponent(fields)}`:''}`;
const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

async function hashFile(input:string){return new Promise<string>((resolve,reject)=>{const hash=createHash('sha256');const stream=createReadStream(input);stream.on('data',chunk=>hash.update(chunk));stream.on('error',reject);stream.on('end',()=>resolve(hash.digest('hex')));});}
async function checkedVideo(root:string){
  const workflow=await loadWorkflow(root);
  if(workflow.stage!=='complete'||!workflow.artifacts.render||!workflow.artifacts.qa)throw new Error('VIDEO_QA_REQUIRED');
  const render=await safeFile(root,path.join(root,workflow.artifacts.render));
  const qa=JSON.parse(await readFile(await safeFile(root,path.join(root,workflow.artifacts.qa)),'utf8')) as {passed?:unknown;outputs?:{render?:unknown}};
  if(qa.passed!==true||path.resolve(String(qa.outputs?.render||''))!==render)throw new Error('VIDEO_QA_REQUIRED');
  if(path.extname(render).toLowerCase()!=='.mp4')throw new Error('FACEBOOK_MP4_REQUIRED');
  const info=await lstat(render);if(info.size<1024)throw new Error('FACEBOOK_MP4_INVALID');
  return {workflow,render,bytes:info.size,sha256:await hashFile(render)};
}
async function save(root:string,record:RecordData){const destination=await safeOutput(root,path.relative(root,file(root,record.approvalCode)));const temporary=`${destination}.${randomUUID()}.tmp`;await writeFile(temporary,`${JSON.stringify(record,null,2)}\n`,{mode:0o600});await rename(temporary,destination);return record;}
async function load(root:string,code:string):Promise<RecordData>{const record=JSON.parse(await readFile(await safeFile(root,file(root,code)),'utf8')) as RecordData;if(record.schemaVersion!==1||record.approvalCode!==code||!['DRAFT','PUBLISHED'].includes(record.visibility))throw new Error('INVALID_FACEBOOK_REEL_RECORD');return record;}
async function tokenFromFile(tokenFile:string){const info=await lstat(tokenFile);if(!info.isFile()||info.isSymbolicLink()||info.size>4096)throw new Error('FACEBOOK_TOKEN_FILE_INVALID');if(process.platform!=='win32'&&(info.mode&0o077)!==0)throw new Error('FACEBOOK_TOKEN_FILE_PERMISSIONS');const token=(await readFile(tokenFile,'utf8')).trim();if(!token||/\s/.test(token))throw new Error('FACEBOOK_TOKEN_FILE_INVALID');return token;}
async function jsonResponse(response:Response){let body:any;try{body=await response.json();}catch{throw new Error(`META_HTTP_${response.status}_INVALID_JSON`);}if(!response.ok||body?.error){const code=Number(body?.error?.code);throw new Error(`META_HTTP_${response.status}${Number.isInteger(code)?`_${code}`:''}`);}return body;}
async function callMeta(url:string,init:RequestInit,transport:Transport){const response=await transport(url,{...init,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(120_000)});return jsonResponse(response);}
async function pageIdentity(token:string,version:string,transport:Transport){const result=await callMeta(graph(version,'me','id,name'),{headers:{Authorization:`Bearer ${token}`}},transport);if(!/^\d+$/.test(String(result.id||'')))throw new Error('FACEBOOK_PAGE_TOKEN_INVALID');return {id:String(result.id),name:String(result.name||'')};}
export async function checkFacebookPage(tokenFile:string,pageId:string,version='v26.0',transport:Transport=fetch){const token=await tokenFromFile(tokenFile);const page=await pageIdentity(token,version,transport);return {ready:page.id===validPageId(pageId),pageId:page.id,pageName:page.name,reason:page.id===pageId?'OK':'FACEBOOK_PAGE_TOKEN_MISMATCH'};}

export async function prepareFacebookReel(root:string,caption:string,pageId:string,visibility:Visibility='DRAFT'){
  const video=await checkedVideo(root),clean=caption.trim(),id=validPageId(pageId);
  if(!clean||clean.length>2200)throw new Error('INVALID_FACEBOOK_CAPTION');
  if(visibility!=='DRAFT'&&visibility!=='PUBLISHED')throw new Error('INVALID_FACEBOOK_VISIBILITY');
  const approvalCode=createHash('sha256').update(`${video.workflow.workflowId}\n${video.sha256}\n${clean}\n${id}\n${visibility}`).digest('hex').slice(0,16);
  const existing=await load(root,approvalCode).catch((error:Error)=>{if(error.message==='PROJECT_FILE_NOT_FOUND')return null;throw error;});
  if(existing)return existing;
  const names=await readdir(dir(root)).catch((error:NodeJS.ErrnoException)=>{if(error.code==='ENOENT')return [];throw error;});
  for(const name of names){if(!/^[a-f0-9]{16}\.json$/.test(name))continue;const previous=await load(root,name.slice(0,16));if(previous.sha256===video.sha256&&previous.pageId===id&&['starting','uploading','finishing','submitted','draft','verified','outcome_unknown'].includes(previous.status))throw new Error('FACEBOOK_REEL_ALREADY_ATTEMPTED');}
  return save(root,{schemaVersion:1,workflowId:video.workflow.workflowId,render:path.relative(root,video.render),sha256:video.sha256,bytes:video.bytes,caption:clean,pageId:id,visibility,approvalCode,status:'awaiting_approval',approvedAt:null,attemptedAt:null,videoId:null,postUrl:null,reason:null});
}
export async function approveFacebookReel(root:string,code:string){const record=await load(root,code);if(record.status!=='awaiting_approval'&&record.status!=='action_required')throw new Error('FACEBOOK_REEL_NOT_AWAITING_APPROVAL');const video=await checkedVideo(root);if(video.workflow.workflowId!==record.workflowId||video.sha256!==record.sha256||video.bytes!==record.bytes)throw new Error('FACEBOOK_VIDEO_CHANGED');record.status='approved';record.approvedAt=new Date().toISOString();record.reason=null;return save(root,record);}
export async function facebookReelStatus(root:string,code:string){const record=await load(root,code);return {...record,video:path.join(root,record.render)};}

function checkedUploadUrl(value:unknown,videoId:string){if(typeof value!=='string')throw new Error('META_UPLOAD_URL_INVALID');let url:URL;try{url=new URL(value);}catch{throw new Error('META_UPLOAD_URL_INVALID');}if(url.protocol!=='https:'||url.hostname!=='rupload.facebook.com'||!url.pathname.startsWith('/video-upload/')||!url.pathname.endsWith(`/${videoId}`)||url.username||url.password)throw new Error('META_UPLOAD_URL_INVALID');return url.href;}
function checkedPermalink(value:unknown){if(typeof value!=='string')return null;try{const url=new URL(value,'https://www.facebook.com');if(url.protocol!=='https:'||!(url.hostname==='facebook.com'||url.hostname.endsWith('.facebook.com')))return null;return url.href;}catch{return null;}}
async function remoteVideo(token:string,version:string,videoId:string,transport:Transport){const init={headers:{Authorization:`Bearer ${token}`}};try{return await callMeta(graph(version,videoId,'status,permalink_url'),init,transport);}catch(error){if((error as Error).message!=='META_HTTP_400_100')throw error;return callMeta(graph(version,videoId,'status'),init,transport);}}
export async function refreshFacebookReel(root:string,code:string,tokenFile:string,version='v26.0',transport:Transport=fetch){
  const record=await load(root,code);if(!record.videoId)throw new Error('FACEBOOK_VIDEO_ID_UNAVAILABLE');
  const token=await tokenFromFile(tokenFile),page=await pageIdentity(token,version,transport);if(page.id!==record.pageId)throw new Error('FACEBOOK_PAGE_TOKEN_MISMATCH');
  const remote=await remoteVideo(token,version,record.videoId,transport);
  const phase=String(remote.status?.publishing_phase?.status||'').toLowerCase();
  const postUrl=checkedPermalink(remote.permalink_url);
  if(record.visibility==='PUBLISHED'&&phase==='complete'&&postUrl){record.status='verified';record.postUrl=postUrl;record.reason=null;await save(root,record);}
  return {...record,video:path.join(root,record.render),remoteStatus:remote.status||null};
}
export async function submitFacebookReel(root:string,code:string,tokenFile:string,version='v26.0',transport:Transport=fetch){
  if(path.resolve(tokenFile).startsWith(`${path.resolve(root)}${path.sep}`))throw new Error('FACEBOOK_TOKEN_MUST_BE_OUTSIDE_PROJECT');
  const record=await load(root,code);if(record.status!=='approved'||!record.approvedAt)throw new Error('FACEBOOK_REEL_NOT_APPROVED');
  const video=await checkedVideo(root);if(video.workflow.workflowId!==record.workflowId||video.sha256!==record.sha256||video.bytes!==record.bytes)throw new Error('FACEBOOK_VIDEO_CHANGED');
  const token=await tokenFromFile(tokenFile);
  const lockPath=`${file(root,code)}.lock`,lock=await open(lockPath,'wx',0o600).catch(()=>{throw new Error('FACEBOOK_REEL_IN_PROGRESS');});let attempted=false;
  try{
    const page=await pageIdentity(token,version,transport);if(page.id!==record.pageId)throw new Error('FACEBOOK_PAGE_TOKEN_MISMATCH');
    record.status='starting';record.attemptedAt=new Date().toISOString();await save(root,record);attempted=true;
    const start=await callMeta(graph(version,'me/video_reels'),{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({upload_phase:'start'})},transport);
    if(!/^\d+$/.test(String(start.video_id||'')))throw new Error('META_VIDEO_ID_INVALID');
    record.videoId=String(start.video_id);const uploadUrl=checkedUploadUrl(start.upload_url,record.videoId);record.status='uploading';await save(root,record);
    if((await lstat(video.render)).size!==record.bytes||await hashFile(video.render)!==record.sha256)throw new Error('FACEBOOK_VIDEO_CHANGED');
    const uploaded=await callMeta(uploadUrl,{method:'POST',headers:{Authorization:`OAuth ${token}`,offset:'0',file_size:String(video.bytes),'Content-Type':'application/octet-stream','Content-Length':String(video.bytes)},body:createReadStream(video.render) as unknown as BodyInit,duplex:'half'} as RequestInit,transport);
    if(uploaded.success!==true)throw new Error('META_REEL_UPLOAD_NOT_CONFIRMED');
    record.status='finishing';await save(root,record);
    const finish=await callMeta(graph(version,'me/video_reels'),{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({upload_phase:'finish',video_id:record.videoId,video_state:record.visibility,description:record.caption})},transport);
    if(finish.success!==true)throw new Error('META_REEL_FINISH_NOT_CONFIRMED');
    record.status=record.visibility==='DRAFT'?'draft':'submitted';record.reason=null;await save(root,record);
    if(record.visibility==='PUBLISHED'){
      for(let i=0;i<15;i++){try{const refreshed=await refreshFacebookReel(root,code,tokenFile,version,transport);if(refreshed.status==='verified')return refreshed;}catch{break;}await pause(2000);}
    }
    return facebookReelStatus(root,code);
  }catch(error){record.status=attempted?'outcome_unknown':'action_required';record.reason=error instanceof Error?error.message:String(error);await save(root,record);throw error;}finally{await lock.close();await unlink(lockPath).catch(()=>{});}
}
