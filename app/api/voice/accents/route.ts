import {failure,identity,providerReady,voiceAccents,VoiceError} from '@/lib/voice/server';
import {VOICE_LANGUAGES} from '@/lib/voice/shared';

export async function GET(request:Request) {
 try {
  await identity();
  if(!providerReady()) throw new VoiceError('Dịch vụ clone giọng chưa được kết nối.',503);
  const language=new URL(request.url).searchParams.get('language')||'vi';
  if(!VOICE_LANGUAGES.some(item=>item.id===language)) throw new VoiceError('Ngôn ngữ giọng không hợp lệ.');
  return Response.json({accents:await voiceAccents(language)},{headers:{'Cache-Control':'private, max-age=300'}});
 } catch(error) {return failure(error);}
}
