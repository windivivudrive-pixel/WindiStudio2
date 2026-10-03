import {cp,access,rm,symlink} from 'node:fs/promises';
import path from 'node:path';

// fs.cp otherwise rewrites relative links to absolute paths in the temporary
// extraction folder, and copying over a dangling link fails on a later update.
export async function copyNodeRuntime(source,target,{windows=process.platform==='win32'}={}){
 if(path.resolve(source)!==path.resolve(target)){
  if(!windows)for(const name of ['npm','npx','corepack'])await rm(path.join(target,'bin',name),{force:true});
  await cp(source,target,{recursive:true,verbatimSymlinks:true});
 }
 if(windows)return;
 for(const [name,relative] of [['npm','../lib/node_modules/npm/bin/npm-cli.js'],['npx','../lib/node_modules/npm/bin/npx-cli.js'],['corepack','../lib/node_modules/corepack/dist/corepack.js']]){
  const executable=path.join(target,'bin',name);
  const present=await access(path.resolve(target,'bin',relative)).then(()=>true).catch(()=>false);
  if(!present&&name!=='corepack')throw new Error(`Missing Node runtime ${name}`);
  await rm(executable,{force:true});
  if(present)await symlink(relative,executable);
 }
}
