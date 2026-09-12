import 'server-only';
import { cartesia, VoiceError, writer } from './server';
import { isUUID, type StudioVoice } from './shared';

export async function isVoiceAdmin(userId: string) {
  const {data,error}=await writer().from('windi_voice_admins').select('user_id').eq('user_id',userId).maybeSingle();
  if(error) throw new VoiceError('Chưa xác minh được quyền quản trị.',503);
  return data?.user_id === userId;
}

export async function requireVoiceAdmin(userId: string) {
  if(!await isVoiceAdmin(userId)) throw new VoiceError('Chỉ admin Voice Studio được truy cập.',403);
}

function studioVoice(v: Record<string,unknown>): StudioVoice {
  if(!isUUID(v.id)||typeof v.name!=='string') throw new VoiceError('Dữ liệu giọng không hợp lệ.',502);
  return {id:v.id,name:v.name,language:typeof v.language==='string'?v.language:'vi',description:typeof v.description==='string'?v.description:'',kind:'public'};
}

export async function providerVoice(id:string) {
  if(!isUUID(id)) throw new VoiceError('Voice ID không hợp lệ.');
  const response=await cartesia(`/voices/${encodeURIComponent(id)}`,{}, {purpose:'main'});
  if(!response.ok) throw new VoiceError(response.status===404?'Không tìm thấy giọng trong tài khoản Cartesia đang kết nối.':'Cartesia chưa cho phép truy cập giọng này.',response.status===404?404:502);
  return studioVoice(await response.json());
}

export async function adminVoicePage(cursor?:string) {
  if(cursor&&!isUUID(cursor)) throw new VoiceError('Trang giọng không hợp lệ.');
  const params=new URLSearchParams({limit:'100'});
  if(cursor) params.set('starting_after',cursor);
  const response=await cartesia(`/voices?${params}`,{}, {purpose:'main'});
  if(!response.ok) throw new VoiceError('Chưa tải được thư viện Cartesia.',502);
  const body=await response.json();
  if(!Array.isArray(body.data)) throw new VoiceError('Dữ liệu thư viện không hợp lệ.',502);
  return {voices:body.data.map(studioVoice),hasMore:body.has_more===true,nextPage:typeof body.next_page==='string'?body.next_page:null};
}
