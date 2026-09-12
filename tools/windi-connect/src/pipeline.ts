import path from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {loadWorkflow,type ImageManifest} from './workflow.ts';
import {generateWorkflowVoice} from './voice-api.ts';
import {renderVideo} from './render.ts';
import {assembleSamples} from './audio-assembly.ts';
import {resolveFlowVoice} from './voice-default.ts';

async function channelDefaultVoice(root:string){
  const fromProcess=process.env.CARTESIA_VOICE_ID?.trim();
  if(fromProcess)return fromProcess;
  // The WindiStudio channel owns this project-local default. Only the ID is
  // read; provider API keys stay solely in the app environment.
  const local=await readFile(path.join(root,'.env.local'),'utf8').catch(()=>null);
  const match=local?.match(/^CARTESIA_VOICE_ID\s*=\s*(.*)$/m);
  return match?.[1]?.trim().replace(/^(["'])(.*)\1$/, '$2').trim();
}

// One foreground invocation owns the entire approved production sequence.
// Image recovery budgets survive subsequent invocations.
export async function runPipeline(root:string,voiceId:string|undefined,request:(op:string,args:any)=>Promise<any>,audioPlan?:string){
  const initial=await loadWorkflow(root);
  if(initial.approvals.script.status!=='approved')throw new Error('SCRIPT_APPROVAL_REQUIRED');
  const checkpoint=path.join(root,'.windi','pipeline.json');
  let saved:any=JSON.parse(await readFile(checkpoint,'utf8').catch(()=>'{}'));
  if(saved.scriptVersion!==initial.approvals.script.version)saved={scriptVersion:initial.approvals.script.version,retries:{},voiceId:saved.voiceId};
  // An explicitly supplied ID wins; otherwise the channel default must win
  // over a stale recovery checkpoint from a prior episode.
  const selection=resolveFlowVoice(voiceId,await channelDefaultVoice(root),saved.voiceId);
  saved.voiceId=selection.voiceId;
  saved.voiceSource=selection.source;
  saved.audioPlan=audioPlan||saved.audioPlan;
  const persist=async()=>{await mkdir(path.dirname(checkpoint),{recursive:true});await writeFile(checkpoint,JSON.stringify(saved,null,2)+'\n');};
  await persist();
  while(true){
    const state=await loadWorkflow(root);
    if(state.stage==='complete')return state;
    if(state.stage==='assets'){
      await request('workflow.continue',{project:root});
      const current=await loadWorkflow(root);
      if(current.stage!=='assets')continue;
      const manifest:ImageManifest=JSON.parse(await readFile(path.join(root,current.artifacts.imageManifest!),'utf8'));
      const keys=new Set(manifest.jobs.map(j=>j.requestKey));
      const jobs=(await request('job.list',{project:root})).filter((j:any)=>keys.has(j.request_key));
      for(const job of jobs){
        if(!['failed','needs_user_action','unknown_result'].includes(job.status))continue;
        const recover=job.provider==='flow'&&Boolean(job.submitted_at)&&['DOWNLOAD_NOT_OBSERVED','RESULT_NEEDS_RECONCILIATION'].includes(job.error_code);
        const retry=!job.submitted_at&&['EXTENSION_DISCONNECTED','FLOW_DIRECT_SESSION_NOT_READY'].includes(job.error_code);
        if((recover||retry)&&(saved.retries[job.id]||0)<2){
          saved.retries[job.id]=(saved.retries[job.id]||0)+1;await persist();
          await request('job.resume',{id:job.id,...(recover?{confirmResult:true}:{})});
        }else throw new Error(`PIPELINE_IMAGE_BLOCKED ${job.id}: ${job.error_code}`);
      }
      console.error(`Windi images: ${jobs.filter((j:any)=>j.status==='complete').length}/${manifest.jobs.length}`);
      await delay(5000);continue;
    }
    if(state.stage==='voice'){
      if(!saved.voiceId)throw new Error('PIPELINE_VOICE_REQUIRED: pass --voice VOICE_ID once; selection is saved.');
      const generated=saved.audioPlan?await assembleSamples(root,saved.voiceId,saved.audioPlan):await generateWorkflowVoice(root,saved.voiceId);
      await request('workflow.voice.import',{project:root,audio:generated.audio,captions:generated.captions});delete saved.blocked;await persist();continue;
    }
    if(state.stage==='timing'){await request('workflow.continue',{project:root});continue;}
    if(state.stage==='render'){await renderVideo(root);continue;}
    if(state.stage==='qa'){throw new Error('PIPELINE_QA_FAILED: inspect qa.json before continuing.');}
    throw new Error(`PIPELINE_APPROVAL_REQUIRED: ${state.stage}`);
  }
}
