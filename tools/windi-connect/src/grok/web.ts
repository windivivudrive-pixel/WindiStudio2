import {readFile,mkdir,writeFile,lstat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import type {Store,JobRow} from '../store.ts';
import {inspectOriginal} from '../assets.ts';
import {safeFile} from '../project.ts';
import {publishGrokMedia,resultOf} from './media.ts';
import {grokWebOptions,referenceWebPrompt} from './options.ts';
export type GrokWebCommand=(op:string,args?:any)=>Promise<any>;
export class GrokWebMedia {
  readonly store:Store; readonly staging:string; readonly command:GrokWebCommand; readonly notify:()=>void;
  constructor(store:Store,staging:string,command:GrokWebCommand,notify:()=>void){this.store=store;this.staging=staging;this.command=command;this.notify=notify;}
  async run(job:JobRow){
    let result=resultOf(job);
    // Do not reinterpret ambiguous OAuth jobs as new web requests.
    if(result.transport!=='web'&&job.submitted_at&&!result.downloadPath)throw new Error('GROK_LEGACY_JOB_REQUIRES_NEW_REQUEST');
    const refs=[...(job.source_path?[job.source_path]:[]),...this.store.references(job)];
    const options=grokWebOptions(JSON.parse(job.options_json||'{}'),this.store.references(job).length,Boolean(job.source_path));
    const project=this.store.projectById(job.project_id)!;
    const check=()=>{if(this.store.job(job.id)?.status==='cancelled')throw new Error('GROK_JOB_CANCELLED');};
    const save=(patch:Record<string,unknown>)=>{result={...result,...patch};this.store.updateJob(job.id,{result_json:JSON.stringify(result)});this.notify();};
    if(!result.downloadPath){
      if(options.media==='video'&&result.postUrl&&!result.webDownloadId)await this.command('ui.restore',{jobId:job.id,postUrl:result.postUrl});
      await this.command('web.status');check();
      if(!job.submitted_at){
        this.store.updateJob(job.id,{status:'preparing'});this.notify();const assets=[];
        if(options.media==='video')await this.command('ui.prepare',{jobId:job.id});
        for(const [index,file] of refs.entries()){
          check();const source=await safeFile(project.root,file);const info=await inspectOriginal(source);const bytes=await readFile(source);
          const key=`${job.id}:${index}`;await this.command('uploadBegin',{key,sha256:info.sha256,size:bytes.length,mime:info.mime,name:`windi-${job.id}-${index+1}${info.extension}`});
          const base64=bytes.toString('base64');for(let offset=0;offset<base64.length;offset+=262144){check();await this.command('uploadChunk',{key,index:offset/262144,data:base64.slice(offset,offset+262144)});}
          const uploaded=await this.command('uploadFinish',{key,ui:options.media==='video'});if(!uploaded.assetId||uploaded.sha256!==info.sha256)throw new Error('GROK_REFERENCE_UPLOAD_FAILED');assets.push(uploaded.assetId);
        }
        check();save({transport:'web',uiVideo:options.media==='video',referenceCount:assets.length});
        this.store.updateJob(job.id,{status:'submitted',submitted_at:new Date().toISOString()});this.notify();
        await this.command('start',{jobId:job.id,...options,prompt:referenceWebPrompt(job.prompt,refs.length),assets});
      }
      const deadline=Date.now()+600000;
      if(!result.webDownloadId){
        while(true){check();if(Date.now()>deadline)throw new Error('GROK_WEB_TIMEOUT_UNKNOWN');const state=await this.command('poll',{jobId:job.id});
          if(state.observation&&JSON.stringify(state.observation)!==JSON.stringify(result.observation))save({observation:state.observation});
          if(state.postUrl&&state.postUrl!==result.postUrl)save({postUrl:state.postUrl,conversationId:state.conversationId});
          if(state.state==='missing')throw new Error('GROK_WEB_RESULT_UNKNOWN');
          if(state.state==='failed')throw new Error(state.error||'GROK_WEB_RESULT_UNKNOWN');
          if(state.state==='complete'){const download=await this.command('download',{jobId:job.id,media:options.media});save({webDownloadId:download.downloadId,conversationId:download.conversationId});break;}
          this.store.updateJob(job.id,{status:'generating',user_message:`Grok Web đang tạo ${options.media==='video'?'video':'ảnh'}: ${Math.min(100,Math.max(0,Number(state.progress)||0))}%`});this.notify();await delay(1500);
        }
      }
      this.store.updateJob(job.id,{status:'downloading'});this.notify();
      // chrome.downloads.download() only means that Chrome accepted the request.
      // Keep the Grok session and job alive until the exact, job-attributed file
      // has finished. Reading its signed source URL before this point can race a
      // slow download and leaves a submitted job without a local original.
      const downloadDeadline=Date.now()+120000;
      let localDownload:any;
      while(true){
        check();
        if(Date.now()>downloadDeadline)throw new Error('GROK_DOWNLOAD_TIMEOUT');
        const download=await this.command('downloadStatus',{jobId:job.id});
        if(download.state==='complete'){localDownload=download;break;}
        if(download.state==='interrupted'||download.error)throw new Error('GROK_DOWNLOAD_FAILED');
        this.store.updateJob(job.id,{status:'downloading',user_message:'Grok Web đã tạo xong, đang lưu tệp gốc…'});this.notify();
        await delay(500);
      }
      // Consume the exact completed Chrome download. Do not GET its signed URL
      // again: it can expire, require the tab's session, or be a blob URL.
      if(localDownload.jobId!==job.id||localDownload.downloadId!==result.webDownloadId||typeof localDownload.path!=='string'||!path.isAbsolute(localDownload.path))throw new Error('GROK_INVALID_DOWNLOADED_FILE');
      const source=localDownload.path;
      const suffix=options.media==='video'?'mp4':'image';
      const name=path.basename(source);
      if(path.basename(path.dirname(source))!=='grok'||path.basename(path.dirname(path.dirname(source)))!=='Windi'||!new RegExp(String.raw`^${job.id}(?: \(\d+\))?\.${suffix}$`).test(name))throw new Error('GROK_INVALID_DOWNLOADED_FILE');
      const stat=await lstat(source);
      if(!stat.isFile()||stat.isSymbolicLink()||stat.size<64||stat.size>512*1024*1024||stat.size!==localDownload.bytes||await realpath(source)!==source)throw new Error('GROK_INVALID_DOWNLOADED_FILE');
      const bytes=await readFile(source);
      const dir=path.join(this.staging,job.id);await mkdir(dir,{recursive:true,mode:0o700});const dest=path.join(dir,options.media==='video'?'download.mp4':'download.image');await writeFile(dest,bytes,{mode:0o600});save({downloadPath:dest,downloadSha256:createHash('sha256').update(bytes).digest('hex')});
      if(options.media==='video')await this.command('ui.release',{jobId:job.id});

    }
    check();
    await publishGrokMedia(this.store,this.notify,this.store.job(job.id)!,String(result.downloadPath));
  }
}
