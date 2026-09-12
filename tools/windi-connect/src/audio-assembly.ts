import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {loadWorkflow,validateScript} from './workflow.ts';
import {safeFile} from './project.ts';
import {generateWorkflowVoice} from './voice-api.ts';
import {transcribeSampleWords} from './transcribe.ts';
const run=promisify(execFile);
export async function assembleSamples(root:string,voice:string,planFile:string){
  const state=await loadWorkflow(root);
  const script=validateScript(JSON.parse(await readFile(path.join(root,state.current.script!),'utf8')));
  const plan=JSON.parse(await readFile(await safeFile(root,path.resolve(root,planFile)),'utf8'));
  const folder=path.join(root,'windi','voice',`assembled-v${script.version}-${voice}`);await mkdir(folder,{recursive:true});
  const sourceVoiceSpeed=Number(plan.mixing?.sourceVoicePlaybackSpeed??1.15);
  if(!Number.isFinite(sourceVoiceSpeed)||sourceVoiceSpeed<0.5||sourceVoiceSpeed>2)throw new Error('INVALID_SOURCE_VOICE_SPEED');
  const files:string[]=[],captions:any[]=[],beats:any[]=[],sampleRanges:Array<{startMs:number;endMs:number}>=[];let cursor=0;
  const append=async(audio:string,words:any[],speed=1)=>{
    const target=path.join(folder,`part-${files.length}.wav`);
    const speedArgs=speed===1?[]:['-filter:a',`atempo=${speed}`];
    await run('ffmpeg',['-y','-i',audio,...speedArgs,'-ar','48000','-ac','1','-c:a','pcm_s16le',target]);
    const info=await run('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',target]);
    const duration=Math.round(Number(info.stdout.trim())*1000);
    if(!Number.isFinite(duration)||duration<=0)throw new Error('INVALID_AUDIO_DURATION');
    captions.push(...words
      .map(c=>({...c,startMs:Math.round(c.startMs/speed)+cursor,endMs:Math.min(Math.round(c.endMs/speed),duration)+cursor,timestampMs:c.timestampMs==null?null:Math.round(c.timestampMs/speed)+cursor}))
      .filter(c=>typeof c.text==='string'&&c.text.trim()!==''&&Number.isFinite(c.startMs)&&Number.isFinite(c.endMs)&&c.endMs>c.startMs));
    files.push(target);cursor+=duration;
  };
  for(const beat of script.beats){
    const startMs=cursor;
    const narration=await generateWorkflowVoice(root,voice,1,{text:beat.voiceOver,id:beat.id});
    await append(narration.audio,JSON.parse(await readFile(narration.captions,'utf8')));
    for(const insert of plan.inserts.filter((x:any)=>x.beatId===beat.id)){
      if(insert.useFullFile!==true)throw new Error('ONLY_FULL_SAMPLE_INSERTS_SUPPORTED');
      const source=await safeFile(root,path.resolve(root,insert.source));
      const sampleStartMs=cursor;
      await append(source,await transcribeSampleWords(root,source),sourceVoiceSpeed);
      sampleRanges.push({startMs:sampleStartMs,endMs:cursor});
    }
    beats.push({id:beat.id,startMs,endMs:cursor});
  }
  const audio=path.join(folder,'full-mix.wav');
  const args=files.flatMap(file=>['-i',file]);
  await run('ffmpeg',['-y',...args,'-filter_complex',files.map((_,i)=>`[${i}:a]`).join('')+`concat=n=${files.length}:v=0:a=1[out]`,'-map','[out]','-c:a','pcm_s16le',audio],{maxBuffer:10*1024*1024});
  const captionFile=path.join(folder,'captions.json');await writeFile(captionFile,JSON.stringify(captions,null,2));
  await writeFile(path.join(root,'windi','timing','sample-ranges.json'),JSON.stringify(sampleRanges,null,2));
  await writeFile(path.join(root,'windi','timing','beat-timing.json'),JSON.stringify({scriptVersion:script.version,audio,beats},null,2));
  return {audio,captions:captionFile};
}
