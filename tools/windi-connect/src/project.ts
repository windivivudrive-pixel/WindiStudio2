import {mkdir,readFile,writeFile,rename,realpath,lstat,access} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import type {Store,ProjectRow} from './store.ts';

export type ProjectFile={version:1;id:string;root:string;defaults:{outputDir:string;provider:'flow'|'chatgpt'}};
const projectDir='.windi';const projectName='project.json';
const isInside=(root:string,target:string)=>target===root||target.startsWith(`${root}${path.sep}`);

export async function canonicalRoot(value:string){const root=await realpath(path.resolve(value)).catch(()=>null);if(!root)throw new Error('PROJECT_DIRECTORY_NOT_FOUND');const info=await lstat(root);if(!info.isDirectory()||info.isSymbolicLink())throw new Error('PROJECT_ROOT_MUST_BE_REAL_DIRECTORY');return root;}
export function projectFilePath(root:string){return path.join(root,projectDir,projectName);}
export async function readProjectFile(root:string):Promise<ProjectFile|undefined>{
  const file=projectFilePath(root);const raw=await readFile(file,'utf8').catch(error=>{if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;});
  if(raw===null)return undefined;
  const data=JSON.parse(raw) as ProjectFile;
  if(data.version!==1||!data.id||!data.defaults?.outputDir)throw new Error('INVALID_PROJECT_FILE');
  return data;
}
async function safeDirectory(root:string,relative:string,create:boolean){
  const target=path.resolve(root,relative);if(!isInside(root,target))throw new Error('PATH_OUTSIDE_PROJECT');
  const parts=path.relative(root,target).split(path.sep).filter(Boolean);let current=root;
  for(const part of parts){current=path.join(current,part);const info=await lstat(current).catch(()=>null);if(info?.isSymbolicLink())throw new Error('SYMLINK_PATH_REJECTED');if(!info&&create)await mkdir(current,{recursive:false,mode:0o700});}
  return target;
}
export async function writeProjectFile(root:string,data:ProjectFile){
  const dot=await safeDirectory(root,projectDir,true);const file=path.join(dot,projectName);const info=await lstat(file).catch(()=>null);if(info?.isSymbolicLink())throw new Error('SYMLINK_PATH_REJECTED');
  const temporary=path.join(dot,`.project-${randomUUID()}.tmp`);await writeFile(temporary,`${JSON.stringify(data,null,2)}\n`,{encoding:'utf8',mode:0o600});await rename(temporary,file);
}
export async function registerProject(store:Store,workingDirectory:string,mode:'prompt'|'relink'|'fork'='prompt'){
  const root=await canonicalRoot(workingDirectory);const file=await readProjectFile(root);
  if(!file){
    const existing=store.projectByRoot(root);const record=existing||store.createProject(randomUUID(),root,'assets/windi');
    const created:ProjectFile={version:1,id:record.id,root,defaults:{outputDir:record.output_dir,provider:'flow'}};await writeProjectFile(root,created);return {project:record,created:true,conflict:null};
  }
  const exact=store.projectByRoot(root);
  if(exact&&exact.id===file.id)return {project:exact,created:false,conflict:null};
  const old=store.projectByOtherRoot(file.id,root);
  if(old){
    if(mode==='prompt')return {project:null,created:false,conflict:{id:file.id,oldRoot:old.root,newRoot:root}};
    if(mode==='relink'){
      const updated=store.relinkProject(file.id,old.root,root);if(!updated)throw new Error('PROJECT_RELINK_FAILED');await writeProjectFile(root,{...file,root});return {project:updated,created:false,conflict:null};
    }
    const independent=store.createProject(randomUUID(),root,file.defaults.outputDir);const copy:ProjectFile={...file,id:independent.id,root};await writeProjectFile(root,copy);return {project:independent,created:true,conflict:null};
  }
  if(exact&&exact.id!==file.id){
    if(mode!=='fork')return {project:null,created:false,conflict:{id:file.id,oldRoot:'(ID already used by this folder)',newRoot:root}};
    const independent=store.createProject(randomUUID(),root,file.defaults.outputDir);await writeProjectFile(root,{...file,id:independent.id,root});return {project:independent,created:true,conflict:null};
  }
  const recovered=store.createProject(file.id,root,file.defaults.outputDir);return {project:recovered,created:true,conflict:null};
}
export async function loadedProject(store:Store,workingDirectory:string):Promise<{project:ProjectRow;config:ProjectFile}> {
  const root=await canonicalRoot(workingDirectory);const config=await readProjectFile(root);if(!config)throw new Error('PROJECT_NOT_INITIALIZED');const project=store.projectById(config.id);if(!project)throw new Error('PROJECT_NOT_REGISTERED');if(project.root!==root)throw new Error('PROJECT_ID_PATH_CONFLICT');return {project,config};
}
export async function readProjectText(root:string,input:string){const file=await safeFile(root,input,false);const content=await readFile(file,'utf8');if(!content.trim())throw new Error('PROMPT_FILE_EMPTY');return {file,content};}
export async function safeFile(root:string,input:string,required=true){
  const target=path.resolve(root,input);if(!isInside(root,target))throw new Error('PATH_OUTSIDE_PROJECT');
  const relative=path.relative(root,target);const parent=path.dirname(relative);if(parent&&parent!=='.')await safeDirectory(root,parent,false);
  const info=await lstat(target).catch(()=>null);if(!info){if(required)throw new Error('PROJECT_FILE_NOT_FOUND');return target;}if(!info.isFile()||info.isSymbolicLink())throw new Error('INVALID_PROJECT_FILE');return target;
}
export async function safeOutput(root:string,output:string){
  if(path.isAbsolute(output)&&!isInside(root,path.resolve(output)))throw new Error('OUTPUT_OUTSIDE_PROJECT');
  const target=path.resolve(root,output);if(!isInside(root,target))throw new Error('OUTPUT_OUTSIDE_PROJECT');
  await safeDirectory(root,path.relative(root,path.dirname(target)),true);const info=await lstat(target).catch(()=>null);if(info?.isSymbolicLink())throw new Error('SYMLINK_PATH_REJECTED');return target;
}
export async function uniqueOutput(target:string){
  if(!await exists(target))return target;const ext=path.extname(target);const base=ext?target.slice(0,-ext.length):target;
  for(let i=2;i<10_000;i++){const candidate=`${base}-v${String(i).padStart(2,'0')}${ext}`;if(!await exists(candidate))return candidate;}
  throw new Error('OUTPUT_VERSION_LIMIT');
}
export async function exists(target:string){try{await access(target,constants.F_OK);return true;}catch{return false;}}
