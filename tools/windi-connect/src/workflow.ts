import path from 'node:path';
import {mkdir,readFile,writeFile,rename,lstat,copyFile,realpath,readdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {safeFile,safeOutput} from './project.ts';

export const workflowStages=['needs_setup','idea_review','layout_review','script_review','assets','voice','timing','render','qa','complete'] as const;
export type WorkflowStage=typeof workflowStages[number];
export type LayoutPreset='paper-editorial'|'dark-cinematic';
export type SceneComposition='full-bleed'|'framed'|'split'|'text-led'|'quote'|'comparison'|'cta';

export type LayoutArtifact={
  schemaVersion:1;
  version:number;
  ideaId:string;
  id:string;
  name:string;
  source:
    |{kind:'builtin';preset:LayoutPreset}
    |{kind:'reference';reference:string;analyzer:'bradautomates/claude-video';detail:'balanced';evidenceDir:string};
  basePreset:LayoutPreset;
  renderer?:'ws1-reference-hybrid-flow';
  imageIdentityLock?:Record<string,unknown>;
  summary:string;
  pacing:{hookDurationMs:number;averageBeatDurationMs:number;cutRhythm:string};
  palette:{background:string;surface:string;text:string;accent:string;border:string};
  captions:{position:'top'|'center'|'bottom';style:'boxed'|'pill'|'plain'};
  sceneTypes:Array<{id:string;role:string;composition:SceneComposition;textPosition:'top'|'center'|'bottom';imageFit:'cover'|'contain'}>;
};

export type Idea={id:string;title:string;hook:string;angle:string;audience?:string};
export type IdeasArtifact={schemaVersion:1;version:number;ideas:Idea[]};
export type ScriptBeat={
  id:string;voiceOver:string;onScreenText:string;visualDescription:string;imagePrompt:string;
  motion:string;layout:string;spokenAnchor:string;estimatedDurationMs?:number;
};
export type ScriptArtifact={schemaVersion:1;version:number;ideaId:string;title:string;language:string;beats:ScriptBeat[]};
type Approval={status:'pending'|'approved';artifact:string|null;version:number|null;approvedAt:string|null};
export type WorkflowState={
  schemaVersion:1;workflowId:string;projectId:string;stage:WorkflowStage;
  brief:{topic:string;audience:string;style:string;layout:LayoutPreset|null;imageProvider:'flow'|'chatgpt'};
  current:{ideas:string|null;layout:string|null;script:string|null};
  approvals:{idea:Approval&{ideaId?:string|null};layout:Approval&{layoutId?:string|null};script:Approval};
  artifacts:{imageManifest:string|null;voice:string|null;captions:string|null;render:string|null;cover:string|null;qa:string|null};
  invalidated:{at:string;reason:string;paths:string[]}|null;
  createdAt:string;updatedAt:string;
};

const workflowDir=(root:string)=>path.join(root,'.windi');
export const workflowFile=(root:string)=>path.join(workflowDir(root),'workflow.json');
const outputRoot=(root:string)=>path.join(root,'windi');
const isRecord=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const text=(value:unknown,name:string,max=20_000)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error(`INVALID_${name.toUpperCase()}`);return value.trim();};
const integer=(value:unknown,name:string)=>{if(!Number.isSafeInteger(value)||Number(value)<1)throw new Error(`INVALID_${name.toUpperCase()}`);return Number(value);};
const now=()=>new Date().toISOString();

async function atomicJson(file:string,value:unknown){
  await mkdir(path.dirname(file),{recursive:true,mode:0o700});
  const existing=await lstat(file).catch(()=>null);if(existing?.isSymbolicLink())throw new Error('SYMLINK_PATH_REJECTED');
  const temporary=path.join(path.dirname(file),`.${path.basename(file)}-${randomUUID()}.tmp`);
  await writeFile(temporary,`${JSON.stringify(value,null,2)}\n`,{encoding:'utf8',mode:0o600});
  await rename(temporary,file);
}
async function readJson(file:string){return JSON.parse(await readFile(file,'utf8')) as unknown;}

export function validateIdeas(value:unknown):IdeasArtifact{
  if(!isRecord(value)||value.schemaVersion!==1||!Array.isArray(value.ideas))throw new Error('INVALID_IDEAS_ARTIFACT');
  const ids=new Set<string>();
  const ideas=value.ideas.map((entry,index)=>{
    if(!isRecord(entry))throw new Error(`INVALID_IDEA_${index+1}`);
    const id=text(entry.id,'idea_id',100);if(ids.has(id))throw new Error('DUPLICATE_IDEA_ID');ids.add(id);
    return {id,title:text(entry.title,'idea_title',300),hook:text(entry.hook,'idea_hook',1000),angle:text(entry.angle,'idea_angle',2000),...(typeof entry.audience==='string'?{audience:entry.audience.trim()}: {})};
  });
  if(ideas.length<1||ideas.length>12)throw new Error('INVALID_IDEA_COUNT');
  return {schemaVersion:1,version:integer(value.version,'idea_version'),ideas};
}

export function validateScript(value:unknown):ScriptArtifact{
  if(!isRecord(value)||value.schemaVersion!==1||!Array.isArray(value.beats))throw new Error('INVALID_SCRIPT_ARTIFACT');
  const ids=new Set<string>();
  const beats=value.beats.map((entry,index)=>{
    if(!isRecord(entry))throw new Error(`INVALID_BEAT_${index+1}`);
    const id=text(entry.id,'beat_id',100);if(ids.has(id))throw new Error('DUPLICATE_BEAT_ID');ids.add(id);
    const estimated=entry.estimatedDurationMs===undefined?undefined:integer(entry.estimatedDurationMs,'estimated_duration');
    return {id,voiceOver:text(entry.voiceOver,'voice_over'),onScreenText:text(entry.onScreenText,'on_screen_text',1000),visualDescription:text(entry.visualDescription,'visual_description'),imagePrompt:text(entry.imagePrompt,'image_prompt'),motion:text(entry.motion,'motion',500),layout:text(entry.layout,'layout',500),spokenAnchor:text(entry.spokenAnchor,'spoken_anchor',500),...(estimated?{estimatedDurationMs:estimated}: {})};
  });
  if(beats.length<1||beats.length>60)throw new Error('INVALID_BEAT_COUNT');
  return {schemaVersion:1,version:integer(value.version,'script_version'),ideaId:text(value.ideaId,'idea_id',100),title:text(value.title,'script_title',300),language:text(value.language,'language',20),beats};
}

const color=(value:unknown,name:string)=>{const parsed=text(value,name,32);if(!/^#[0-9a-f]{6}$/i.test(parsed))throw new Error(`INVALID_${name.toUpperCase()}`);return parsed.toLowerCase();};
export function validateLayout(value:unknown):LayoutArtifact{
  if(!isRecord(value)||value.schemaVersion!==1||!isRecord(value.source)||!isRecord(value.pacing)||!isRecord(value.palette)||!isRecord(value.captions)||!Array.isArray(value.sceneTypes))throw new Error('INVALID_LAYOUT_ARTIFACT');
  const basePreset=value.basePreset==='dark-cinematic'?'dark-cinematic':value.basePreset==='paper-editorial'?'paper-editorial':null;if(!basePreset)throw new Error('INVALID_BASE_PRESET');
  if(value.renderer!==undefined&&value.renderer!=='ws1-reference-hybrid-flow')throw new Error('UNSUPPORTED_LAYOUT_RENDERER');
  if(value.imageIdentityLock!==undefined&&!isRecord(value.imageIdentityLock))throw new Error('INVALID_IMAGE_IDENTITY_LOCK');
  let source:LayoutArtifact['source'];
  if(value.source.kind==='builtin'){
    const preset=value.source.preset==='dark-cinematic'?'dark-cinematic':value.source.preset==='paper-editorial'?'paper-editorial':null;if(!preset)throw new Error('INVALID_LAYOUT_PRESET');source={kind:'builtin',preset};
  }else if(value.source.kind==='reference'){
    if(value.source.analyzer!=='bradautomates/claude-video'||value.source.detail!=='balanced')throw new Error('INVALID_LAYOUT_ANALYZER');
    source={kind:'reference',reference:text(value.source.reference,'layout_reference',4000),analyzer:'bradautomates/claude-video',detail:'balanced',evidenceDir:text(value.source.evidenceDir,'layout_evidence_dir',1000)};
  }else throw new Error('INVALID_LAYOUT_SOURCE');
  const positions=['top','center','bottom'] as const,styles=['boxed','pill','plain'] as const,compositions=['full-bleed','framed','split','text-led','quote','comparison','cta'] as const;
  if(!positions.includes(value.captions.position as typeof positions[number])||!styles.includes(value.captions.style as typeof styles[number]))throw new Error('INVALID_LAYOUT_CAPTIONS');
  const ids=new Set<string>();const sceneTypes=value.sceneTypes.map((entry,index)=>{
    if(!isRecord(entry))throw new Error(`INVALID_LAYOUT_SCENE_${index+1}`);const id=text(entry.id,'layout_scene_id',100);if(ids.has(id))throw new Error('DUPLICATE_LAYOUT_SCENE_ID');ids.add(id);
    if(!compositions.includes(entry.composition as SceneComposition)||!positions.includes(entry.textPosition as typeof positions[number])||(entry.imageFit!=='cover'&&entry.imageFit!=='contain'))throw new Error(`INVALID_LAYOUT_SCENE_${index+1}`);
    return {id,role:text(entry.role,'layout_scene_role',300),composition:entry.composition as SceneComposition,textPosition:entry.textPosition as 'top'|'center'|'bottom',imageFit:entry.imageFit as 'cover'|'contain'};
  });if(!sceneTypes.length||sceneTypes.length>20)throw new Error('INVALID_LAYOUT_SCENE_COUNT');
  return {...(value.renderer?{renderer:value.renderer as 'ws1-reference-hybrid-flow'}:{}),...(isRecord(value.imageIdentityLock)?{imageIdentityLock:value.imageIdentityLock}:{}),schemaVersion:1,version:integer(value.version,'layout_version'),ideaId:text(value.ideaId,'idea_id',100),id:text(value.id,'layout_id',100),name:text(value.name,'layout_name',200),source,basePreset,summary:text(value.summary,'layout_summary',4000),pacing:{hookDurationMs:integer(value.pacing.hookDurationMs,'hook_duration'),averageBeatDurationMs:integer(value.pacing.averageBeatDurationMs,'average_beat_duration'),cutRhythm:text(value.pacing.cutRhythm,'cut_rhythm',500)},palette:{background:color(value.palette.background,'layout_background'),surface:color(value.palette.surface,'layout_surface'),text:color(value.palette.text,'layout_text'),accent:color(value.palette.accent,'layout_accent'),border:color(value.palette.border,'layout_border')},captions:{position:value.captions.position as 'top'|'center'|'bottom',style:value.captions.style as 'boxed'|'pill'|'plain'},sceneTypes};
}

function builtinLayout(ideaId:string,preset:LayoutPreset,version=1):LayoutArtifact{
  const dark=preset==='dark-cinematic';
  return {schemaVersion:1,version,ideaId,id:preset,name:dark?'Dark Cinematic':'Paper Editorial',source:{kind:'builtin',preset},basePreset:preset,summary:dark?'Ảnh toàn khung, tương phản mạnh, headline lớn và nhịp dựng điện ảnh.':'Khung giấy sáng, card biên tập, bố cục rõ ràng và nhịp kể chuyện dễ đọc.',pacing:{hookDurationMs:1800,averageBeatDurationMs:3500,cutRhythm:dark?'nhanh ở hook, chậm dần ở phần giải thích':'đều, rõ và ưu tiên khả năng đọc'},palette:dark?{background:'#0d1212',surface:'#182020',text:'#f7f0dd',accent:'#f05482',border:'#f1e9d4'}:{background:'#d3e9f8',surface:'#fff9e8',text:'#26342f',accent:'#4aa36f',border:'#2d3832'},captions:{position:'bottom',style:'boxed'},sceneTypes:[{id:'hook',role:'Mở đầu và tạo tò mò',composition:dark?'full-bleed':'framed',textPosition:'bottom',imageFit:'cover'},{id:'full-frame',role:'Kể chuyện bằng một hình chính',composition:'full-bleed',textPosition:'bottom',imageFit:'cover'},{id:'explain',role:'Giải thích nội dung',composition:dark?'split':'framed',textPosition:'bottom',imageFit:'cover'},{id:'quote',role:'Nhấn mạnh một câu nói',composition:'quote',textPosition:'center',imageFit:'cover'},{id:'comparison',role:'So sánh hai ý',composition:'comparison',textPosition:'top',imageFit:'cover'},{id:'cta',role:'Kết luận hoặc kêu gọi hành động',composition:'cta',textPosition:'center',imageFit:'cover'}]};
}

export async function loadWorkflow(root:string):Promise<WorkflowState>{
  const value=await readJson(workflowFile(root)).catch((error:NodeJS.ErrnoException)=>{if(error.code==='ENOENT')throw new Error('WORKFLOW_NOT_STARTED');throw error;});
  if(!isRecord(value)||value.schemaVersion!==1||!workflowStages.includes(value.stage as WorkflowStage))throw new Error('INVALID_WORKFLOW_STATE');
  const state=value as unknown as WorkflowState;let migrated=false;
  if(!isRecord(state.current)){state.current={ideas:null,layout:null,script:null};migrated=true;}else if((state.current as unknown as Record<string,unknown>).layout===undefined){state.current.layout=null;migrated=true;}
  if(!isRecord(state.approvals))throw new Error('INVALID_WORKFLOW_APPROVALS');
  if(!isRecord(state.approvals.layout)){state.approvals.layout={status:'pending',artifact:null,version:null,approvedAt:null,layoutId:null};migrated=true;}
  if((state.brief as unknown as Record<string,unknown>).layout===undefined){state.brief.layout=null;migrated=true;}
  if(state.approvals.idea?.status==='approved'&&!state.current.layout){
    const progressed=!!state.current.script||workflowStages.indexOf(state.stage)>=workflowStages.indexOf('assets');
    if(progressed){
      const preset=state.brief.layout==='dark-cinematic'?'dark-cinematic':'paper-editorial';const artifact=builtinLayout(state.approvals.idea.ideaId||'legacy-idea',preset);const target=path.join(outputRoot(root),'layouts','layout-v01-legacy.json');await atomicJson(target,artifact);state.current.layout=path.relative(root,target);state.brief.layout=preset;state.approvals.layout={status:'approved',artifact:state.current.layout,version:1,approvedAt:state.approvals.idea.approvedAt,layoutId:preset};migrated=true;
    }else if(state.stage==='script_review'){state.stage='layout_review';migrated=true;}
  }
  if(migrated)await atomicJson(workflowFile(root),state);
  return state;
}
export async function saveWorkflow(root:string,state:WorkflowState){state.updatedAt=now();await atomicJson(workflowFile(root),state);return state;}

export async function startWorkflow(root:string,projectId:string,input:Record<string,unknown>){
  const prior=await loadWorkflow(root).catch((error:Error)=>error.message==='WORKFLOW_NOT_STARTED'?null:Promise.reject(error));
  if(prior&&!input.reset)return prior;
  const provider=input.imageProvider==='chatgpt'?'chatgpt':'flow';
  const at=now();
  const state:WorkflowState={schemaVersion:1,workflowId:randomUUID(),projectId,stage:'idea_review',brief:{topic:text(input.topic,'topic',2000),audience:text(input.audience,'audience',1000),style:text(input.style,'style',1000),layout:null,imageProvider:provider},current:{ideas:null,layout:null,script:null},approvals:{idea:{status:'pending',artifact:null,version:null,approvedAt:null,ideaId:null},layout:{status:'pending',artifact:null,version:null,approvedAt:null,layoutId:null},script:{status:'pending',artifact:null,version:null,approvedAt:null}},artifacts:{imageManifest:null,voice:null,captions:null,render:null,cover:null,qa:null},invalidated:null,createdAt:at,updatedAt:at};
  for(const dir of ['ideas','layouts','layout-analysis','scripts','manifests','prompts','voice','timing','renders','qa'])await mkdir(path.join(outputRoot(root),dir),{recursive:true,mode:0o700});
  await saveWorkflow(root,state);return state;
}

function clearProduction(state:WorkflowState,reason:string){
  const paths=Object.values(state.artifacts).filter((item):item is string=>typeof item==='string');
  state.invalidated={at:now(),reason,paths};
  state.artifacts={imageManifest:null,voice:null,captions:null,render:null,cover:null,qa:null};
}

export async function putWorkflowArtifact(root:string,kind:'idea'|'layout'|'script',inputFile:string){
  const state=await loadWorkflow(root);const source=await safeFile(root,inputFile);const parsed=await readJson(source);
  if(kind==='idea'){
    const artifact=validateIdeas(parsed);const destination=path.join(outputRoot(root),'ideas',`ideas-v${String(artifact.version).padStart(2,'0')}.json`);
    await copyFile(source,destination).catch(async error=>{if(path.resolve(source)!==destination)throw error;});
    state.current.ideas=path.relative(root,destination);state.current.layout=null;state.current.script=null;state.brief.layout=null;state.stage='idea_review';
    state.approvals.idea={status:'pending',artifact:state.current.ideas,version:artifact.version,approvedAt:null,ideaId:null};state.approvals.layout={status:'pending',artifact:null,version:null,approvedAt:null,layoutId:null};state.approvals.script={status:'pending',artifact:null,version:null,approvedAt:null};clearProduction(state,'idea_version_changed');
  }else if(kind==='layout'){
    if(state.approvals.idea.status!=='approved'||!state.approvals.idea.ideaId)throw new Error('IDEA_APPROVAL_REQUIRED');
    const artifact=validateLayout(parsed);if(artifact.ideaId!==state.approvals.idea.ideaId)throw new Error('LAYOUT_IDEA_MISMATCH');
    if(artifact.source.kind==='reference'){
      const [canonicalProject,canonicalEvidence]=await Promise.all([realpath(root),realpath(path.resolve(root,artifact.source.evidenceDir)).catch(()=>null)]);if(!canonicalEvidence||!(canonicalEvidence===canonicalProject||canonicalEvidence.startsWith(`${canonicalProject}${path.sep}`)))throw new Error('LAYOUT_EVIDENCE_OUTSIDE_PROJECT');const info=await lstat(canonicalEvidence);if(!info.isDirectory()||info.isSymbolicLink())throw new Error('INVALID_LAYOUT_EVIDENCE_DIR');if(!(await readdir(canonicalEvidence)).length)throw new Error('LAYOUT_EVIDENCE_EMPTY');
    }
    const destination=path.join(outputRoot(root),'layouts',`layout-v${String(artifact.version).padStart(2,'0')}.json`);await copyFile(source,destination).catch(async error=>{if(path.resolve(source)!==destination)throw error;});
    state.current.layout=path.relative(root,destination);state.current.script=null;state.brief.layout=artifact.basePreset;state.stage='layout_review';state.approvals.layout={status:'pending',artifact:state.current.layout,version:artifact.version,approvedAt:null,layoutId:artifact.id};state.approvals.script={status:'pending',artifact:null,version:null,approvedAt:null};clearProduction(state,'layout_version_changed');
  }else{
    if(state.approvals.idea.status!=='approved'||!state.approvals.idea.ideaId)throw new Error('IDEA_APPROVAL_REQUIRED');
    if(state.approvals.layout.status!=='approved'||!state.current.layout)throw new Error('LAYOUT_APPROVAL_REQUIRED');
    const layout=validateLayout(await readJson(path.join(root,state.current.layout)));const artifact=validateScript(parsed);if(artifact.ideaId!==state.approvals.idea.ideaId)throw new Error('SCRIPT_IDEA_MISMATCH');
    const sceneTypes=new Set(layout.sceneTypes.map(scene=>scene.id));for(const beat of artifact.beats)if(!sceneTypes.has(beat.layout))throw new Error(`UNKNOWN_BEAT_LAYOUT_${beat.layout}`);
    const destination=path.join(outputRoot(root),'scripts',`script-v${String(artifact.version).padStart(2,'0')}.json`);
    await copyFile(source,destination).catch(async error=>{if(path.resolve(source)!==destination)throw error;});
    const changed=state.current.script!==path.relative(root,destination)||state.approvals.script.version!==artifact.version;
    state.current.script=path.relative(root,destination);state.stage='script_review';state.approvals.script={status:'pending',artifact:state.current.script,version:artifact.version,approvedAt:null};if(changed)clearProduction(state,'script_version_changed');
  }
  return saveWorkflow(root,state);
}

export async function chooseBuiltinLayout(root:string,preset:LayoutPreset){
  const state=await loadWorkflow(root);if(state.stage!=='layout_review'||state.approvals.idea.status!=='approved'||!state.approvals.idea.ideaId)throw new Error('LAYOUT_REVIEW_REQUIRED');
  const artifact=builtinLayout(state.approvals.idea.ideaId,preset);const target=path.join(outputRoot(root),'layouts','layout-v01.json');await atomicJson(target,artifact);state.current.layout=path.relative(root,target);state.current.script=null;state.brief.layout=preset;state.approvals.layout={status:'pending',artifact:state.current.layout,version:artifact.version,approvedAt:null,layoutId:artifact.id};state.approvals.script={status:'pending',artifact:null,version:null,approvedAt:null};clearProduction(state,'layout_selected');return saveWorkflow(root,state);
}

export async function loadApprovedLayout(root:string,state?:WorkflowState){state??=await loadWorkflow(root);if(state.approvals.layout.status!=='approved'||!state.current.layout)throw new Error('LAYOUT_APPROVAL_REQUIRED');return validateLayout(await readJson(path.join(root,state.current.layout)));}

export async function approveWorkflow(root:string,kind:'idea'|'layout'|'script',value:string){
  const state=await loadWorkflow(root);
  if(kind==='idea'){
    if(state.stage!=='idea_review'||!state.current.ideas)throw new Error('IDEA_ARTIFACT_REQUIRED');
    const ideas=validateIdeas(await readJson(path.join(root,state.current.ideas)));if(!ideas.ideas.some(idea=>idea.id===value))throw new Error('IDEA_NOT_FOUND');
    state.approvals.idea={status:'approved',artifact:state.current.ideas,version:ideas.version,approvedAt:now(),ideaId:value};state.current.layout=null;state.current.script=null;state.brief.layout=null;state.approvals.layout={status:'pending',artifact:null,version:null,approvedAt:null,layoutId:null};state.approvals.script={status:'pending',artifact:null,version:null,approvedAt:null};state.stage='layout_review';
  }else if(kind==='layout'){
    if(state.stage!=='layout_review'||!state.current.layout)throw new Error('LAYOUT_ARTIFACT_REQUIRED');const layout=validateLayout(await readJson(path.join(root,state.current.layout)));if(String(layout.version)!==String(value))throw new Error('LAYOUT_VERSION_MISMATCH');state.approvals.layout={status:'approved',artifact:state.current.layout,version:layout.version,approvedAt:now(),layoutId:layout.id};state.stage='script_review';
  }else{
    if(state.stage!=='script_review'||!state.current.script)throw new Error('SCRIPT_ARTIFACT_REQUIRED');
    const script=validateScript(await readJson(path.join(root,state.current.script)));if(String(script.version)!==String(value))throw new Error('SCRIPT_VERSION_MISMATCH');
    state.approvals.script={status:'approved',artifact:state.current.script,version:script.version,approvedAt:now()};state.stage='assets';
  }
  return saveWorkflow(root,state);
}

export type ImageManifest={version:1;workflowId:string;scriptVersion:number;project:string;jobs:Array<{scene:string;provider:'flow'|'chatgpt';kind:'create';promptFile:string;references:string[];output:string;requestKey:string}>};
export async function buildImageManifest(root:string,state?:WorkflowState):Promise<ImageManifest>{
  state??=await loadWorkflow(root);if(state.approvals.layout.status!=='approved')throw new Error('LAYOUT_APPROVAL_REQUIRED');if(state.approvals.script.status!=='approved'||!state.current.script)throw new Error('SCRIPT_APPROVAL_REQUIRED');
  const script=validateScript(await readJson(path.join(root,state.current.script)));const jobs=[];
  for(const [index,beat] of script.beats.entries()){
    const scene=`scene-${String(index+1).padStart(2,'0')}`;const version=`v${String(script.version).padStart(2,'0')}`;const promptFile=path.join('windi','prompts',`${scene}-${version}.txt`);const output=path.join('assets','windi',`${scene}-${version}`);
    await safeOutput(root,promptFile);await writeFile(path.join(root,promptFile),`${beat.imagePrompt}\n`,{encoding:'utf8',mode:0o600});
    const requestKey=createHash('sha256').update(`${state.workflowId}:${script.version}:${beat.id}:${beat.imagePrompt}:${state.brief.imageProvider}`).digest('hex').slice(0,32);
    jobs.push({scene,provider:state.brief.imageProvider,kind:'create' as const,promptFile,references:[],output,requestKey});
  }
  const manifest:ImageManifest={version:1,workflowId:state.workflowId,scriptVersion:script.version,project:root,jobs};const target=path.join(outputRoot(root),'manifests',`images-script-v${String(script.version).padStart(2,'0')}.json`);await atomicJson(target,manifest);state.artifacts.imageManifest=path.relative(root,target);await saveWorkflow(root,state);return manifest;
}

export async function registerVoiceArtifacts(root:string,audio:string,captions?:string){
  const state=await loadWorkflow(root);if(state.approvals.script.status!=='approved')throw new Error('SCRIPT_APPROVAL_REQUIRED');
  state.artifacts.voice=path.relative(root,await safeFile(root,audio));if(captions){const file=await safeFile(root,captions);validateCaptions(await readJson(file));state.artifacts.captions=path.relative(root,file);state.stage='timing';}else state.stage='voice';return saveWorkflow(root,state);
}
export async function registerRenderArtifacts(root:string,input:{render:string;cover:string;captionsSrt:string;qa:string}){
  const state=await loadWorkflow(root);if(state.approvals.script.status!=='approved')throw new Error('SCRIPT_APPROVAL_REQUIRED');
  state.artifacts.render=path.relative(root,await safeFile(root,input.render));state.artifacts.cover=path.relative(root,await safeFile(root,input.cover));state.artifacts.qa=path.relative(root,await safeFile(root,input.qa));
  await safeFile(root,input.captionsSrt);state.stage='qa';const qa=await readJson(path.join(root,state.artifacts.qa));if(isRecord(qa)&&qa.passed===true)state.stage='complete';return saveWorkflow(root,state);
}
export function validateCaptions(value:unknown){
  if(!Array.isArray(value)||!value.length)throw new Error('INVALID_CAPTIONS');let last=0;
  for(const [index,item] of value.entries()){
    if(!isRecord(item)||typeof item.text!=='string'||!item.text||typeof item.startMs!=='number'||typeof item.endMs!=='number'||item.startMs<0||item.endMs<=item.startMs||item.startMs<last)throw new Error(`INVALID_CAPTION_${index+1}`);last=item.startMs;
  }
  return value;
}

async function exists(file:string){if(await lstat(file).catch(()=>null))return true;if(path.extname(file))return false;for(const extension of ['.png','.jpg','.webp','.gif'])if(await lstat(`${file}${extension}`).catch(()=>null))return true;return false;}
export async function advanceWorkflow(root:string){
  const state=await loadWorkflow(root);
  if(state.stage==='assets'){
    const manifest=state.artifacts.imageManifest?await readJson(path.join(root,state.artifacts.imageManifest)) as ImageManifest:await buildImageManifest(root,state);
    const ready=await Promise.all(manifest.jobs.map(job=>exists(path.join(root,job.output))));
    if(ready.every(Boolean)){const {cleanWorkflowImages}=await import('./watermark.ts');await cleanWorkflowImages(root);state.stage='voice';}
  }else if(state.stage==='voice'&&state.artifacts.voice&&state.artifacts.captions){state.stage='timing';
  }else if(state.stage==='timing'&&state.artifacts.voice&&state.artifacts.captions){validateCaptions(await readJson(path.join(root,state.artifacts.captions)));state.stage='render';
  }else if(state.stage==='render'&&state.artifacts.render&&state.artifacts.cover){state.stage='qa';
  }else if(state.stage==='qa'&&state.artifacts.qa){const qa=await readJson(path.join(root,state.artifacts.qa));if(isRecord(qa)&&qa.passed===true)state.stage='complete';}
  return saveWorkflow(root,state);
}

export function workflowNextAction(state:WorkflowState){
  if(state.stage==='idea_review')return state.current.ideas?'approve_idea':'write_ideas';
  if(state.stage==='layout_review')return state.current.layout?'approve_layout':'choose_or_analyze_layout';
  if(state.stage==='script_review')return state.current.script?'approve_script':'write_script';
  if(state.stage==='assets')return 'create_images';if(state.stage==='voice')return 'generate_or_import_voice';if(state.stage==='timing')return 'validate_timing';if(state.stage==='render')return 'render_video';if(state.stage==='qa')return 'run_qa';return state.stage==='complete'?'complete':'finish_setup';
}
export function serializeWorkflow(state:WorkflowState){return {...state,nextAction:workflowNextAction(state)};}
