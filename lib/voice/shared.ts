export const DEFAULT_WORKFLOW_VOICE_ID = '60cf30cf-dcad-4cb1-b2e9-b6c08a23569e';
export const VOICE_API_ENABLED = false;
export const MAX_WEB_GENERATION_CHARACTERS = 5000;
export const VOICE_PLANS = [
  { id: 'welcome', name: 'Chào mừng', price_vnd: 0, credits: 3000, clone_limit: 0, duration_days: 7, billing: 'one_time', purchasable: false, description: '3.000 credit miễn phí khi bạn đăng ký.' },
  { id: 'credit_10k', name: '10.000 credit', price_vnd: 39000, credits: 10000, clone_limit: 1, duration_days: 30, billing: 'one_time', purchasable: true, description: 'Gói credit gọn nhẹ để bắt đầu tạo giọng trực tiếp.' },
  { id: 'credit_100k', name: '100.000 credit', price_vnd: 169000, credits: 100000, clone_limit: 5, duration_days: 30, billing: 'one_time', purchasable: true, description: 'Dành cho nhà sáng tạo cần tạo nội dung thường xuyên.' },
  { id: 'credit_1m', name: '1.000.000 credit', price_vnd: 699000, credits: 1000000, clone_limit: 20, duration_days: 30, billing: 'one_time', purchasable: true, description: 'Chỉ dùng tạo trực tiếp trên Voice Studio; API đang tạm ngưng.' },
  // Keep retired plan definitions for displaying historical orders and periods.
  { id: 'trial', name: 'Clone thử đầu tiên', price_vnd: 39000, credits: 3000, clone_limit: 1, duration_days: 14, billing: 'one_time', purchasable: false, description: 'Gói cũ.' },
  { id: 'starter', name: 'Starter', price_vnd: 99000, credits: 30000, clone_limit: 1, duration_days: 30, billing: 'monthly', purchasable: false, description: 'Gói cũ.' },
  { id: 'creator', name: 'Creator', price_vnd: 269000, credits: 100000, clone_limit: 5, duration_days: 30, billing: 'monthly', purchasable: false, description: 'Gói cũ.' },
  { id: 'studio', name: 'Studio', price_vnd: 1169000, credits: 500000, clone_limit: 20, duration_days: 30, billing: 'monthly', purchasable: false, description: 'Gói cũ.' },
] as const;
export const VOICE_LANGUAGES = [{id:'vi',name:'Tiếng Việt'},{id:'en',name:'English'},{id:'ko',name:'한국어'},{id:'ja',name:'日本語'},{id:'zh',name:'中文'},{id:'fr',name:'Français'},{id:'de',name:'Deutsch'},{id:'es',name:'Español'},{id:'th',name:'ไทย'},{id:'id',name:'Bahasa Indonesia'}];
export const VOICE_LIBRARY_LANGUAGES = [{id:'vi',name:'Tiếng Việt'},{id:'en',name:'English'},{id:'fr',name:'Français'},{id:'es',name:'Español'},{id:'ko',name:'한국어'},{id:'th',name:'ไทย'},{id:'ja',name:'日本語'},{id:'zh',name:'中文'}] as const;
export const VOICE_LIBRARY_VOICE_LIMITS = {default:5,en:12} as const;
export const VOICE_CLONE_CLIP_LIMITS = {maxBytes:3*1024*1024,maxDurationMs:60*1000} as const;
export const VOICE_CLONE_DEMO_SAMPLES = {
  greeting: 'Chào mừng bạn đến WindiStudio, hãy cùng sử dụng AI một cách hiệu quả.',
  news: 'Sáng nay, thành phố khai trương thư viện mới, mở cửa miễn phí để người dân đọc sách và học tập.',
  paid: 'Chào mừng bạn đến với WindiStudio.',
} as const;
export type VoiceCloneSample = keyof typeof VOICE_CLONE_DEMO_SAMPLES;
export type VoiceUseCase = 'advertising'|'conversation'|'entertainment';
const SAMPLE_LANGUAGE_IDS = new Set<string>(VOICE_LIBRARY_LANGUAGES.map(language=>language.id));
const USE_CASE_RULES:ReadonlyArray<{tag:VoiceUseCase;pattern:RegExp}> = [
  {tag:'advertising',pattern:/\b(advertising|advertisement|commercial|marketing|promotional)\b/i},
  {tag:'conversation',pattern:/\b(conversation(?:al)?|dialogue|dialog)\b/i},
  {tag:'entertainment',pattern:/\b(entertainment|gaming|game character|character voice)\b/i},
];
export const isSampleLibraryLanguage = (language:string) => SAMPLE_LANGUAGE_IDS.has(language.split(/[-_]/)[0].toLowerCase());
export const voiceLibraryLimit = (language:string) => {
  const base=language.split(/[-_]/)[0].toLowerCase();
  return base==='en'?VOICE_LIBRARY_VOICE_LIMITS.en:VOICE_LIBRARY_VOICE_LIMITS.default;
};
export function voiceUseCases(tagline?:string|null,description?:string|null):VoiceUseCase[] {
  const source=[tagline,description].filter((value):value is string=>typeof value==='string').join(' ');
  return USE_CASE_RULES.filter(rule=>rule.pattern.test(source)).map(rule=>rule.tag);
}
// Verified IDs used by the Windi Clone Pro 3.0 public voice library.
export const STARTER_VOICES: StudioVoice[] = [
  {id:'db6b0ed5-d5d3-463d-ae85-518a07d3c2b4',name:'Skylar',description:'Giọng nữ Mỹ • thân thiện',language:'en',gender:'feminine',kind:'public'},
  {id:'47c38ca4-5f35-497b-b1a3-415245fb35e1',name:'Daniel',description:'Giọng nam Mỹ',language:'en',gender:'masculine',kind:'public'},
  {id:'9626c31c-bec5-4cca-baa8-f8ba9e84c8bc',name:'Jacqueline',description:'Giọng nữ Mỹ',language:'en',gender:'feminine',kind:'public'},
  {id:'62ae83ad-4f6a-430b-af41-a9bede9286ca',name:'Gemma',description:'Giọng nữ Anh',language:'en',gender:'feminine',kind:'public'},
  {id:'ef191366-f52f-447a-a398-ed8c0f2943a1',name:'Archie',description:'Giọng nam Anh',language:'en',gender:'masculine',kind:'public'},
];
export const CURATED_PUBLIC_VOICES: StudioVoice[] = [
  {id:'a1777309406040f8b90c19158dab5979',name:'Đức Bảo',description:'Giọng nam tiếng Việt • truyền cảm',language:'vi',gender:'masculine',kind:'public',provider:'heygen',heygenId:'a1777309406040f8b90c19158dab5979',cartesiaId:'4499b44b-5180-4d65-9d76-e24405138493'},
  {id:'983cef4eb4aa4d98bbbae049315744b0',name:'Minh Dự',description:'Giọng nam tiếng Việt • dí dỏm, hoạt bát',language:'vi',gender:'masculine',kind:'public',provider:'heygen',heygenId:'983cef4eb4aa4d98bbbae049315744b0',cartesiaId:'094e72c3-97d3-439a-9e64-39ac3d3fa897'},
  {id:'50d72b4f596b4a50bf23c3547a739615',name:'Ngô Đình',description:'Giọng nam tiếng Việt • ấm áp, tự nhiên',language:'vi',gender:'masculine',kind:'public',provider:'heygen',heygenId:'50d72b4f596b4a50bf23c3547a739615',cartesiaId:'60cf30cf-dcad-4cb1-b2e9-b6c08a23569e'},
  {id:'9baf4ace12dc4c34b2fafa3811dac1a7',name:'Kim Ánh',description:'Giọng nữ tiếng Việt • nhẹ nhàng, sâu lắng',language:'vi',gender:'feminine',kind:'public',provider:'heygen',heygenId:'9baf4ace12dc4c34b2fafa3811dac1a7',cartesiaId:'aac29502-cd10-4767-93c3-196ff83db354'},
  {id:'7915d7fa4f7f4fbb8c6fea99a707524d',name:'Tố My',description:'Giọng nữ tiếng Việt • ngọt ngào, cảm xúc',language:'vi',gender:'feminine',kind:'public',provider:'heygen',heygenId:'7915d7fa4f7f4fbb8c6fea99a707524d',cartesiaId:'467b7271-7d3d-4509-ab95-7cb4be6f5ef3'},
  // ACTIVE instant clones read from the owner's HeyGen workspace on 2026-10-27.
  {id:'528ff6a33578494e827fbc7451b9f4b4',name:'Quỳnh Nhi',description:'Giọng clone tiếng Việt',language:'vi',kind:'public',provider:'heygen',heygenId:'528ff6a33578494e827fbc7451b9f4b4'},
  {id:'c0fe5a980a14451aace8a5d7d3504163',name:'Lữ Trình',description:'Giọng clone tiếng Việt',language:'vi',kind:'public',provider:'heygen',heygenId:'c0fe5a980a14451aace8a5d7d3504163'},
  {id:'aad4386756084ceb93fe87a70e0bd296',name:'Kim Thoa',description:'Giọng clone tiếng Việt',language:'vi',kind:'public',provider:'heygen',heygenId:'aad4386756084ceb93fe87a70e0bd296'},
  {id:'7a6eb31448bd466e84e8af7a8e12136f',name:'Thanh Thảo',description:'Giọng clone tiếng Việt',language:'vi',kind:'public',provider:'heygen',heygenId:'7a6eb31448bd466e84e8af7a8e12136f'},
  {id:'7dc25b191a794ecba206cab6f0c70576',name:'Đình Mạnh',description:'Giọng clone tiếng Việt',language:'vi',kind:'public',provider:'heygen',heygenId:'7dc25b191a794ecba206cab6f0c70576'},
];
export const DEFAULT_STUDIO_VOICE = CURATED_PUBLIC_VOICES[1];
export const COMPARISON_VOICES: StudioVoice[] = [
  {id:'6aee11c6-bef9-4fd0-9f45-1a1c25dcdcde',name:'Chữa Lành',description:'Voice Podcast Chữa Lành · Ấm áp, chậm rãi, giàu khoảng lặng',language:'vi',gender:'feminine',useCases:['conversation'],kind:'public'},
  {id:'f2a05c6a-fc36-4d1a-b5c4-dd2e5af15af7',name:'Khoa',description:'Giọng Nam Vlog (Khoa) · Tự nhiên, gần gũi, giàu năng lượng',language:'vi',gender:'masculine',useCases:['entertainment'],kind:'public'},
  {id:'c61ed9bd-944a-40db-b302-410985821200',name:'T Min',description:'Nữ Podcast (T.Min) · Chín chắn, rõ ý, đúng nhịp trò chuyện',language:'vi',gender:'feminine',useCases:['conversation'],kind:'public'},
  {id:'b30f58c7-3a20-4144-a8b2-ee64cf5ae28e',name:'T Nhi',description:'Nữ Vlog (T.Nhi) · Tươi sáng, linh hoạt, bắt nhịp nhanh',language:'vi',gender:'feminine',useCases:['advertising','entertainment'],kind:'public'},
  {id:'293e81de-ef7a-40ec-bdbc-3e641e76256c',name:'Truyện Ma',description:'Truyện Ma (Loc Thanh) · Kịch tính, kéo nhịp, tạo không khí',language:'vi',gender:'masculine',useCases:['entertainment'],kind:'public'},
];
// Showcase voices are restricted to the static comparison recordings.
export const isComparisonVoice = (id:string) => COMPARISON_VOICES.some(voice=>voice.id===id.toLowerCase());
export type VoiceProvider = 'heygen' | 'cartesia';
export type StudioVoice = {id:string; name:string; description:string; language:string; gender?:string; useCases?:VoiceUseCase[]; kind:'public'|'clone'; provider?:VoiceProvider; heygenId?:string; cartesiaId?:string};
// Existing cloned voices identify their provider by the format used elsewhere in the clone flow.
export function isHeyGenLibraryVoice(voice:StudioVoice) {
  if (voice.kind === 'clone') return /^[0-9a-f]{32}$/i.test(voice.id);
  return voice.provider === 'heygen' && !!voice.heygenId && voice.id.toLowerCase() === voice.heygenId.toLowerCase();
}
export type VoiceAccent = {id:string;name:string;language:string;locale:string;isLocaleDefault:boolean;isLocalizable:boolean};
export type VoicePeriod = {id:string; plan_id:string; credits:number; used_credits:number; clone_limit:number; clones_used:number; starts_at:string; ends_at:string};
export type VoiceClone = {id:string; provider_id:string|null; name:string; language:string; accent:string|null; status:string; created_at:string;is_demo?:boolean;demo_expires_at?:string|null};
export type VoiceJob = {id:string; voice_name:string; transcript:string; credits:number; status:string; created_at:string};
export type VoiceOrder = {id:string; plan_id:string; amount_vnd:number; payment_code:string; status:string; expires_at:string;created_at?:string;paid_at?:string|null;demo_clone_id?:string|null};
export type VoiceAccount = {isAdmin?:boolean;period:VoicePeriod|null;nextPeriod?:Pick<VoicePeriod,'plan_id'|'starts_at'|'ends_at'>|null; bonus?:{voice_credits:number;voice_credits_used:number}|null; clones:VoiceClone[]; jobs:VoiceJob[]; orders:VoiceOrder[]};
export const countCredits = (text:string) => Array.from(text.normalize('NFC').trim()).length;
export const formatNumber = (n:number) => new Intl.NumberFormat('vi-VN').format(n);
export const isUUID = (value:unknown): value is string => typeof value === 'string' && (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) || /^[0-9a-f]{32}$/i.test(value));
export function validateSpeech(body:Record<string,unknown>) {
  if (typeof body.text!=='string' || !isUUID(body.requestKey) || !isUUID(body.voiceId)) throw new Error('INVALID_INPUT');
  const text=body.text.normalize('NFC').trim();
  const characters=countCredits(text);
  const language=String(body.language ?? 'vi');
  const speed=Number(body.speed ?? 1);
  const provider = body.provider === 'cartesia' ? ('cartesia' as const) : ('heygen' as const);
  if (!characters || characters>MAX_WEB_GENERATION_CHARACTERS || !Number.isFinite(speed) || speed<0.6 || speed>1.5 || !VOICE_LANGUAGES.some(l=>l.id===language)) throw new Error('INVALID_INPUT');
  return {text,language,speed,requestKey:body.requestKey,voiceId:body.voiceId,provider};
}
