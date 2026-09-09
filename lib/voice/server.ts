import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { STARTER_VOICES, VOICE_LANGUAGES, VOICE_LIBRARY_LANGUAGES, isSampleLibraryLanguage, voiceLibraryLimit, voiceUseCases, type StudioVoice, type VoiceAccent } from './shared';

export class VoiceError extends Error { constructor(message:string, public status=400) {super(message);} }
export const bucket = 'windi-voice-audio';
export const previewBucket = 'windi-voice-previews';
export function writer() {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY;
  if(!url||!key) throw new VoiceError('Dịch vụ giọng nói chưa được cấu hình.',503);
  return createSupabaseClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function identity(request?:Request) {
  if(request && request.method!=='GET') {
    const origin=request.headers.get('origin');
    if(origin && origin!==new URL(request.url).origin) throw new VoiceError('Yêu cầu không hợp lệ.',403);
  }
  const client=await createClient();
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user) throw new VoiceError('Đăng nhập để sử dụng Voice Studio.',401);
  return {user,client};
}
const messages:Record<string,string>={
  INVALID_INPUT:'Kiểm tra nội dung, giọng đọc và tốc độ. Tối đa 10.000 ký tự mỗi lần.',
  INVALID_TEXT:'Nội dung phải có từ 1 đến 10.000 ký tự.',
  INVALID_PLAN:'Gói này không còn khả dụng.',NO_SUBSCRIPTION:'Chọn gói dịch vụ để bắt đầu tạo giọng.',
  INSUFFICIENT_CREDITS:'Credit còn lại không đủ cho nội dung này.',CLONE_LIMIT:'Bạn đã dùng hết hạn mức clone hoặc số giọng được lưu của gói.',
  CLONE_REQUIRES_TRIAL:'Gói Chào mừng dùng được thư viện giọng. Chọn Clone thử đầu tiên để tạo giọng riêng.',
  CLONE_NOT_FOUND:'Không tìm thấy giọng có thể xóa.',
  ACTIVE_PERIOD:'Gói hiện tại còn hiệu lực. Bạn có thể mua chu kỳ tiếp theo khi gói hết hạn.',
  PENDING_ORDER:'Bạn đã có đơn chờ thanh toán. Kiểm tra đơn trong mục Gói dịch vụ.',
  REQUEST_PENDING:'Một yêu cầu đang xử lý hoặc chờ đối soát. Xem lại trong Lịch sử.',
  REQUEST_CONFLICT:'Mã yêu cầu đã được sử dụng cho nội dung khác.',
};
export function failure(error:unknown) {
  const message=error instanceof Error?error.message:String((error as {message?:string})?.message||'');
  const code=Object.keys(messages).find(k=>message.includes(k));
  return Response.json({error:code?messages[code]:error instanceof VoiceError?error.message:'Chưa thể hoàn tất. Vui lòng thử lại sau.'},{status:error instanceof VoiceError?error.status:code==='INVALID_INPUT'?400:code?409:503,headers:{'Cache-Control':'no-store'}});
}
export function providerReady() {return !!(process.env.CARTESIA_API_KEY || process.env.VITE_CARTESIA_API_KEY);}
export async function cartesia(path:string, init:RequestInit={}) {
  const apiKey = process.env.CARTESIA_API_KEY || process.env.VITE_CARTESIA_API_KEY;
  if(!apiKey) throw new VoiceError('Voice Studio đang được kết nối với nhà cung cấp. Vui lòng quay lại sau.',503);
  return fetch(`https://api.cartesia.ai${path}`,{...init,cache:'no-store',signal:AbortSignal.timeout(90000),headers:{Authorization:`Bearer ${apiKey}`,'Cartesia-Version':'2026-08-14',...init.headers}});
}
const PUBLIC_VOICE_TARGET_MAX = 12;
const PREVIEW_CACHE_MS = 60 * 60 * 1000;
const PREVIEW_WINDOW_MS = 60 * 1000;
const PREVIEW_MAX_PER_WINDOW = 12;
const PREVIEW_PATH_VERSION = 'v1';
let catalog:{expires:number;voices:StudioVoice[]}|undefined;
const accentCache = new Map<string,{expires:number;accents:VoiceAccent[]}>();
const previewCache = new Map<string,{expires:number;audio:ArrayBuffer}>();
const previewRequests = new Map<string,{startedAt:number;count:number}>();
const previewBuilds = new Map<string,Promise<ArrayBuffer>>();

type CartesiaCatalogPage = {voices:StudioVoice[]; hasMore:boolean; nextPage:string|null};

async function catalogPage(language?:string, cursor?:string):Promise<CartesiaCatalogPage> {
  const params=new URLSearchParams({limit:'100',is_owner:'false'});
  if(language) params.set('language',language);
  if(cursor) params.set('starting_after',cursor);
  const response=await cartesia(`/voices?${params}`);
  if(!response.ok) throw new VoiceError('Chưa tải được thư viện giọng. Vui lòng thử lại.',502);
  const result=await response.json();
  if(!Array.isArray(result.data)) throw new VoiceError('Thư viện giọng tạm thời không khả dụng.',502);
  return {
    voices:result.data
      .filter((voice:{access?:string;visibility?:string;is_owner?:boolean;status?:string})=>voice.access==='public'&&voice.visibility==='all'&&voice.is_owner===false&&voice.status==='active')
      .filter((voice:{language:string})=>isSampleLibraryLanguage(voice.language))
      .map((voice:{id:string;name:string;description?:string;tagline?:string;language:string;gender?:string})=>({id:voice.id,name:voice.name,description:voice.description||voice.tagline||'',language:voice.language,gender:voice.gender,useCases:voiceUseCases(voice.tagline,voice.description),kind:'public'})),
    hasMore:result.has_more===true,
    nextPage:typeof result.next_page==='string'?result.next_page:null,
  };
}

export async function publicVoices():Promise<{voices:StudioVoice[]; source:string}> {
  if(!providerReady()) return {voices:STARTER_VOICES,source:'documented'};
  if(catalog && catalog.expires>Date.now()) return {voices:catalog.voices,source:'live'};
  const pages=await Promise.all(VOICE_LIBRARY_LANGUAGES.map(async language=>({language:language.id,page:await catalogPage(language.id)})));
  const seen=new Set<string>();
  const voices:StudioVoice[]=[];
  for(let index=0;index<PUBLIC_VOICE_TARGET_MAX;index++) {
    for(const {language,page} of pages) {
      if(index>=voiceLibraryLimit(language)) continue;
      const voice=page.voices[index];
      if(voice&&!seen.has(voice.id)) {
        seen.add(voice.id);voices.push(voice);
      }
    }
  }
  catalog={expires:Date.now()+300000,voices};
  return {voices,source:'live'};
}
export async function publicVoice(id:string) {
  return (await publicVoices()).voices.find(voice=>voice.id===id) ?? null;
}

export async function voiceAccents(language:string):Promise<VoiceAccent[]> {
  if(!VOICE_LANGUAGES.some(item=>item.id===language)) throw new VoiceError('Ngôn ngữ giọng không hợp lệ.');
  const cached=accentCache.get(language);
  if(cached&&cached.expires>Date.now()) return cached.accents;
  const response=await cartesia(`/accents?${new URLSearchParams({language})}`);
  if(!response.ok) throw new VoiceError('Chưa tải được danh sách accent. Vui lòng thử lại.',502);
  const result=await response.json();
  if(!Array.isArray(result.accents)) throw new VoiceError('Danh sách accent tạm thời không khả dụng.',502);
  const accents=result.accents
    .filter((accent:unknown):accent is {id:string;name:string;language:string;locale:string;is_locale_default?:boolean;is_localizable?:boolean}=>!!accent&&typeof accent==='object'&&typeof (accent as {id?:unknown}).id==='string'&&typeof (accent as {name?:unknown}).name==='string'&&typeof (accent as {language?:unknown}).language==='string'&&typeof (accent as {locale?:unknown}).locale==='string')
    .filter(accent=>accent.language===language)
    .map(accent=>({id:accent.id,name:accent.name,language:accent.language,locale:accent.locale,isLocaleDefault:accent.is_locale_default===true,isLocalizable:accent.is_localizable===true}));
  accentCache.set(language,{expires:Date.now()+300000,accents});
  return accents;
}

export async function resolveCloneAccent(language:string,value:unknown) {
  const accent=typeof value==='string'?value.trim():'';
  if(!accent) return null;
  if(accent.length>100) throw new VoiceError('Accent được chọn không hợp lệ.');
  const available=await voiceAccents(language);
  if(!available.some(item=>item.id===accent)) throw new VoiceError('Accent này không phù hợp với ngôn ngữ mẫu đã chọn.');
  return accent;
}

function previewTranscript(language:string) {
  return ({vi:'Xin chào, đây là giọng đọc mẫu của Windi Studio.',ko:'안녕하세요. 윈디 스튜디오의 음성 샘플입니다.',ja:'こんにちは。Windi Studio の音声サンプルです。',zh:'您好，这是 Windi Studio 的声音示例。',th:'สวัสดี นี่คือตัวอย่างเสียงจาก Windi Studio.'}[language] ?? 'Hello, this is a voice sample from Windi Studio.');
}
function previewRequestKey(request:Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
}
function canPreview(request:Request) {
  const key=previewRequestKey(request),now=Date.now();
  for(const [candidate,entry] of previewRequests) if(now-entry.startedAt>=PREVIEW_WINDOW_MS) previewRequests.delete(candidate);
  const current=previewRequests.get(key);
  if(!current||now-current.startedAt>=PREVIEW_WINDOW_MS) {previewRequests.set(key,{startedAt:now,count:1});return true;}
  if(current.count>=PREVIEW_MAX_PER_WINDOW) return false;
  current.count+=1;return true;
}
function previewStoragePath(voice:StudioVoice) {return `${PREVIEW_PATH_VERSION}/${voice.id}.mp3`;}
async function storedPreview(path:string) {
  const {data,error}=await writer().storage.from(previewBucket).download(path);
  if(!error&&data) {
    const audio=await data.arrayBuffer();
    if(audio.byteLength) return audio;
  }
  const message=String((error as {message?:string}|null)?.message||'').toLowerCase();
  if(!error||message.includes('not found')) return null;
  throw new VoiceError('Thư viện bản nghe thử đang không khả dụng.',503);
}
async function createStoredPreview(voice:StudioVoice,path:string) {
  const existing=await storedPreview(path);
  if(existing) return existing;
  const response=await cartesia('/tts/bytes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model_id:'sonic-3.6',transcript:previewTranscript(voice.language),voice:voice.id,language:voice.language,output_format:{container:'mp3',sample_rate:44100,bit_rate:128000}})});
  if(!response.ok) throw new VoiceError('Chưa tạo được bản nghe thử. Vui lòng thử lại.',502);
  const audio=await response.arrayBuffer();
  if(!audio.byteLength) throw new VoiceError('Bản nghe thử trống. Vui lòng thử lại.',502);
  const {error}=await writer().storage.from(previewBucket).upload(path,audio,{contentType:'audio/mpeg',cacheControl:'31536000',upsert:false});
  if(!error) return audio;
  // Another request may have saved the same deterministic sample first.
  const savedByAnotherRequest=await storedPreview(path);
  if(savedByAnotherRequest) return savedByAnotherRequest;
  throw new VoiceError('Chưa lưu được bản nghe thử. Vui lòng thử lại.',503);
}
export async function previewPublicVoice(request:Request,id:string) {
  const voice=await publicVoice(id);
  if(!voice) throw new VoiceError('Giọng này không có bản nghe thử.',404);
  const cached=previewCache.get(voice.id);
  if(cached&&cached.expires>Date.now()) return {voice,audio:cached.audio.slice(0)};
  const path=previewStoragePath(voice);
  const stored=await storedPreview(path);
  if(stored) {
    previewCache.set(voice.id,{expires:Date.now()+PREVIEW_CACHE_MS,audio:stored.slice(0)});
    return {voice,audio:stored};
  }
  let build=previewBuilds.get(path);
  if(!build) {
    if(!canPreview(request)) throw new VoiceError('Bạn đã nghe thử nhiều lần. Vui lòng thử lại sau một phút.',429);
    build=createStoredPreview(voice,path);
    previewBuilds.set(path,build);
    void build.then(()=>previewBuilds.delete(path),()=>previewBuilds.delete(path));
  }
  const audio=await build;
  previewCache.set(voice.id,{expires:Date.now()+PREVIEW_CACHE_MS,audio:audio.slice(0)});
  return {voice,audio};
}
export async function resolveVoice(userId:string,id:string) {
  const {data,error}=await writer().from('windi_voice_clones').select('provider_id,name').eq('user_id',userId).eq('provider_id',id).eq('status','ready').maybeSingle();
  if(error) throw error;
  if(data) return {id:data.provider_id,name:data.name};
  const v=await publicVoice(id);
  if(!v) throw new VoiceError('Giọng này không khả dụng với tài khoản của bạn.',403);
  return v;
}
export async function audioUrl(userId:string,jobId:string,download=false) {
  const db=writer();
  const {data:job,error}=await db.from('windi_voice_jobs').select('storage_path,status').eq('user_id',userId).eq('id',jobId).maybeSingle();
  if(error) throw error;
  if(!job?.storage_path || job.status!=='ready') throw new VoiceError('File âm thanh chưa sẵn sàng.',404);
  const {data,error:signError}=await db.storage.from(bucket).createSignedUrl(job.storage_path,600,download?{download:'windi-voice.mp3'}:undefined);
  if(signError) throw signError;
  return data.signedUrl;
}
export function paymentConfig() {
  const bank=process.env.VOICE_BANK_BIN || process.env.VITE_VOICE_BANK_BIN;
  const account=process.env.VOICE_BANK_ACCOUNT || process.env.VITE_VOICE_BANK_ACCOUNT;
  const name=process.env.VOICE_BANK_NAME || process.env.VITE_VOICE_BANK_NAME;
  const sepayKey=process.env.SEPAY_API_KEY || process.env.VITE_SEPAY_API_KEY;
  return bank&&account&&name&&sepayKey?{bank,account,name}:null;
}

// Enforce actual streamed body size, including requests without Content-Length.
export async function boundedBody(request:Request,limit=100000) {
  const reader=request.body?.getReader();
  if(!reader) throw new VoiceError('Nội dung yêu cầu bị thiếu.',400);
  const chunks:Uint8Array[]=[];let size=0;
  try {
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new VoiceError('Nội dung yêu cầu quá lớn.',413);}chunks.push(value);}
  } finally {reader.releaseLock();}
  return new Response(new Blob(chunks as BlobPart[]),{headers:{'Content-Type':request.headers.get('content-type')||'application/json'}});
}

export function generateVoicePaymentCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 8; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
  return `WINDI ${rand}`;
}

export async function ensureOrderValid<T extends { id: string; status: string; payment_code?: string; expires_at?: string; created_at?: string }>(order: T | null | undefined): Promise<T | null | undefined> {
  if (!order) return order;
  const now = Date.now();
  if (order.status === 'pending') {
    const isExpired = (order.expires_at && Date.parse(order.expires_at) <= now) ||
      (order.created_at && Date.parse(order.created_at) <= now - 5 * 60 * 1000);
    if (isExpired) {
      order.status = 'expired';
      try {
        await writer().from('windi_voice_orders').update({ status: 'expired' }).eq('id', order.id);
      } catch {
        // Ignore in test mocks
      }
      return order;
    }

    const needsNewCode = !order.payment_code || !order.payment_code.startsWith('WINDI ');
    const currentExpires = order.expires_at ? Date.parse(order.expires_at) : 0;
    // Cap expiration to 5 minutes if it had the old 24h interval
    const needsExpiresCap = !order.expires_at || currentExpires > now + 6 * 60 * 1000;

    if (needsNewCode || needsExpiresCap) {
      const updates: Record<string, unknown> = {};
      if (needsNewCode) {
        order.payment_code = generateVoicePaymentCode();
        updates.payment_code = order.payment_code;
      }
      if (needsExpiresCap) {
        const fiveMin = new Date(now + 5 * 60 * 1000).toISOString();
        order.expires_at = fiveMin;
        updates.expires_at = fiveMin;
      }
      try {
        await writer().from('windi_voice_orders').update(updates).eq('id', order.id);
      } catch {
        // Ignore in test mocks
      }
    }
  }
  return order;
}

export const ensureWindiPaymentCode = ensureOrderValid;
