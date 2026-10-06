import {clonePreview} from '@/lib/voice/clone-demo';
import {boundedBody,failure,identity,VoiceError} from '@/lib/voice/server';
import {isUUID,VOICE_CLONE_DEMO_SAMPLES,type VoiceCloneSample} from '@/lib/voice/shared';
export const runtime='nodejs';
export const maxDuration=120;
export async function POST(request:Request) {
 try {
  const {user}=await identity(request);
  const body=await (await boundedBody(request)).json();
  if(!isUUID(body.cloneId)||typeof body.preset!=='string'||!Object.hasOwn(VOICE_CLONE_DEMO_SAMPLES,body.preset)||Object.keys(body).some(key=>!['cloneId','preset'].includes(key)))throw new VoiceError('Chỉ nghe được các câu mẫu cố định.');
  const audio=await clonePreview(user.id,body.cloneId,body.preset as VoiceCloneSample);
  return new Response(audio,{headers:{'Content-Type':'audio/mpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(error){return failure(error);}
}
