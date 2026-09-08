import {failure,previewPublicVoice,providerReady,VoiceError} from '@/lib/voice/server';
import {isUUID} from '@/lib/voice/shared';

export const runtime='nodejs';

export async function GET(request:Request) {
  try {
    if(!providerReady()) throw new VoiceError('Bản nghe thử đang được kết nối với nhà cung cấp. Vui lòng quay lại sau.',503);
    const id=new URL(request.url).searchParams.get('id');
    if(!isUUID(id)) throw new VoiceError('Giọng nghe thử không hợp lệ.');
    const {audio,voice}=await previewPublicVoice(request,id);
    return new Response(audio,{headers:{'Content-Type':'audio/mpeg','Content-Disposition':`inline; filename="${voice.name.replaceAll(/[^a-z0-9]/gi,'-').toLowerCase()}-preview.mp3"`,'Cache-Control':'private, max-age=3600'}});
  } catch(error) {return failure(error);}
}
