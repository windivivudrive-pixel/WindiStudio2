import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {createReadStream, openAsBlob} from 'node:fs';
import {lstat, open, readFile, readdir, rename, unlink, writeFile} from 'node:fs/promises';
import {loadWorkflow} from './workflow.ts';
import {safeFile, safeOutput} from './project.ts';

type Provider='tiktok'|'facebook';
type Visibility='SELF_ONLY'|'PUBLIC_TO_EVERYONE'|'PUBLIC';
type Status='awaiting_approval'|'approved'|'uploading'|'submitting'|'submitted'|'action_required'|'outcome_unknown';
type RecordData={schemaVersion:1;workflowId:string;render:string;sha256:string;bytes:number;caption:string;apiUrl:string;integrationId:string;integrationName:string;provider:Provider;visibility:Visibility;approvalCode:string;status:Status;approvedAt:string|null;attemptedAt:string|null;mediaPath:string|null;postIds:string[];reason:string|null};
type Transport=typeof fetch;
const dir=(root:string)=>path.join(root,'.windi','postiz-posts');
const file=(root:string,code:string)=>{if(!/^[a-f0-9]{16}$/.test(code))throw new Error('INVALID_POSTIZ_APPROVAL_CODE');return path.join(dir(root),`${code}.json`);};

function apiBase(value:string){
  let url:URL;try{url=new URL(value);}catch{throw new Error('POSTIZ_API_URL_INVALID');}
  const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if((url.protocol!=='https:'&&!(local&&url.protocol==='http:'))||url.username||url.password||url.search||url.hash||!url.pathname.endsWith('/public/v1'))throw new Error('POSTIZ_API_URL_INVALID');
  return url.href.replace(/\/$/,'');
}
async function apiKey(keyFile:string,root?:string){
  if(root&&path.resolve(keyFile).startsWith(`${path.resolve(root)}${path.sep}`))throw new Error('POSTIZ_KEY_MUST_BE_OUTSIDE_PROJECT');
  const info=await lstat(keyFile);if(!info.isFile()||info.isSymbolicLink()||info.size>4096)throw new Error('POSTIZ_KEY_FILE_INVALID');
  if(process.platform!=='win32'&&(info.mode&0o077)!==0)throw new Error('POSTIZ_KEY_FILE_PERMISSIONS');
  const key=(await readFile(keyFile,'utf8')).trim();if(!key||/\s/.test(key))throw new Error('POSTIZ_KEY_FILE_INVALID');return key;
}
async function request(base:string,key:string,endpoint:string,init:RequestInit={},transport:Transport=fetch){
  const response=await transport(`${base}${endpoint}`,{...init,headers:{Authorization:key,...init.headers},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(120_000)});
  let body:any;try{body=await response.json();}catch{throw new Error(`POSTIZ_HTTP_${response.status}_INVALID_JSON`);}
  if(!response.ok||body?.error===true)throw new Error(`POSTIZ_HTTP_${response.status}`);
  return body;
}
function providerOf(value:any):Provider|null{const name=String(value?.providerIdentifier||value?.identifier||value?.provider||'').toLowerCase();return name==='tiktok'||name==='facebook'?name:null;}
async function channels(base:string,key:string,transport:Transport){const result=await request(base,key,'/integrations',{},transport);if(!Array.isArray(result))throw new Error('POSTIZ_INTEGRATIONS_INVALID');return result;}
export async function listPostizChannels(apiUrl:string,keyFile:string,transport:Transport=fetch){const base=apiBase(apiUrl),key=await apiKey(keyFile);return (await channels(base,key,transport)).map((item:any)=>({id:String(item.id||''),name:String(item.name||''),provider:providerOf(item),disabled:item.disabled===true})).filter(item=>item.provider);}
async function channel(base:string,key:string,id:string,transport:Transport){if(!/^[\w-]{2,100}$/.test(id))throw new Error('POSTIZ_INTEGRATION_ID_INVALID');const found=(await channels(base,key,transport)).find((item:any)=>item.id===id);if(!found||found.disabled===true)throw new Error('POSTIZ_CHANNEL_UNAVAILABLE');const provider=providerOf(found);if(!provider)throw new Error('POSTIZ_CHANNEL_UNSUPPORTED');return {id,name:String(found.name||''),provider};}
async function video(root:string){
  const workflow=await loadWorkflow(root);if(workflow.stage!=='complete'||!workflow.artifacts.render||!workflow.artifacts.qa)throw new Error('VIDEO_QA_REQUIRED');
  const render=await safeFile(root,path.join(root,workflow.artifacts.render));const qa=JSON.parse(await readFile(await safeFile(root,path.join(root,workflow.artifacts.qa)),'utf8')) as {passed?:unknown;outputs?:{render?:unknown}};
  if(qa.passed!==true||path.resolve(String(qa.outputs?.render||''))!==render)throw new Error('VIDEO_QA_REQUIRED');
  if(path.extname(render).toLowerCase()!=='.mp4')throw new Error('POSTIZ_MP4_REQUIRED');const info=await lstat(render);if(info.size<1024)throw new Error('POSTIZ_MP4_INVALID');
  const sha256=await new Promise<string>((resolve,reject)=>{const hash=createHash('sha256'),stream=createReadStream(render);stream.on('data',chunk=>hash.update(chunk));stream.on('error',reject);stream.on('end',()=>resolve(hash.digest('hex')));});
  return {workflow,render,bytes:info.size,sha256};
}
async function save(root:string,record:RecordData){const destination=await safeOutput(root,path.relative(root,file(root,record.approvalCode)));const temporary=`${destination}.${randomUUID()}.tmp`;await writeFile(temporary,`${JSON.stringify(record,null,2)}\n`,{mode:0o600});await rename(temporary,destination);return record;}
async function load(root:string,code:string):Promise<RecordData>{const record=JSON.parse(await readFile(await safeFile(root,file(root,code)),'utf8')) as RecordData;if(record.schemaVersion!==1||record.approvalCode!==code||!['tiktok','facebook'].includes(record.provider))throw new Error('POSTIZ_RECORD_INVALID');return record;}
async function assertVideo(root:string,record:RecordData){const current=await video(root);if(current.workflow.workflowId!==record.workflowId||current.sha256!==record.sha256||current.bytes!==record.bytes)throw new Error('POSTIZ_VIDEO_CHANGED');return current;}

export async function preparePostizPost(root:string,caption:string,integrationId:string,apiUrl:string,keyFile:string,visibility?:Visibility,transport:Transport=fetch){
  const base=apiBase(apiUrl),key=await apiKey(keyFile,root),account=await channel(base,key,integrationId,transport),current=await video(root),clean=caption.trim();
  if(!clean||clean.length>2200)throw new Error('POSTIZ_CAPTION_INVALID');
  const chosen=visibility||(account.provider==='tiktok'?'SELF_ONLY':'PUBLIC');
  if(account.provider==='tiktok'&&!['SELF_ONLY','PUBLIC_TO_EVERYONE'].includes(chosen)||account.provider==='facebook'&&chosen!=='PUBLIC')throw new Error('POSTIZ_VISIBILITY_INVALID');
  const approvalCode=createHash('sha256').update([current.workflow.workflowId,current.sha256,clean,base,account.id,account.name,account.provider,chosen].join('\n')).digest('hex').slice(0,16);
  const existing=await load(root,approvalCode).catch((error:Error)=>{if(error.message==='PROJECT_FILE_NOT_FOUND')return null;throw error;});if(existing)return existing;
  const names=await readdir(dir(root)).catch((error:NodeJS.ErrnoException)=>{if(error.code==='ENOENT')return [];throw error;});
  for(const name of names){if(!/^[a-f0-9]{16}\.json$/.test(name))continue;const prior=await load(root,name.slice(0,16));if(prior.sha256===current.sha256&&prior.integrationId===account.id&&['submitting','submitted','outcome_unknown'].includes(prior.status))throw new Error('POSTIZ_VIDEO_ALREADY_ATTEMPTED');}
  return save(root,{schemaVersion:1,workflowId:current.workflow.workflowId,render:path.relative(root,current.render),sha256:current.sha256,bytes:current.bytes,caption:clean,apiUrl:base,integrationId:account.id,integrationName:account.name,provider:account.provider,visibility:chosen,approvalCode,status:'awaiting_approval',approvedAt:null,attemptedAt:null,mediaPath:null,postIds:[],reason:null});
}
export async function approvePostizPost(root:string,code:string){const record=await load(root,code);if(record.status!=='awaiting_approval'&&record.status!=='action_required')throw new Error('POSTIZ_NOT_AWAITING_APPROVAL');await assertVideo(root,record);record.status='approved';record.approvedAt=new Date().toISOString();record.reason=null;return save(root,record);}
export async function postizPostStatus(root:string,code:string){const record=await load(root,code);return {...record,video:path.join(root,record.render)};}
export async function inspectPostizPost(root:string,code:string,keyFile:string,transport:Transport=fetch){
  const record=await load(root,code);if(!record.attemptedAt)throw new Error('POSTIZ_POST_NOT_SUBMITTED');
  const key=await apiKey(keyFile,root),base=apiBase(record.apiUrl),from=new Date(Date.parse(record.attemptedAt)-24*60*60*1000),to=new Date(Date.now()+24*60*60*1000);
  const query=new URLSearchParams({startDate:from.toISOString(),endDate:to.toISOString()});
  const result=await request(base,key,`/posts?${query}`,{},transport);if(!Array.isArray(result?.posts))throw new Error('POSTIZ_POSTS_RESPONSE_INVALID');
  const matches=result.posts.filter((item:any)=>record.postIds.includes(String(item?.id||'')));
  return {...await postizPostStatus(root,code),remotePosts:matches.map((item:any)=>({id:String(item.id),state:String(item.state||''),releaseURL:typeof item.releaseURL==='string'?item.releaseURL:null}))};
}

export async function submitPostizPost(root:string,code:string,keyFile:string,transport:Transport=fetch){
  const record=await load(root,code);if(record.status!=='approved'||!record.approvedAt)throw new Error('POSTIZ_NOT_APPROVED');const current=await assertVideo(root,record),key=await apiKey(keyFile,root),base=apiBase(record.apiUrl);
  const lockPath=`${file(root,code)}.lock`,lock=await open(lockPath,'wx',0o600).catch(()=>{throw new Error('POSTIZ_POST_IN_PROGRESS');});let attempted=false;
  try{
    const account=await channel(base,key,record.integrationId,transport);if(account.provider!==record.provider||account.name!==record.integrationName)throw new Error('POSTIZ_CHANNEL_CHANGED');
    const settings=await request(base,key,`/integration-settings/${encodeURIComponent(record.integrationId)}`,{},transport);if(!settings?.output||typeof settings.output.rules!=='string')throw new Error('POSTIZ_SETTINGS_UNAVAILABLE');
    if(record.caption.length>Number(settings.output.maxLength||0)&&Number(settings.output.maxLength||0)>0)throw new Error('POSTIZ_CAPTION_TOO_LONG');
    record.status='uploading';await save(root,record);
    const form=new FormData();form.append('file',await openAsBlob(current.render,{type:'video/mp4'}),path.basename(current.render));
    const uploaded=await request(base,key,'/upload',{method:'POST',body:form},transport);
    let mediaUrl:URL;try{mediaUrl=new URL(String(uploaded?.path||''));}catch{throw new Error('POSTIZ_UPLOAD_RESPONSE_INVALID');}
    if(mediaUrl.protocol!=='https:'||mediaUrl.username||mediaUrl.password||['localhost','127.0.0.1','[::1]'].includes(mediaUrl.hostname))throw new Error('POSTIZ_UPLOAD_PUBLIC_HTTPS_REQUIRED');
    record.mediaPath=mediaUrl.href;await save(root,record);
    await assertVideo(root,record);
    const providerSettings=record.provider==='tiktok'?{__type:'tiktok',content_posting_method:'DIRECT_POST',privacy_level:record.visibility,duet:false,stitch:false,comment:false,brand_content_toggle:false,brand_organic_toggle:false}:{__type:'facebook'};
    const payload={type:'now',date:new Date().toISOString(),shortLink:false,tags:[],posts:[{integration:{id:record.integrationId},value:[{content:record.caption,image:[{id:String(uploaded.id||mediaUrl.href),path:mediaUrl.href}]}],settings:providerSettings}]};
    record.status='submitting';record.attemptedAt=new Date().toISOString();await save(root,record);attempted=true;
    const result=await request(base,key,'/posts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)},transport);
    const posts=Array.isArray(result)?result:Array.isArray(result?.posts)?result.posts:result?[result]:[];
    record.postIds=posts.map((item:any)=>String(item?.postId||item?.id||'')).filter(Boolean);
    if(record.postIds.length!==1)throw new Error('POSTIZ_CREATE_RESPONSE_UNIDENTIFIED');
    record.status='submitted';record.reason='POSTIZ_ACCEPTED_VERIFY_ON_PLATFORM';await save(root,record);
    return postizPostStatus(root,code);
  }catch(error){record.status=attempted?'outcome_unknown':'action_required';record.reason=error instanceof Error?error.message:String(error);await save(root,record);throw error;}finally{await lock.close();await unlink(lockPath).catch(()=>{});}
}
