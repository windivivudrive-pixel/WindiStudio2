import {boundedBody,cartesia,failure,identity,providerReady,resolveCloneAccent,VoiceError,writer} from '@/lib/voice/server';
import {isUUID,VOICE_LANGUAGES} from '@/lib/voice/shared';
export const runtime='nodejs';
export const maxDuration=120;
export async function POST(request:Request) {
 try {
  const {user}=await identity(request);
  if(!providerReady()) throw new VoiceError('Dịch vụ clone giọng chưa được kết nối.',503);
  if(Number(request.headers.get('content-length'))>4*1024*1024) throw new VoiceError('Mẫu giọng tối đa 3 MB.',413);
  const form=await (await boundedBody(request,4*1024*1024)).formData();
  const clip=form.get('clip'),name=String(form.get('name')||'').trim(),language=String(form.get('language')||'vi'),key=form.get('requestKey');
  if(!(clip instanceof File)||!clip.size||clip.size>3*1024*1024||!isUUID(key)||!name||name.length>80||form.get('consent')!=='true'||!VOICE_LANGUAGES.some(l=>l.id===language)) throw new VoiceError('Kiểm tra tên giọng, file mẫu (tối đa 3 MB) và xác nhận quyền sử dụng.');
  if(!/\.(mp3|wav|flac|ogg|webm)$/i.test(clip.name)) throw new VoiceError('Chọn file MP3, WAV, FLAC, OGG hoặc WebM.');
  const accent=await resolveCloneAccent(language,form.get('accent'));
  const db=writer();
  const {data:clone,error}=await db.rpc('windi_voice_clone_reserve',{p_user:user.id,p_key:key,p_name:name,p_language:language,p_accent:accent});
  if(error) throw error;
  if(clone.status==='ready') return Response.json({id:clone.id});
  const claim=await db.from('windi_voice_clones').update({status:'pending'}).eq('id',clone.id).eq('status','reserved').select('id').maybeSingle();
  if(claim.error) throw claim.error;
  if(!claim.data) throw new VoiceError('Mẫu này đã được tiếp nhận. Kiểm tra danh sách giọng clone.',409);
  const upload=new FormData();
  upload.set('clip',clip);upload.set('name',`WV ${clone.id}`);upload.set('description',name);upload.set('language',language);upload.set('access','private');if(accent) upload.set('accent',accent);
  let response:Response;
  try {response=await cartesia('/voices/clone',{method:'POST',body:upload});}
  catch {throw new VoiceError('Kết nối bị gián đoạn. Lượt clone đang được tạm giữ để đối soát. Vui lòng liên hệ hỗ trợ.',503);}
  if(!response.ok) {
    const refund=await db.rpc('windi_voice_clone_finish',{p_clone:clone.id,p_provider:null});
    if(refund.error) throw refund.error;
    throw new VoiceError('Chưa clone được giọng. Hãy dùng mẫu rõ tiếng hơn. Lượt clone đã được hoàn lại.',502);
  }
  const voice=await response.json();
  if(!isUUID(voice.id)) throw new VoiceError('Giọng clone đang chờ đối soát. Vui lòng liên hệ hỗ trợ.',503);
  const finish=await db.rpc('windi_voice_clone_finish',{p_clone:clone.id,p_provider:voice.id});
  if(finish.error) throw finish.error;
  return Response.json({id:clone.id});
 }catch(error){return failure(error);}
}
export async function DELETE(request:Request) {
 try {
  const {user}=await identity(request); const id=new URL(request.url).searchParams.get('id');
  if(!isUUID(id)) throw new VoiceError('Giọng không hợp lệ.');
  const db=writer();
  const {data:clone,error}=await db.from('windi_voice_clones').select('provider_id,status').eq('id',id).eq('user_id',user.id).maybeSingle();
  if(error) throw error;
  if(!clone || clone.status!=='ready') throw new VoiceError('Không tìm thấy giọng có thể xóa.',404);
  const response=await cartesia(`/voices/${encodeURIComponent(clone.provider_id)}`,{method:'DELETE'});
  if(!response.ok && response.status!==404) throw new VoiceError('Chưa xóa được giọng. Vui lòng thử lại.',502);
  const removed=await db.rpc('windi_voice_clone_remove',{p_user:user.id,p_clone:id});
  if(removed.error) throw removed.error;
  return Response.json({success:true});
 }catch(error){return failure(error);}
}
