import {audioUrl,failure,identity,VoiceError} from '@/lib/voice/server';
import {isUUID} from '@/lib/voice/shared';
export async function GET(request:Request) {
 try {
  const {user}=await identity(); const id=new URL(request.url).searchParams.get('id');
  if(!isUUID(id)) throw new VoiceError('File không hợp lệ.');
  if(new URL(request.url).searchParams.get('download')==='1') return Response.redirect(await audioUrl(user.id,id,true),307);
  return Response.json({url:await audioUrl(user.id,id)},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return failure(error);}
}
