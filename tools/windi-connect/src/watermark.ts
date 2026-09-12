import path from 'node:path';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import sharp from 'sharp';
import {removeWatermarkFromBuffer} from '@pilio/gemini-watermark-remover/node';
import {safeFile,safeOutput} from './project.ts';
import {loadWorkflow,type ImageManifest} from './workflow.ts';

const engine='gemini-watermark-remover@1.0.41';
const hash=(buffer:Buffer)=>createHash('sha256').update(buffer).digest('hex');
export async function cleanFlowImage(root:string,input:string){
  const source=await safeFile(root,input);
  const bytes=await readFile(source),sourceHash=hash(bytes);
  const dir=path.join(root,'windi','cleaned');await mkdir(dir,{recursive:true});
  const stem=`${sourceHash}-${engine.replace(/[^a-z0-9.-]/gi,'-')}`;
  const output=await safeOutput(root,path.join(dir,`${stem}.png`)),report=await safeOutput(root,path.join(dir,`${stem}.json`));
  const cached=await readFile(report,'utf8').then(JSON.parse).catch(()=>null);
  if(cached?.sourceHash===sourceHash&&cached.engine===engine){
    const previous=await readFile(output).catch(()=>null);
    if(previous&&hash(previous)===cached.outputHash)return {output,report,meta:cached.meta,cached:true};
  }
  const result=await removeWatermarkFromBuffer(bytes,{
    decodeImageData:async input=>{
      const {data,info}=await sharp(Buffer.from(input as Uint8Array)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      return {width:info.width,height:info.height,data:new Uint8ClampedArray(data)};
    },
    encodeImageData:async image=>sharp(Buffer.from(image.data),{raw:{width:image.width,height:image.height,channels:4}}).png().toBuffer(),
  });
  const temp=`${output}.${process.pid}.tmp`;
  await writeFile(temp,result.buffer,{mode:0o600});await rename(temp,output);
  await writeFile(report,JSON.stringify({engine,source:path.relative(root,source),sourceHash,outputHash:hash(result.buffer),meta:result.meta},null,2)+'\n',{mode:0o600});
  return {output,report,meta:result.meta,cached:false};
}
export async function cleanWorkflowImages(root:string){
  const state=await loadWorkflow(root);
  if(state.approvals.script.status!=='approved'||!state.artifacts.imageManifest)throw new Error('SCRIPT_APPROVAL_REQUIRED');
  const manifest=JSON.parse(await readFile(path.join(root,state.artifacts.imageManifest),'utf8')) as ImageManifest;
  const results=[];
  for(const job of manifest.jobs){
    if(job.provider!=='flow')continue;
    let source:string|undefined;
    for(const suffix of path.extname(job.output)?['']:['.png','.jpg','.webp','.gif']){
      const candidate=path.join(root,job.output+suffix);
      if(await readFile(candidate).then(()=>true).catch(()=>false)){source=candidate;break;}
    }
    if(!source)throw new Error(`IMAGE_MISSING: ${job.scene}`);
    results.push({scene:job.scene,...await cleanFlowImage(root,source)});
  }
  return results;
}
