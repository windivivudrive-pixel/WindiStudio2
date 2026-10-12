import { readFile, writeFile, mkdir, rename, chmod, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { setTimeout as pause } from 'node:timers/promises';

const defaults = { windi: 'https://windistudio.app', openai: 'https://api.openai.com/v1', elevenlabs: 'https://api.elevenlabs.io/v1' };
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const isUuid = value => typeof value === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
export function validateBaseUrl(value) {
  let url; try { url = new URL(value); } catch { throw new Error('Base URL API không hợp lệ.'); }
  if (url.username || url.password || url.search || url.hash || !(url.protocol === 'https:' || (url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)))) throw new Error('Dùng HTTPS, hoặc HTTP localhost cho máy chủ TTS local. Không đặt key trong URL.');
  return url.href.replace(/\/$/, '');
}
export async function readVoiceSettings(root) {
  try { return JSON.parse(await readFile(join(root, 'voice-api.json'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return {}; throw new Error('Không đọc được cấu hình API voice.'); }
}
export async function publicVoiceSettings(root) {
  const saved = await readVoiceSettings(root);
  return Object.fromEntries(Object.entries(defaults).map(([provider, baseUrl]) => [provider, { baseUrl: saved[provider]?.baseUrl || baseUrl, configured: Boolean(saved[provider]?.apiKey) }]));
}
export async function saveVoiceSettings(root, input) {
  if (!Object.hasOwn(defaults, input.provider)) throw new Error('Nhà cung cấp voice không hợp lệ.');
  const saved = await readVoiceSettings(root), previous = saved[input.provider] || {};
  const baseUrl = validateBaseUrl(input.baseUrl || defaults[input.provider]);
  if(input.provider==='windi' && new URL(baseUrl).pathname!=='/')throw new Error('Windi Voice dùng URL gốc, ví dụ https://windistudio.app, không thêm /v1.');
  if (typeof input.apiKey !== 'string' || input.apiKey.length > 4096 || /[\r\n]/.test(input.apiKey)) throw new Error('API key không hợp lệ.');
  if(input.provider==='windi' && input.apiKey.trim() && !/^windi_(?:voice|kit)_[A-Za-z0-9_-]{32,}$/.test(input.apiKey.trim()))throw new Error('Dùng API key Windi bắt đầu bằng windi_voice_ hoặc windi_kit_.');
  // Never silently forward an existing key to a different server.
  if (previous.baseUrl && previous.baseUrl !== baseUrl && !input.apiKey.trim() && !input.clearKey) throw new Error('Base URL đã đổi. Nhập lại API key cho máy chủ mới.');
  saved[input.provider] = { baseUrl, apiKey: input.clearKey ? '' : input.apiKey.trim() || previous.apiKey || '' };
  await mkdir(root, { recursive: true });
  const path = join(root, 'voice-api.json');
  await writeFile(path + '.tmp', JSON.stringify(saved), { mode: 0o600 });
  await rename(path + '.tmp', path); await chmod(path, 0o600);
  return publicVoiceSettings(root);
}
export async function voiceConnection(root, provider) {
  if (!Object.hasOwn(defaults, provider)) throw new Error('Nhà cung cấp voice không hợp lệ.');
  const settings = (await readVoiceSettings(root))[provider];
  if (!settings?.apiKey) throw new Error('Chưa có API key. Mở cấu hình API voice rồi lưu key.');
  return { ...settings, baseUrl: validateBaseUrl(settings.baseUrl || defaults[provider]) };
}
export async function voiceFingerprint(root, config) {
  return digest({ provider: config.ttsProvider, ...(await voiceConnection(root, config.ttsProvider)) });
}
async function request(connection, provider, path, signal, body, options = {}) {
  const timeout = AbortSignal.timeout(120_000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let response;
  try {
    response = await fetch(connection.baseUrl + path, { method: body ? 'POST' : 'GET', redirect: options.allowRedirect ? 'manual' : 'error', signal: combined, headers: { ...(provider === 'elevenlabs' ? { 'xi-api-key': connection.apiKey } : { Authorization: `Bearer ${connection.apiKey}` }), ...(body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
  } catch { if (signal?.aborted) throw new Error('Đã hủy tác vụ API voice.'); throw new Error('Không kết nối được API voice hoặc đã hết thời gian. Kiểm tra Base URL/mạng rồi thử lại.'); }
  if (!response.ok && !(options.allowRedirect && [301,302,303,307,308].includes(response.status))) {
    await response.body?.cancel();
    throw new Error(`API voice HTTP ${response.status}. ${response.status === 401 || response.status === 403 ? 'Kiểm tra key và quyền truy cập.' : response.status === 429 ? 'Kiểm tra quota hoặc thử lại sau.' : 'Kiểm tra model, voice ID và định dạng API.'}`);
  }
  return response;
}
export async function apiVoices(root, provider, signal) {
  const connection = await voiceConnection(root, provider);
  if(provider==='windi'){
    const voices=[],seen=new Set(),cursors=new Set();let cursor='';
    do {
      const response=await request(connection,provider,'/api/v1/voice/voices'+(cursor?'?cursor='+encodeURIComponent(cursor):''),signal);
      const page=await response.json();
      if(!Array.isArray(page.data))throw new Error('Windi Voice không trả danh sách giọng hợp lệ.');
      for(const v of page.data){
        if(!isUuid(v.id)||typeof v.name!=='string')throw new Error('Windi Voice trả voice ID hoặc tên giọng không hợp lệ.');
        if(!seen.has(v.id)){voices.push({id:v.id,label:v.name+(v.kind==='clone'?' · Giọng clone':'')+(v.language?' · '+v.language:''),language:v.language||'',kind:v.kind||'library'});seen.add(v.id);}
      }
      const next=page.has_more?page.next_page:null;
      if(page.has_more && (typeof next!=='string'||!next||next===cursor||cursors.has(next)))throw new Error('Phân trang Windi Voice không hợp lệ.');
      if(next)cursors.add(next);
      cursor=next;
    }while(cursor&&voices.length<2000);
    return voices;
  }
  if (provider === 'openai') {
    if (connection.baseUrl !== defaults.openai) return []; // Compatible services define their own IDs.
    return ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse', 'marin', 'cedar'].map(id => ({ id, label: id }));
  }
  const voices = []; let token;
  do {
    const response = await request({ ...connection, baseUrl: connection.baseUrl.replace(/\/v1$/, '/v2') }, provider, '/voices?page_size=100' + (token ? '&next_page_token=' + encodeURIComponent(token) : ''), signal);
    const page = await response.json();
    if (!Array.isArray(page.voices)) throw new Error('API không trả danh sách voices hợp lệ.');
    voices.push(...page.voices.map(v => ({ id: String(v.voice_id), label: String(v.name || v.voice_id) + (v.labels?.gender ? ` · ${v.labels.gender}` : '') })));
    const next = page.has_more ? page.next_page_token : null;
    if (next && next === token) throw new Error('API voices trả vòng lặp phân trang.');
    token = next;
  } while (token && voices.length < 2000);
  return voices;
}

function windiJob(value) {
  if(!isUuid(value?.id)||!['reserved','pending','ready','failed','unknown'].includes(value.status))throw new Error('Windi Voice trả trạng thái hoặc mã lượt tạo không hợp lệ.');
  return value;
}
function windiTiming(value) {
  if(!Array.isArray(value?.words)||!value.words.length||!Array.isArray(value.start)||!Array.isArray(value.end)||value.words.length!==value.start.length||value.words.length!==value.end.length)throw new Error('Windi Voice chưa trả timestamp của lượt tạo. Chạy lại để tải, không tạo lượt mới.');
  for(let i=0;i<value.words.length;i++)if(typeof value.words[i]!=='string'||!value.words[i].trim()||!Number.isFinite(value.start[i])||!Number.isFinite(value.end[i])||value.start[i]<0||value.end[i]<value.start[i]||(i&&value.start[i]<value.start[i-1]))throw new Error('Timestamp Windi Voice không hợp lệ.');
  return {words:value.words,start:value.start,end:value.end};
}
async function windiAudio(connection, segment, output, signature, signal, report) {
  const receiptFile=output+'.windi-job.json';let receipt;
  try{receipt=JSON.parse(await readFile(receiptFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw new Error('Không đọc được mã lượt tạo Windi Voice. Giữ file để kiểm tra, tránh tạo trùng credit.');}
  if(receipt?.signature!==signature)receipt={signature,key:'windi-dub-'+signature};
  let job;
  if(receipt.id){
    if(!isUuid(receipt.id))throw new Error('Mã lượt tạo Windi Voice đã lưu không hợp lệ.');
    job=windiJob(await (await request(connection,'windi','/api/v1/voice/generations/'+receipt.id,signal)).json());
    if(job.status==='failed'){
      // A new invocation is an explicit retry, after the server confirms failure.
      receipt={signature,key:'windi-dub-'+randomUUID()};job=null;
    }
  }
  if(!job){
    await writeFile(receiptFile,JSON.stringify(receipt));
    job=windiJob(await (await request(connection,'windi','/api/v1/voice/generations',signal,{text:segment.translation.normalize('NFC').trim(),voice_id:segment.voice,language:'vi',speed:1},{headers:{'Idempotency-Key':receipt.key}})).json());
    receipt.id=job.id;await writeFile(receiptFile,JSON.stringify(receipt));
  }
  const deadline=Date.now()+120_000;
  while(['pending','reserved'].includes(job.status)){
    if(Date.now()>=deadline)throw new Error('Windi Voice vẫn đang xử lý. Chạy lại để tiếp tục kiểm tra lượt đã tạo.');
    report('Windi Voice đang xử lý. Mã lượt tạo đã được lưu.');
    await pause(1000,undefined,{signal});
    job=windiJob(await (await request(connection,'windi','/api/v1/voice/generations/'+receipt.id,signal)).json());
  }
  if(job.status==='unknown')throw new Error('Lượt Windi Voice đang chờ đối soát. Kiểm tra trên tài khoản Windi; kit sẽ không tự tạo lượt mới.');
  if(job.status==='failed')throw new Error('Lượt Windi Voice thất bại. Kiểm tra tài khoản rồi bấm chạy lại để thử lượt mới.');
  const detail=windiJob(await (await request(connection,'windi','/api/v1/voice/generations/'+receipt.id+'?include=timestamps',signal)).json());
  if(detail.status!=='ready')throw new Error('Windi Voice chưa sẵn sàng tải audio. Chạy lại để tiếp tục lượt đã lưu.');
  const timestamps=windiTiming(detail.timestamps);
  await writeFile(output+'.windi-timing.json',JSON.stringify({generationId:receipt.id,timestamps}));
  const response=await request(connection,'windi','/api/v1/voice/generations/'+receipt.id+'/audio',signal,null,{allowRedirect:true});
  if(response.ok)return response;
  const location=response.headers.get('location');await response.body?.cancel();
  let url;try{url=new URL(location,connection.baseUrl);}catch{throw new Error('Windi Voice không trả link audio hợp lệ.');}
  if(!location||url.username||url.password||!(url.protocol==='https:'||(url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname))))throw new Error('Link audio Windi Voice không hợp lệ.');
  // The private audio endpoint redirects to a signed storage URL. Never forward the Windi token.
  let audio;try{audio=await fetch(url,{redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(120_000)]):AbortSignal.timeout(120_000)});}catch{throw new Error(signal?.aborted?'Đã hủy tải audio Windi.':'Không tải được audio Windi. Chạy lại để tải lượt đã lưu.');}
  if(!audio.ok){await audio.body?.cancel();throw new Error('Không tải được audio Windi. Chạy lại để lấy link mới, không tạo lượt mới.');}
  return audio;
}
export async function apiSpeech({ root, config, segments, directory, signal, execute, report = () => {} }) {
  const provider = config.ttsProvider, connection = await voiceConnection(root, provider);
  // Validate the whole batch before the first paid request.
  for (const s of segments) {
    if (!s.voice || !s.translation || !/^[a-zA-Z0-9_-]{1,64}$/.test(s.id)) throw new Error('Mỗi người nói cần voice ID và mỗi câu cần bản dịch trước khi tạo tiếng API.');
    if (provider === 'openai' && s.translation.length > 4096) throw new Error('API tương thích OpenAI nhận tối đa 4096 ký tự mỗi câu. Chia nhỏ câu trước.');
    if(provider==='windi' && (!isUuid(s.voice)||Array.from(s.translation.normalize('NFC').trim()).length>10000))throw new Error('Windi Voice cần voice ID dạng UUID và tối đa 10.000 ký tự mỗi câu.');
  }
  if (provider!=='windi' && !config.apiModel) throw new Error('Nhập model ID của API voice.');
  await mkdir(directory, { recursive: true });
  for (const [i, s] of segments.entries()) {
    signal?.throwIfAborted();
    const output = join(directory, s.id + '.wav'), marker = output + '.api.json';
    const signature = digest({ connection, provider, model: provider==='windi'?'windi-voice-v1':config.apiModel, voice: s.voice, text: s.translation });
    let cached = false;
    try { cached = (await readFile(marker, 'utf8')) === signature && (await readFile(output)).length > 44; } catch { /* retry missing output */ }
    if (!cached) {
      const path = provider === 'elevenlabs' ? '/text-to-speech/' + encodeURIComponent(s.voice) + '?output_format=mp3_44100_128' : '/audio/speech';
      const body = provider === 'elevenlabs' ? { text: s.translation, model_id: config.apiModel } : { input: s.translation, voice: s.voice, model: config.apiModel, response_format: 'mp3' };
      const response = provider==='windi'?await windiAudio(connection,s,output,signature,signal,report):await request(connection, provider, path, signal, body);
      // Bound response size; do not persist JSON errors as audio.
      if (/json|text\/html/.test(response.headers.get('content-type') || '')) { await response.body?.cancel(); throw new Error('API cần trả audio trực tiếp, không phải JSON hoặc link tải.'); }
      const chunks = []; let size = 0;
      for await (const chunk of response.body) { size += chunk.length; if (size > 32 * 1024 ** 2) throw new Error('Audio API vượt quá 32MB mỗi câu.'); chunks.push(chunk); }
      if (!size) throw new Error('API trả audio rỗng.');
      const source = output + '.download'; await writeFile(source, Buffer.concat(chunks));
      await execute('ffmpeg', ['-y', '-v', 'error', '-i', source, '-ar', '48000', '-ac', '1', output + '.tmp.wav']);
      await rename(output + '.tmp.wav', output); await writeFile(marker, signature);
      await rm(output + '.json', { force: true });
    }
    report(`Đã tạo ${i + 1}/${segments.length} câu bằng API`, Math.round(100 * (i + 1) / segments.length));
  }
}
