import {mkdir,lstat,copyFile,readFile,rename,chmod,unlink,realpath} from 'node:fs/promises';
import path from 'node:path';
import {homedir} from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {stagingRoot} from './protocol.ts';
import {safeOutput,uniqueOutput} from './project.ts';
import type {JobRow} from './store.ts';

export type ImageInfo={mime:string;width:number;height:number;extension:string};
const u16=(data:Buffer,offset:number,little=false)=>little?data.readUInt16LE(offset):data.readUInt16BE(offset);
const u32=(data:Buffer,offset:number,little=false)=>little?data.readUInt32LE(offset):data.readUInt32BE(offset);
export function inspectImage(data:Buffer):ImageInfo {
  if(data.length>=24&&data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&data.toString('ascii',12,16)==='IHDR')return {mime:'image/png',width:u32(data,16),height:u32(data,20),extension:'.png'};
  if(data.length>=10&&data[0]===0xff&&data[1]===0xd8){
    let at=2;while(at+9<data.length){if(data[at]!==0xff){at++;continue;}const marker=data[at+1];at+=2;if(marker===0xd8||marker===0xd9)continue;const length=u16(data,at);if(length<2||at+length>data.length)break;
      if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))return {mime:'image/jpeg',width:u16(data,at+5),height:u16(data,at+3),extension:'.jpg'};at+=length;
    }
  }
  if(data.length>=30&&data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP'){
    const kind=data.toString('ascii',12,16);
    if(kind==='VP8X')return {mime:'image/webp',width:1+data.readUIntLE(24,3),height:1+data.readUIntLE(27,3),extension:'.webp'};
    if(kind==='VP8 '&&data.length>=30)return {mime:'image/webp',width:u16(data,26,true)&0x3fff,height:u16(data,28,true)&0x3fff,extension:'.webp'};
    if(kind==='VP8L'&&data.length>=25){const bits=data.readUInt32LE(21);return {mime:'image/webp',width:(bits&0x3fff)+1,height:((bits>>14)&0x3fff)+1,extension:'.webp'};}
  }
  if(data.length>=10&&data.toString('ascii',0,3)==='GIF')return {mime:'image/gif',width:u16(data,6,true),height:u16(data,8,true),extension:'.gif'};
  throw new Error('UNSUPPORTED_OR_CORRUPT_IMAGE');
}

export type StagedOriginal={path:string;mime:string;width:number;height:number;sha256:string;extension:string};
export async function inspectOriginal(file:string):Promise<StagedOriginal>{
  const source=await lstat(file).catch(()=>null);if(!source?.isFile()||source.isSymbolicLink()||source.size<64||source.size>100*1024*1024)throw new Error('INVALID_DOWNLOADED_FILE');
  const bytes=await readFile(file);const info=inspectImage(bytes);if(!info.width||!info.height||info.width>32_000||info.height>32_000)throw new Error('INVALID_IMAGE_DIMENSIONS');
  return {path:file,mime:info.mime,width:info.width,height:info.height,sha256:createHash('sha256').update(bytes).digest('hex'),extension:info.extension};
}
export async function stageOriginal(job:JobRow,downloaded:string,stageRoot=stagingRoot):Promise<StagedOriginal>{
  const original=await inspectOriginal(downloaded);
  const stage=path.join(stageRoot,job.id);await mkdir(stage,{recursive:true,mode:0o700});await chmod(stage,0o700);
  const staged=path.join(stage,`original${original.extension}`);await copyFile(downloaded,staged);await chmod(staged,0o600);
  return {...original,path:staged};
}
export async function publishStaged(job:JobRow,projectRoot:string,staged:StagedOriginal){
  const source=await lstat(staged.path).catch(()=>null);if(!source?.isFile()||source.isSymbolicLink())throw new Error('STAGED_ASSET_NOT_FOUND');
  let destination=await safeOutput(projectRoot,job.output_path);const requestedExtension=path.extname(destination).toLowerCase();if(requestedExtension&&requestedExtension!==staged.extension)throw new Error(`OUTPUT_EXTENSION_MISMATCH: provider returned ${staged.extension}`);if(!requestedExtension)destination=`${destination}${staged.extension}`;destination=await uniqueOutput(destination);
  const temporary=path.join(path.dirname(destination),`.windi-${job.id}-${randomUUID()}${path.extname(destination)}`);await copyFile(staged.path,temporary);await chmod(temporary,0o600);await rename(temporary,destination);
  return {path:destination,stagingPath:staged.path,mime:staged.mime,width:staged.width,height:staged.height,sha256:staged.sha256};
}
export async function publishOriginal(job:JobRow,projectRoot:string,downloaded:string,stageRoot=stagingRoot){
  const staged=await stageOriginal(job,downloaded,stageRoot);return publishStaged(job,projectRoot,staged);
}

// Remove only the job-attributed browser copy, after verifying the published original.
export async function cleanupDownloadedOriginal(downloaded:string,published:string,sha256:string,downloadsRoot=path.join(homedir(),'Downloads')):Promise<boolean>{
  const root=await realpath(downloadsRoot).catch(()=>null);
  if(!root)return false;
  const source=await realpath(downloaded).catch(()=>null);
  if(!source||source!==path.resolve(downloaded)||!source.startsWith(root+path.sep)||source===path.resolve(published))return false;
  const [original,asset]=await Promise.all([inspectOriginal(source),inspectOriginal(published)]);
  if(original.sha256!==sha256||asset.sha256!==sha256)return false;
  await unlink(source);return true;
}
