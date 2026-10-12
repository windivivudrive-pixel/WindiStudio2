import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, readdirSync } from 'node:fs';
import { copyFile, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, resolve, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { run } from './process.mjs';
import { resolveRuntime } from './runtime.mjs';
import { apiVoices, apiSpeech, voiceFingerprint } from './voice-api.mjs';
import { translate, translationPrompt, validateTranslations } from './providers.mjs';

const kit = dirname(fileURLToPath(import.meta.url));
export const dataRoot = resolve(process.env.WINDI_DUBBING_DATA || join(kit, '.windi-dubbing'));
mkdirSync(join(dataRoot, 'projects'), { recursive: true });
const active = new Map();
let heavyJob = false;
export const projectDir = id => { if (!/^[a-f0-9-]{36}$/.test(id || '')) throw new Error('Project ID không hợp lệ.'); return join(dataRoot, 'projects', id); };
export function saveProject(p) { p.updatedAt = new Date().toISOString(); const dir = projectDir(p.id); mkdirSync(dir, { recursive: true }); const file = join(dir, 'project.json'); writeFileSync(file + '.tmp', JSON.stringify(p, null, 2)); renameSync(file + '.tmp', file); return p; }
export function getProject(id) { const p = JSON.parse(readFileSync(join(projectDir(id), 'project.json'), 'utf8')); migrateProject(p); if (p.job?.status === 'running' && !active.has(id)) { p.job.status = 'interrupted'; p.job.message = 'Tác vụ bị ngắt. Chọn chạy lại bước này.'; saveProject(p); } return p; }
export function listProjects() { return readdirSync(join(dataRoot, 'projects')).flatMap(id => { try { const p = getProject(id); return [{ id, name: p.name, updatedAt: p.updatedAt }]; } catch { return []; } }).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)); }
export function createProject(name = 'Dự án mới') { return saveProject({ id: randomUUID(), name: String(name).slice(0,100), segments: [], revision: 0, voices: [], speakers: [{id:'speaker_1',name:'Người đọc',voice:''}], config: { whisperModel: 'small', language: '', provider: 'codex', mode: 'v3turbo', voice: '', ttsProvider: 'local', apiModel: '', sampleText: 'Xin chào, rất vui được trò chuyện cùng bạn hôm nay.', subtitle: 'outline', color: '#ffe083', fontSize: 44, backgroundVolume: 0, resolution: 720 }, artifacts: {}, job: null }); }
function migrateProject(p) {
  if(p.job?.message){
    if(p.job.status==='error' && /vieneu|whisper|Traceback/i.test(p.job.message))p.job.message='Tác vụ local chưa hoàn tất. Kiểm tra môi trường và tải lại model rồi thử lại.';
    else p.job.message=p.job.message.replace(/VieNeu/gi,'bộ giọng local').replace(/Whisper/gi,'Windi Decode');
  }
  p.config.ttsProvider ||= 'local'; p.config.apiModel ||= '';
  p.config.sampleText ||= 'Xin chào, rất vui được trò chuyện cùng bạn hôm nay.';
  p.speakers ||= [{ id: 'speaker_1', name: 'Người nói 1', voice: p.config.voice || '' }];
  for (const s of p.segments) s.speaker ||= 'speaker_1';
}
export function validateSpeakers(input) {
  if (!Array.isArray(input) || !input.length || input.length > 20) throw new Error('Cần 1–20 người nói.');
  const ids = new Set();
  return input.map(s => {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(s.id) || ids.has(s.id) || typeof s.name !== 'string' || !s.name.trim() || s.name.length > 100 || typeof s.voice !== 'string' || s.voice.length > 200) throw new Error('Người nói cần ID duy nhất, tên và voice ID hợp lệ.');
    ids.add(s.id); return { id: s.id, name: s.name.trim(), voice: s.voice.trim() };
  });
}
export function voicedSegments(p) {
  return p.segments.map(s => {
    const speaker = p.speakers.find(v => v.id === (s.speaker || 'speaker_1'));
    if (!speaker) throw new Error('Câu chưa được gán người nói hợp lệ.');
    if (p.speakers.length > 1 && !speaker.voice) throw new Error(`Chọn giọng riêng cho ${speaker.name} trước khi tạo tiếng.`);
    return { ...s, voice: speaker.voice || '' };
  });
}
function invalidateVoice(p) {
  delete p.artifacts.tts; delete p.artifacts.sample; delete p.artifacts.samples; delete p.artifacts.render;
  for (const s of p.segments) { delete s.ratio; delete s.ttsDuration; }
}
export function assertIdle(id) { if (active.has(id)) throw new Error('Đợi tác vụ hoàn tất hoặc hủy trước khi thay đổi.'); }
export function validateSegments(input, duration) {
  if (!Array.isArray(input) || !input.length || input.length > 5000) throw new Error('Cần từ 1 đến 5000 câu.');
  let previousEnd = 0; const ids = new Set();
  return input.map((s,i) => {
    const id = String(s.id ?? i), start = Number(s.start), end = Number(s.end);
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id) || ids.has(id) || !Number.isFinite(start) || !Number.isFinite(end) || start < previousEnd - .02 || end <= start || start < 0 || end > duration + .05 || typeof s.text !== 'string' || !s.text.trim() || s.text.length > 5000 || (s.translation && (typeof s.translation !== 'string' || s.translation.length > 5000))) throw new Error(`Câu ${i+1}: ID, thời gian hoặc nội dung không hợp lệ. Các câu cần theo thứ tự và không chồng nhau.`);
    ids.add(id); previousEnd=end;
    const speaker = s.speaker ?? s.speaker_id ?? 'speaker_1';
    if (typeof speaker !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(speaker)) throw new Error(`Câu ${i+1}: nhãn người nói không hợp lệ.`);
    return { id, start, end, speaker, text: s.text.trim(), translation: String(s.translation || '').trim() };
  });
}
export function updateProject(id, input) {
  assertIdle(id); const p = getProject(id), c = input.config;
  if (c) {
    const allowed = { whisperModel: ['tiny','base','small','medium'], provider: ['codex','antigravity','chat'], ttsProvider: ['local','windi','openai','elevenlabs'], mode: ['v3turbo','v3nano','standard'], subtitle: ['outline','box','none'], resolution: [720,1080] };
    for (const [key,values] of Object.entries(allowed)) if (key in c && !values.includes(c[key])) throw new Error('Cấu hình '+key+' không hợp lệ.');
    if ('language' in c && !/^[a-z]{0,3}$/.test(c.language)) throw new Error('Ngôn ngữ không hợp lệ.');
    if ('apiModel' in c && (typeof c.apiModel !== 'string' || c.apiModel.length>200 || /[\r\n]/.test(c.apiModel))) throw new Error('Model API không hợp lệ.');
    if ('sampleText' in c && (typeof c.sampleText !== 'string' || !c.sampleText.trim() || c.sampleText.length>1000)) throw new Error('Câu nghe thử cần 1–1000 ký tự.');
    if ('voice' in c && (typeof c.voice !== 'string' || c.voice.length>200)) throw new Error('Giọng không hợp lệ.');
    if ('color' in c && !/^#[0-9a-f]{6}$/i.test(c.color)) throw new Error('Màu không hợp lệ.');
    if ('fontSize' in c && (!Number.isFinite(c.fontSize) || c.fontSize<18 || c.fontSize>100)) throw new Error('Cỡ chữ 18–100.');
    if ('backgroundVolume' in c && (![0,.1,.2,.3].includes(c.backgroundVolume))) throw new Error('Âm lượng nền không hợp lệ.');
    const next = Object.fromEntries(Object.entries(c).filter(([k])=>k in p.config));
    const voiceChanged = ['mode','voice','ttsProvider','apiModel'].some(k=>k in next && next[k]!==p.config[k]);
    const renderChanged = ['subtitle','color','fontSize','backgroundVolume','resolution'].some(k=>k in next && next[k]!==p.config[k]);
    if (voiceChanged) invalidateVoice(p);
    if ('ttsProvider' in next && next.ttsProvider!==p.config.ttsProvider) { p.voices=[]; p.config.voice=''; p.speakers=p.speakers.map(s=>({...s,voice:''})); }
    if ('mode' in next && next.mode!==p.config.mode) { p.voices=[]; p.config.voice=''; p.speakers=p.speakers.map(s=>({...s,voice:''})); }
    if (renderChanged) delete p.artifacts.render;
    if ('sampleText' in next && next.sampleText!==p.config.sampleText) { delete p.artifacts.samples; delete p.artifacts.sample; }
    Object.assign(p.config,next);
    if ('voice' in next && p.speakers.length===1) p.speakers[0].voice=next.voice;
  }
  if (input.segments) {
    p.segments=validateSegments(input.segments,p.video?.duration || 86400);
    if (!input.speakers) {
      for (const row of p.segments) if (!p.speakers.some(s=>s.id===row.speaker)) p.speakers.push({id:row.speaker,name:row.speaker,voice:''});
      p.speakers=validateSpeakers(p.speakers);
    }
    p.revision++; delete p.pendingTranslation; invalidateVoice(p);
  }
  if (input.speakers) {
    const speakers=validateSpeakers(input.speakers);
    if (p.segments.some(s=>!speakers.some(v=>v.id===s.speaker))) throw new Error('Còn câu thuộc người nói đã xóa. Gán lại các câu trước.');
    if (JSON.stringify(speakers)!==JSON.stringify(p.speakers)) { invalidateVoice(p); p.revision++; delete p.pendingTranslation; }
    p.speakers=speakers;
  }
  if ('speakerCount' in input) {
    const count=input.speakerCount;
    if (![1,2].includes(count)) throw new Error('Chọn 1 giọng hoặc 2 giọng (MC + khách mời).');
    if(count!==p.speakers.length){
      const first={...p.speakers[0]};
      if(count===2 && ['Người đọc','Người nói 1'].includes(first.name))first.name='MC';
      p.speakers=count===1?[first]:[first,p.speakers[1]||{id:first.id==='guest'?'guest_2':'guest',name:'Khách mời',voice:''}];
      p.segments=p.segments.map(s=>({...s,speaker:p.speakers.some(v=>v.id===s.speaker)?s.speaker:p.speakers[count-1].id}));
      invalidateVoice(p);p.revision++;delete p.pendingTranslation;
    }
  }
  return saveProject(p);
}
async function probe(file, signal) { const result=await run('ffprobe',['-v','error','-show_format','-show_streams','-of','json',file],{signal,timeout:30_000}); return JSON.parse(result.stdout); }
export async function importVideo(id, source, internalProject) {
  if(!internalProject)assertIdle(id); const p=internalProject||getProject(id); if (!existsSync(source) || !['.mp4','.mov','.mkv','.webm','.avi','.m4v'].includes(extname(source).toLowerCase())) throw new Error('Chọn file video MP4, MOV, MKV hoặc WebM trên máy.');
  const info=await probe(source), stream=info.streams.find(s=>s.codec_type==='video'), duration=Number(info.format.duration);
  if (!stream || !Number.isFinite(duration) || duration<=0) throw new Error('Không đọc được video hoặc thời lượng.');
  const target=join(projectDir(id),'input'+extname(source).toLowerCase()); if (resolve(source)!==target) await copyFile(source,target);
  const rotation=Math.abs(Number(stream.tags?.rotate||stream.side_data_list?.find(s=>s.rotation!==undefined)?.rotation||0))%180;
  p.video={ file: target.split(/[\\/]/).pop(), duration, width: rotation===90?stream.height:stream.width, height: rotation===90?stream.width:stream.height, audio: info.streams.some(s=>s.codec_type==='audio') }; p.segments=[];p.artifacts={};p.revision++;delete p.pendingTranslation;return saveProject(p);
}
export function cancelJob(id) { active.get(id)?.abort(); return getProject(id); }
export function shutdownJobs(){for(const controller of active.values())controller.abort();}
function stamp(seconds, ass=false) { const ms=Math.round(seconds*1000); const h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60,s=Math.floor(ms/1000)%60; return ass?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(Math.floor(ms%1000/10)).padStart(2,'0')}`:`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`; }
export function srt(segments) { return segments.map((s,i)=>`${i+1}\n${stamp(s.start)} --> ${stamp(s.end)}\n${s.translation || s.text}\n`).join('\n'); }
export function ass(segments,c) {
  const hex=c.color.slice(1), color='&H00'+hex.slice(4,6)+hex.slice(2,4)+hex.slice(0,2);
  const text=s=>String(s).replace(/\\/g,'').replace(/[{}]/g,'').replace(/\r?\n/g,'\\N');
  return `[Script Info]\nScriptType: v4.00+\nPlayResX: 1280\nPlayResY: 720\nWrapStyle: 0\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Arial,${c.fontSize},${color},&H00FFFFFF,&H00141414,&H90000000,-1,0,0,0,100,100,0,0,${c.subtitle==='box'?3:1},2,0,2,50,50,42,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`+segments.map(s=>`Dialogue: 0,${stamp(s.start,true)},${stamp(s.end,true)},Default,,0,0,0,,${text(s.translation||s.text)}`).join('\n');
}
export function startJob(id, step, runtimeSettings, options={}) {
  assertIdle(id); if (heavyJob) throw new Error('Đang có tác vụ khác chạy. Mỗi lần chạy một tác vụ để tiết kiệm RAM.');
  const p=getProject(id), controller=new AbortController(); active.set(id,controller);heavyJob=true;
  p.job={ step,status:'running',message:'Đang chuẩn bị…',progress:0,startedAt:new Date().toISOString() };saveProject(p);
  const report=(message,progress=0)=>{p.job.message=message;p.job.progress=progress;saveProject(p);};
  const signal=controller.signal, dir=projectDir(id);
  const execute=(name,args,extra={})=>run(name,args,{signal,...extra});
  const engine=async(kind,action,request)=>{
    const runtime=resolveRuntime(runtimeSettings[kind]), file=join(dir,`request-${action}.json`);
    await writeFile(file,JSON.stringify(request));
    let validationError='';
    try{return await execute(runtime.python,[join(kit,'workers/engine.py'),action,file],{cwd:runtime.cwd,onLine:line=>{
      try{const e=JSON.parse(line);if(e.error)validationError=e.error;if(e.progress)report(`Đã tạo ${e.progress}/${e.total} câu`,Math.round(100*e.progress/e.total));}catch{}
    }});}catch(error){
      if(signal.aborted)throw error;
      // Third-party tracebacks contain package/model names and local paths.
      const safe=/^(?:Giọng đã chọn không có|Chưa có bộ giọng local|Danh sách giọng local)/.test(validationError);
      throw new Error(safe?validationError:`${kind==='whisper'?'Windi Decode':'Windi TTS'} chưa hoàn tất tác vụ. Kiểm tra môi trường local, kết nối tải model và dung lượng máy rồi thử lại.`);
    }
  };
  async function translationWork(rewrite=false) {
    if (!p.segments.length) throw new Error('Cần nhận diện hoặc nhập lời thoại trước.');
    if (p.config.provider==='chat') {
      const request={ projectId:id,revision:p.revision,segments:p.segments,prompt:translationPrompt(p.segments,rewrite) };
      await writeFile(join(dir,'translation-request.json'),JSON.stringify(request,null,2));
      p.pendingTranslation={revision:p.revision,file:'translation-request.json'};
      report('Đã tạo yêu cầu. Nhờ LLM trong chat dùng skill đọc translation-request.json và nhập bản dịch.');return;
    }
    const result=[];
    for(let i=0;i<p.segments.length;i+=30){ report(`Dịch câu ${i+1}–${Math.min(i+30,p.segments.length)} bằng ${p.config.provider}`,Math.round(i/p.segments.length*100));const batch=await translate(p.config.provider,p.segments.slice(i,i+30),join(dir,'translation',String(i)),signal,rewrite);result.push(...batch);await writeFile(join(dir,'translation-partial.json'),JSON.stringify(result,null,2)); }
    p.segments=result;p.revision++;delete p.artifacts.tts;delete p.artifacts.render;delete p.pendingTranslation;
  }
  async function work(){
    if(step==='download'){
      const url=new URL(options.url);
      if(url.protocol!=='https:'||url.username||url.password||!['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.tiktok.com','tiktok.com','x.com','www.x.com','twitter.com','www.twitter.com'].includes(url.hostname))throw new Error('Beta hỗ trợ link HTTPS YouTube, TikTok hoặc X. Với nền tảng khác, tải file rồi nhập vào app.');
      report('Đang tải video bằng yt-dlp…');
      const downloadDir=join(dir,'download',randomUUID());await mkdir(downloadDir,{recursive:true});
      const args=['--ignore-config','--no-playlist','--no-progress','--max-filesize','4G','-f','bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best','--merge-output-format','mp4','-o',join(downloadDir,'input.%(ext)s'),url.href];
      let installed=false;try{await execute('yt-dlp',['--version'],{timeout:10_000});installed=true;}catch(error){if(signal.aborted)throw error;}
      if(installed)await execute('yt-dlp',args);else{const runtime=resolveRuntime(runtimeSettings.whisper);await execute(runtime.python,['-m','yt_dlp',...args],{cwd:runtime.cwd});}
      const files=readdirSync(downloadDir).filter(f=>['.mp4','.webm','.mkv'].includes(extname(f)));
      if(!files.length)throw new Error('Không tìm thấy video tải xong. Nền tảng có thể yêu cầu đăng nhập hoặc chặn tải.');
      await importVideo(id,join(downloadDir,files[0]),p);return;
    }
    if(step==='translate'||step==='rewrite')return translationWork(step==='rewrite');
    if(step==='voices'){
      if(p.config.ttsProvider==='local') { report(p.config.mode==='standard'?'Đang lấy giọng Local Voice Standard; lần đầu có thể tải model…':'Đang đọc danh sách giọng local đã cài…'); await engine('vieneu','voices',{mode:p.config.mode,output:join(dir,'voices.json')}); p.voices=JSON.parse(await readFile(join(dir,'voices.json'),'utf8')); }
      else { report('Đang lấy danh sách giọng API…'); p.voices=await apiVoices(dataRoot,p.config.ttsProvider,signal); }
      return;
    }
    if(step==='sample'){
      const speaker=p.speakers.find(s=>s.id===(options.speaker||p.speakers[0].id));
      if(!speaker)throw new Error('Người nói không hợp lệ.');
      if(!speaker.voice)throw new Error(`Chọn giọng cho ${speaker.name} trước khi nghe thử.`);
      const text=options.text ?? p.config.sampleText;
      if(typeof text!=='string'||!text.trim()||text.length>1000)throw new Error('Câu nghe thử cần 1–1000 ký tự.');
      const sampleDir=join(dir,'sample',speaker.id);await mkdir(sampleDir,{recursive:true});
      p.artifacts.samples ||= {}; delete p.artifacts.samples[speaker.id];
      const voice=speaker.voice;
      report(p.config.ttsProvider==='local'?'Đang tạo giọng thử trên máy…':'Đang tạo giọng thử bằng API…');
      if(p.config.ttsProvider==='local')await engine('vieneu','sample',{mode:p.config.mode,voice,text,directory:sampleDir});
      else await apiSpeech({root:dataRoot,config:p.config,segments:[{id:'sample',voice,translation:text}],directory:sampleDir,signal,execute,report});
      p.artifacts.samples[speaker.id]=`sample/${speaker.id}/sample.wav`;return;
    }
    if(!p.video)throw new Error('Chọn video trước.');
    const video=join(dir,p.video.file);
    if(step==='transcribe'){
      if(!p.video.audio)throw new Error('Video không có âm thanh. Bạn có thể nhập lời thoại JSON.');
      report('Đang tách âm thanh…');await execute('ffmpeg',['-y','-v','error','-i',video,'-vn','-ar','16000','-ac','1',join(dir,'original.wav')]);
      report('Windi Decode đang nhận diện lời thoại. Lần đầu có thể tải model…');await engine('whisper','transcribe',{audio:join(dir,'original.wav'),output:join(dir,'transcript.json'),model:p.config.whisperModel,language:p.config.language,cache:join(dataRoot,'cache/whisper')});
      p.segments=validateSegments(JSON.parse(await readFile(join(dir,'transcript.json'),'utf8')),p.video.duration).map(s=>({...s,speaker:p.speakers[0].id}));p.revision++;delete p.pendingTranslation;p.artifacts={};return;
    }
    if(step==='tts'){
      if(!p.segments.length||p.segments.some(s=>!s.translation))throw new Error('Cần bản dịch đầy đủ trước khi tạo tiếng.');
      const ttsDir=join(dir,'tts');await mkdir(ttsDir,{recursive:true});delete p.artifacts.tts;delete p.artifacts.render;
      const segments=voicedSegments(p);
      if(p.config.ttsProvider==='local'){report('Windi TTS đang tạo giọng theo từng người nói…');await engine('vieneu','tts',{mode:p.config.mode,segments,directory:ttsDir});}
      else {report('Đang tạo giọng API theo từng người nói…');await apiSpeech({root:dataRoot,config:p.config,segments,directory:ttsDir,signal,execute,report});}
      for(const s of p.segments){ const info=await probe(join(ttsDir,s.id+'.wav'),signal);s.ttsDuration=Number(info.format.duration);s.ratio=s.ttsDuration/(s.end-s.start); }
      p.artifacts.tts=p.config.ttsProvider==='local'?{runtime:runtimeSettings.vieneu,provider:'local'}:{provider:p.config.ttsProvider,fingerprint:await voiceFingerprint(dataRoot,p.config)};await writeFile(join(dir,'timing.json'),JSON.stringify(p.segments,null,2));report('Đã tạo voice. Kiểm tra các câu lệch thời lượng trước khi xuất.',100);return;
    }
    if(step==='render'){
      if(!p.artifacts.tts)throw new Error('Tạo giọng đọc trước.');
      if(p.config.ttsProvider!=='local' && p.artifacts.tts.fingerprint!==await voiceFingerprint(dataRoot,p.config))throw new Error('Cấu hình API đã đổi. Tạo lại giọng trước khi xuất.');
      if(p.config.ttsProvider==='local' && p.artifacts.tts.runtime!==runtimeSettings.vieneu)throw new Error('Môi trường Windi TTS đã đổi. Tạo lại giọng trước khi xuất.');
      if(p.segments.some(s=>!Number.isFinite(s.ratio)||s.ratio<.8||s.ratio>1.2))throw new Error('Có câu lệch thời lượng trên 20%. Sửa hoặc bấm Viết lại cho khớp rồi tạo tiếng lại.');
      delete p.artifacts.render;
      const pieces=[];let originalCursor=0,outputCursor=0;const adjusted=[];
      const height=p.config.resolution;
      const width=Math.round((p.video.width/p.video.height*height)/2)*2;
      const captionDir=join(dir,'captions');
      if(p.config.subtitle!=='none'){
        await mkdir(captionDir,{recursive:true});
        const requestFile=join(dir,'request-captions.json');
        await writeFile(requestFile,JSON.stringify({...p.config,width,height,segments:p.segments,directory:captionDir}));
        const runtime=resolveRuntime(runtimeSettings.vieneu);
        await execute(runtime.python,[join(kit,'workers/captions.py'),requestFile],{cwd:runtime.cwd});
      }
      const scale=`scale=-2:${height},setsar=1,fps=30,format=yuv420p`;
      const pieceDir=join(dir,'pieces');await mkdir(pieceDir,{recursive:true});
      async function piece(start,duration,segment){
        if(duration<.03)return;
        const file=join(pieceDir,`${pieces.length}.mp4`), k=segment?Math.sqrt(segment.ratio):1, outDuration=duration*k;
        const args=['-y','-v','error','-ss',String(start),'-t',String(duration),'-i',video];
        if(segment) args.push('-i',join(dir,'tts',segment.id+'.wav'));
        else args.push('-f','lavfi','-i','anullsrc=r=48000:cl=stereo');
        if(segment&&p.config.subtitle!=='none')args.push('-i',join(captionDir,segment.id+'.png'));
        const audio=segment?`[1:a]atempo=${k},apad,atrim=duration=${outDuration},aformat=sample_rates=48000:channel_layouts=stereo[voice]`:`[1:a]atrim=duration=${outDuration}[voice]`;
        const videoFilter=segment&&p.config.subtitle!=='none'?`[0:v]setpts=${k}*(PTS-STARTPTS),${scale}[basev];[basev][2:v]overlay=0:0[v]`:`[0:v]setpts=${k}*(PTS-STARTPTS),${scale}[v]`;
        let filters=`${videoFilter};${audio}`;
        if(p.video.audio&&p.config.backgroundVolume>0)filters+=`;[0:a]atempo=${1/k},volume=${p.config.backgroundVolume},apad,atrim=duration=${outDuration}[bg];[voice][bg]amix=inputs=2:duration=first:normalize=0[a]`;
        else filters+=';[voice]anull[a]';
        args.push('-filter_complex',filters,'-map','[v]','-map','[a]','-t',String(outDuration),'-c:v','libx264','-preset','veryfast','-crf','21','-c:a','aac','-b:a','160k',file);
        await execute('ffmpeg',args);pieces.push(file);
        if(segment)adjusted.push({...segment,start:outputCursor,end:outputCursor+outDuration});outputCursor+=outDuration;
      }
      for(let i=0;i<p.segments.length;i++){const s=p.segments[i];report(`Đang ghép câu ${i+1}/${p.segments.length}`,Math.round(i/p.segments.length*85));await piece(originalCursor,s.start-originalCursor,null);await piece(s.start,s.end-s.start,s);originalCursor=s.end;}
      await piece(originalCursor,p.video.duration-originalCursor,null);
      await writeFile(join(dir,'concat.txt'),pieces.map(f=>`file '${f.replace(/\\/g,'/').replace(/'/g,"'\\''")}'`).join('\n'));
      await writeFile(join(dir,'subtitles.srt'),srt(adjusted));await writeFile(join(dir,'subtitles.ass'),ass(adjusted,p.config));
      await execute('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i',join(dir,'concat.txt'),'-c','copy',join(dir,'joined.mp4')]);
      report('Đang ghép phụ đề và hoàn tất MP4…',90);
      const final=join(dir,'dubbed.mp4');
      await execute('ffmpeg',['-y','-v','error','-i',join(dir,'joined.mp4'),'-c','copy','-movflags','+faststart',final]);
      await execute('ffmpeg',['-y','-v','error','-i',final,'-vn','-c:a','pcm_s16le',join(dir,'dubbed.wav')]);
      const info=await probe(final,signal);p.artifacts.render={mp4:'dubbed.mp4',srt:'subtitles.srt',wav:'dubbed.wav',duration:Number(info.format.duration)};return;
    }
    throw new Error('Tác vụ không hợp lệ.');
  }
  work().then(()=>{p.job.status=p.pendingTranslation?'waiting':'done';p.job.progress=100;if(!p.pendingTranslation)p.job.message='Hoàn tất. Kết quả đã lưu trên máy.';}).catch(error=>{p.job.status=signal.aborted?'cancelled':'error';p.job.message=error.message.replace(/(?:sk-[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_.-]{30,})/g,'[redacted]');}).finally(()=>{saveProject(p);active.delete(id);heavyJob=false;});
  return p;
}
export function importTranslation(id,input){assertIdle(id);const p=getProject(id);if(!p.pendingTranslation||input.revision!==p.revision)throw new Error('Yêu cầu dịch đã cũ hoặc không còn chờ. Tạo lại yêu cầu dịch.');p.segments=validateTranslations(p.segments,input);p.revision++;delete p.pendingTranslation;delete p.artifacts.tts;delete p.artifacts.render;p.job={status:'done',step:'translate',message:'Đã nhận bản dịch từ chat.',progress:100};return saveProject(p);}
