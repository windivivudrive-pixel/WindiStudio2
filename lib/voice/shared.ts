export const VOICE_PLANS = [
  { id: 'welcome', name: 'Chào mừng', price_vnd: 0, credits: 1500, clone_limit: 0, duration_days: 7, billing: 'one_time', purchasable: false, description: '1.500 credit miễn phí khi bạn đăng ký.' },
  { id: 'trial', name: 'Clone thử đầu tiên', price_vnd: 29000, credits: 10000, clone_limit: 1, duration_days: 14, billing: 'one_time', purchasable: true, description: 'Tạo giọng riêng đầu tiên và dùng thử trong 14 ngày.' },
  { id: 'starter', name: 'Starter', price_vnd: 69000, credits: 30000, clone_limit: 1, duration_days: 30, billing: 'monthly', purchasable: true, description: 'Bắt đầu với giọng nói của riêng bạn.' },
  { id: 'creator', name: 'Creator', price_vnd: 269000, credits: 150000, clone_limit: 5, duration_days: 30, billing: 'monthly', purchasable: true, description: 'Cho nhà sáng tạo xuất bản đều đặn.' },
  { id: 'studio', name: 'Studio', price_vnd: 999000, credits: 600000, clone_limit: 20, duration_days: 30, billing: 'monthly', purchasable: true, description: 'Nhiều giọng kể. Nhiều câu chuyện hơn.' },
] as const;
export const VOICE_LANGUAGES = [{id:'vi',name:'Tiếng Việt'},{id:'en',name:'English'},{id:'ko',name:'한국어'},{id:'ja',name:'日本語'},{id:'zh',name:'中文'},{id:'fr',name:'Français'},{id:'de',name:'Deutsch'},{id:'es',name:'Español'},{id:'th',name:'ไทย'},{id:'id',name:'Bahasa Indonesia'}];
// Verified IDs published in Cartesia's Sonic 3.6 voice-selection documentation.
export const STARTER_VOICES: StudioVoice[] = [
  {id:'db6b0ed5-d5d3-463d-ae85-518a07d3c2b4',name:'Skylar',description:'Giọng nữ Mỹ • thân thiện',language:'en',gender:'feminine',kind:'public'},
  {id:'47c38ca4-5f35-497b-b1a3-415245fb35e1',name:'Daniel',description:'Giọng nam Mỹ',language:'en',gender:'masculine',kind:'public'},
  {id:'9626c31c-bec5-4cca-baa8-f8ba9e84c8bc',name:'Jacqueline',description:'Giọng nữ Mỹ',language:'en',gender:'feminine',kind:'public'},
  {id:'62ae83ad-4f6a-430b-af41-a9bede9286ca',name:'Gemma',description:'Giọng nữ Anh',language:'en',gender:'feminine',kind:'public'},
  {id:'ef191366-f52f-447a-a398-ed8c0f2943a1',name:'Archie',description:'Giọng nam Anh',language:'en',gender:'masculine',kind:'public'},
];
export type StudioVoice = {id:string; name:string; description:string; language:string; gender?:string; kind:'public'|'clone'};
export type VoicePeriod = {id:string; plan_id:string; credits:number; used_credits:number; clone_limit:number; clones_used:number; starts_at:string; ends_at:string};
export type VoiceClone = {id:string; provider_id:string|null; name:string; language:string; status:string; created_at:string};
export type VoiceJob = {id:string; voice_name:string; transcript:string; credits:number; status:string; created_at:string};
export type VoiceOrder = {id:string; plan_id:string; amount_vnd:number; payment_code:string; status:string; expires_at:string};
export type VoiceAccount = {period:VoicePeriod|null; clones:VoiceClone[]; jobs:VoiceJob[]; orders:VoiceOrder[]};
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
