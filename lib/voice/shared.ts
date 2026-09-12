export const DEFAULT_WORKFLOW_VOICE_ID = '60cf30cf-dcad-4cb1-b2e9-b6c08a23569e';
export const VOICE_PLANS = [
  { id: 'welcome', name: 'Chào mừng', price_vnd: 0, credits: 1500, clone_limit: 0, duration_days: 7, billing: 'one_time', purchasable: false, description: '1.500 credit miễn phí khi bạn đăng ký.' },
  { id: 'trial', name: 'Clone thử đầu tiên', price_vnd: 29000, credits: 10000, clone_limit: 1, duration_days: 14, billing: 'one_time', purchasable: true, description: 'Tạo giọng riêng đầu tiên và dùng thử trong 14 ngày.' },
  { id: 'starter', name: 'Starter', price_vnd: 69000, credits: 30000, clone_limit: 1, duration_days: 30, billing: 'monthly', purchasable: true, description: 'Bắt đầu với giọng nói của riêng bạn.' },
  { id: 'creator', name: 'Creator', price_vnd: 269000, credits: 150000, clone_limit: 5, duration_days: 30, billing: 'monthly', purchasable: true, description: 'Cho nhà sáng tạo xuất bản đều đặn.' },
  { id: 'studio', name: 'Studio', price_vnd: 999000, credits: 600000, clone_limit: 20, duration_days: 30, billing: 'monthly', purchasable: true, description: 'Nhiều giọng kể. Nhiều câu chuyện hơn.' },
] as const;
export const VOICE_LANGUAGES = [{id:'vi',name:'Tiếng Việt'},{id:'en',name:'English'},{id:'ko',name:'한국어'},{id:'ja',name:'日本語'},{id:'zh',name:'中文'},{id:'fr',name:'Français'},{id:'de',name:'Deutsch'},{id:'es',name:'Español'},{id:'th',name:'ไทย'},{id:'id',name:'Bahasa Indonesia'}];
export const VOICE_LIBRARY_LANGUAGES = [{id:'en',name:'English'},{id:'fr',name:'Français'},{id:'es',name:'Español'},{id:'ko',name:'한국어'},{id:'th',name:'ไทย'},{id:'ja',name:'日本語'},{id:'zh',name:'中文'},{id:'vi',name:'Tiếng Việt'}] as const;
export const VOICE_LIBRARY_VOICE_LIMITS = {default:5,en:12} as const;
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
// Verified IDs used by the Clone Pro 2.1 public voice library.
export const STARTER_VOICES: StudioVoice[] = [
  {id:'db6b0ed5-d5d3-463d-ae85-518a07d3c2b4',name:'Skylar',description:'Giọng nữ Mỹ • thân thiện',language:'en',gender:'feminine',kind:'public'},
  {id:'47c38ca4-5f35-497b-b1a3-415245fb35e1',name:'Daniel',description:'Giọng nam Mỹ',language:'en',gender:'masculine',kind:'public'},
  {id:'9626c31c-bec5-4cca-baa8-f8ba9e84c8bc',name:'Jacqueline',description:'Giọng nữ Mỹ',language:'en',gender:'feminine',kind:'public'},
  {id:'62ae83ad-4f6a-430b-af41-a9bede9286ca',name:'Gemma',description:'Giọng nữ Anh',language:'en',gender:'feminine',kind:'public'},
  {id:'ef191366-f52f-447a-a398-ed8c0f2943a1',name:'Archie',description:'Giọng nam Anh',language:'en',gender:'masculine',kind:'public'},
];
export const COMPARISON_VOICES: StudioVoice[] = [
  {id:'6aee11c6-bef9-4fd0-9f45-1a1c25dcdcde',name:'Chữa Lành',description:'Voice Podcast Chữa Lành · Ấm áp, chậm rãi, giàu khoảng lặng',language:'vi',gender:'feminine',useCases:['conversation'],kind:'public'},
  {id:'f2a05c6a-fc36-4d1a-b5c4-dd2e5af15af7',name:'Khoa',description:'Giọng Nam Vlog (Khoa) · Tự nhiên, gần gũi, giàu năng lượng',language:'vi',gender:'masculine',useCases:['entertainment'],kind:'public'},
  {id:'c61ed9bd-944a-40db-b302-410985821200',name:'T Min',description:'Nữ Podcast (T.Min) · Chín chắn, rõ ý, đúng nhịp trò chuyện',language:'vi',gender:'feminine',useCases:['conversation'],kind:'public'},
  {id:'b30f58c7-3a20-4144-a8b2-ee64cf5ae28e',name:'T Nhi',description:'Nữ Vlog (T.Nhi) · Tươi sáng, linh hoạt, bắt nhịp nhanh',language:'vi',gender:'feminine',useCases:['advertising','entertainment'],kind:'public'},
  {id:'293e81de-ef7a-40ec-bdbc-3e641e76256c',name:'Truyện Ma',description:'Truyện Ma (Loc Thanh) · Kịch tính, kéo nhịp, tạo không khí',language:'vi',gender:'masculine',useCases:['entertainment'],kind:'public'},
];
export type StudioVoice = {id:string; name:string; description:string; language:string; gender?:string; useCases?:VoiceUseCase[]; kind:'public'|'clone'};
export type VoiceAccent = {id:string;name:string;language:string;locale:string;isLocaleDefault:boolean;isLocalizable:boolean};
export type VoicePeriod = {id:string; plan_id:string; credits:number; used_credits:number; clone_limit:number; clones_used:number; starts_at:string; ends_at:string};
export type VoiceClone = {id:string; provider_id:string|null; name:string; language:string; accent:string|null; status:string; created_at:string};
export type VoiceJob = {id:string; voice_name:string; transcript:string; credits:number; status:string; created_at:string};
export type VoiceOrder = {id:string; plan_id:string; amount_vnd:number; payment_code:string; status:string; expires_at:string;created_at?:string;paid_at?:string|null};
export type VoiceAccount = {isAdmin?:boolean;period:VoicePeriod|null; bonus?:{voice_credits:number;voice_credits_used:number}|null; clones:VoiceClone[]; jobs:VoiceJob[]; orders:VoiceOrder[]; trialEligible:boolean};
export const countCredits = (text:string) => Array.from(text.normalize('NFC').trim()).length;
export const formatNumber = (n:number) => new Intl.NumberFormat('vi-VN').format(n);
export const isUUID = (value:unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function validateSpeech(body:Record<string,unknown>) {
  if (typeof body.text!=='string' || !isUUID(body.requestKey) || !isUUID(body.voiceId)) throw new Error('INVALID_INPUT');
  const text=body.text.normalize('NFC').trim();
  const language=String(body.language ?? 'vi');
  const speed=Number(body.speed ?? 1);
  if (!countCredits(text) || countCredits(text)>10000 || !Number.isFinite(speed) || speed<0.6 || speed>1.5 || !VOICE_LANGUAGES.some(l=>l.id===language)) throw new Error('INVALID_INPUT');
  return {text,language,speed,requestKey:body.requestKey,voiceId:body.voiceId};
}
