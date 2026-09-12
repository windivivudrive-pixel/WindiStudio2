import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,lstat,rm,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {home} from './protocol.ts';
import {safeFile} from './project.ts';

const run=promisify(execFile),here=path.dirname(fileURLToPath(import.meta.url));
function correctKnownVietnameseTranscript(words:Array<{text:string}>){
  for(let index=0;index<words.length-1;index++){
    if(words[index].text.trim().toLocaleLowerCase('vi-VN')==='chọn'&&/^vẻm([.!?,…]*)$/iu.test(words[index+1].text.trim())){
      const punctuation=words[index+1].text.trim().match(/[.!?,…]*$/u)?.[0]??'';
      words[index].text='trọn';words[index+1].text=`vẹn${punctuation}`;
    }
  }
  return words;
}
async function rendererRoot(){for(const candidate of [path.resolve(here,'../renderer'),path.resolve(here,'../../../kits/video-starter')])if(await lstat(path.join(candidate,'package.json')).catch(()=>null))return candidate;throw new Error('RENDERER_NOT_INSTALLED');}
async function whisper(){const renderer=await rendererRoot();const require=createRequire(path.join(renderer,'package.json'));return {api:require('@remotion/install-whisper-cpp') as any,renderer};}
export async function prepareWhisper(){
  const {api}=await whisper();
  const folder=path.join(home,'whisper.cpp'),executable=path.join(folder,'main');
  const ready=await lstat(executable).then(()=>true).catch(()=>false);
  if(!ready)await rm(folder,{recursive:true,force:true});
  await api.installWhisperCpp({to:folder,version:'1.5.5'});
  await api.downloadWhisperModel({model:'small',folder});
  return {folder,model:'small'};
}
export async function transcribeLocal(projectRoot:string,audioInput:string){
  const audio=await safeFile(projectRoot,audioInput);const {api}=await whisper();const {folder}=await prepareWhisper();const work=path.join(projectRoot,'windi','timing');await mkdir(work,{recursive:true,mode:0o700});const wav=path.join(work,'voice-16khz.wav');const ffmpeg=process.env.FFMPEG_PATH||'ffmpeg';
  await run(ffmpeg,['-i',audio,'-ar','16000','-ac','1','-y',wav],{maxBuffer:10*1024*1024});const result=await api.transcribe({model:'small',whisperPath:folder,whisperCppVersion:'1.5.5',inputPath:wav,language:'vi',tokenLevelTimestamps:true});const {captions}=api.toCaptions({whisperCppOutput:result});if(!Array.isArray(captions)||!captions.length)throw new Error('LOCAL_TRANSCRIPTION_EMPTY');const output=path.join(work,'captions.json');await writeFile(output,`${JSON.stringify(captions,null,2)}\n`,{mode:0o600});return output;
}
/** Phrase timestamps avoid Whisper 1.5's split UTF-8 tokens for Vietnamese.
 * Word onsets inside each short phrase are estimated, not provider timestamps. */
export async function transcribeSampleWords(projectRoot:string,audioInput:string){
  const audio=await safeFile(projectRoot,audioInput),stat=await lstat(audio);
  const key=createHash('sha256').update(`${audio}:${stat.size}:${stat.mtimeMs}:vi-phrase-v1`).digest('hex').slice(0,16);
  const work=path.join(projectRoot,'windi','timing','samples');await mkdir(work,{recursive:true});
  const output=path.join(work,`${key}.json`);
  const cached=await readFile(output,'utf8').catch(()=>null);if(cached){const corrected=correctKnownVietnameseTranscript(JSON.parse(cached));await writeFile(output,JSON.stringify(corrected,null,2));return corrected;}
  const {api}=await whisper(),{folder}=await prepareWhisper(),wav=path.join(work,`${key}.wav`);
  await run(process.env.FFMPEG_PATH||'ffmpeg',['-y','-i',audio,'-ar','16000','-ac','1',wav]);
  const result=await api.transcribe({model:'small',whisperPath:folder,whisperCppVersion:'1.5.5',inputPath:wav,language:'vi',tokenLevelTimestamps:false,tokensPerItem:40,additionalArgs:['--split-on-word'],printOutput:false});
  const words=result.transcription.flatMap((item:any)=>{
    const text=String(item.text).trim();if(text.includes('\uFFFD'))throw new Error('SAMPLE_TRANSCRIPT_INVALID_UTF8');
    const parts=text.split(/\s+/u).filter(Boolean),start=Number(item.offsets.from),end=Number(item.offsets.to);
    return parts.map((text:string,i:number)=>({text,startMs:Math.round(start+(end-start)*i/parts.length),endMs:Math.round(start+(end-start)*(i+1)/parts.length),timestampMs:null,confidence:null}));
  });
  if(!words.length)throw new Error('SAMPLE_TRANSCRIPTION_EMPTY');
  const corrected=correctKnownVietnameseTranscript(words);await writeFile(output,JSON.stringify(corrected,null,2));return corrected;
}
