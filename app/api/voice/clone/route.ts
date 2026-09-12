import {boundedBody,cartesia,failure,identity,providerReady,resolveCloneAccent,VoiceError,writer} from '@/lib/voice/server';
import {isUUID,VOICE_LANGUAGES} from '@/lib/voice/shared';
export const runtime='nodejs';
export const maxDuration=120;

type ProviderFailure={errorCode:string;requestId:string};

async function providerFailure(response:Response):Promise<ProviderFailure> {
  const body=await response.json().catch(()=>null) as {error_code?:unknown;request_id?:unknown}|null;
  return {
    errorCode:typeof body?.error_code==='string'?body.error_code:'',
    requestId:typeof body?.request_id==='string'?body.request_id:'',
  };
}

function providerMessage(status:number,errorCode:string) {
  if(status===402||errorCode==='plan_upgrade_required') return 'Tính năng clone phía Cartesia chưa được kích hoạt cho gói API hiện tại. Vui lòng liên hệ hỗ trợ để nâng cấp nhà cung cấp.';
  if(status===401||status===403) return 'Dịch vụ clone giọng chưa được cấp quyền. Vui lòng quay lại sau.';
  if(status===413) return 'Mẫu giọng quá lớn. Hãy chọn file nhỏ hơn 3 MB.';
  if(status===400||status===422) return 'Mẫu giọng chưa phù hợp để clone. Hãy dùng đoạn thu rõ tiếng, một người nói liên tục trong khoảng 5–10 giây.';
  if(status===429) return 'Dịch vụ clone đang bận. Hãy thử lại sau ít phút.';
  if(status>=500) return 'Dịch vụ Cartesia đang tạm gián đoạn. Vui lòng thử lại sau.';
  return 'Chưa clone được giọng lúc này. Hãy thử lại với mẫu thu rõ tiếng hơn.';
}

function missingAccentSchema(error: unknown) {
 const detail=error as {code?:string;message?:string}|null;
 const message=String(detail?.message||'').toLowerCase();
 return detail?.code==='42703'||(detail?.code==='PGRST202'&&message.includes('p_accent'));
}

export async function POST(request:Request) {
 let cloneId:string|undefined;
 let reservationActive=false;
 let providerVoiceId:string|undefined;
 let userId:string|undefined;
 let db:ReturnType<typeof writer>|undefined;
 const releaseReservation=async()=>{
  if(!cloneId||!reservationActive||!db) return;
  const {error}=await db.rpc('windi_voice_clone_finish',{p_clone:cloneId,p_provider:null});
  if(error) throw error;
  reservationActive=false;
 };
 try {
  const {user}=await identity(request);
  userId=user.id;
  if(!providerReady()) throw new VoiceError('Dịch vụ clone giọng chưa được kết nối.',503);
  if(Number(request.headers.get('content-length'))>4*1024*1024) throw new VoiceError('Mẫu giọng tối đa 3 MB.',413);
  const form=await (await boundedBody(request,4*1024*1024)).formData();
  const clip=form.get('clip'),name=String(form.get('name')||'').trim(),language=String(form.get('language')||'vi'),key=form.get('requestKey');
  if(!(clip instanceof File)||!clip.size||clip.size>3*1024*1024||!isUUID(key)||!name||name.length>80||form.get('consent')!=='true'||!VOICE_LANGUAGES.some(l=>l.id===language)) throw new VoiceError('Kiểm tra tên giọng, file mẫu (tối đa 3 MB) và xác nhận quyền sử dụng.');
  if(!/\.(mp3|wav|flac|ogg|webm)$/i.test(clip.name)) throw new VoiceError('Chọn file MP3, WAV, FLAC, OGG hoặc WebM.');
  const accent=await resolveCloneAccent(language,form.get('accent'));
  db=writer();
  let reservation=await db.rpc('windi_voice_clone_reserve',{p_user:user.id,p_key:key,p_name:name,p_language:language,p_accent:accent});
  // Keep cloning available while a rolling deployment is still catching up
  // with the optional accent column/function argument. The accent is omitted
  // only for that legacy schema; it is stored normally once migrated.
  if(reservation.error&&missingAccentSchema(reservation.error)) {
    reservation=await db.rpc('windi_voice_clone_reserve',{p_user:user.id,p_key:key,p_name:name,p_language:language});
  }
  const {data:clone,error}=reservation;
  if(error) throw error;
  if(clone.status==='ready') return Response.json({id:clone.id,voice_id:clone.provider_id});
  const claim=await db.from('windi_voice_clones').update({status:'pending'}).eq('id',clone.id).eq('status','reserved').select('id').maybeSingle();
  if(claim.error) throw claim.error;
  if(!claim.data) throw new VoiceError('Mẫu này đã được tiếp nhận. Kiểm tra danh sách giọng clone.',409);
  cloneId=clone.id;
  reservationActive=true;
  const upload=new FormData();
  upload.set('clip',clip);upload.set('name',`WV ${clone.id}`);upload.set('description',name);upload.set('language',language);upload.set('access','private');if(accent) upload.set('accent',accent);
  let response:Response;
  try {response=await cartesia('/voices/clone',{method:'POST',body:upload},{userId:user.id,purpose:'clone'});}
  catch {await releaseReservation();throw new VoiceError('Không kết nối được với dịch vụ clone. Lượt clone đã được hoàn lại; vui lòng thử lại.',503);}
  if(!response.ok) {
    const providerError=await providerFailure(response);
    console.error('Cartesia clone rejected',{status:response.status,errorCode:providerError.errorCode||'unknown',requestId:providerError.requestId||'unknown'});
    const message=providerMessage(response.status,providerError.errorCode);
    await releaseReservation();
    throw new VoiceError(`${message} Lượt clone đã được hoàn lại.`,502);
  }
  const voice=await response.json().catch(()=>null);
  if(!voice||!isUUID(voice.id)) {await releaseReservation();throw new VoiceError('Dịch vụ clone trả về kết quả không hợp lệ. Lượt clone đã được hoàn lại; vui lòng thử lại.',502);}
  providerVoiceId=voice.id;
  const finish=await db.rpc('windi_voice_clone_finish',{p_clone:clone.id,p_provider:providerVoiceId});
  if(finish.error) throw finish.error;
  reservationActive=false;
  return Response.json({id:clone.id,voice_id:providerVoiceId});
 }catch(error){
  if(reservationActive) {
    if(providerVoiceId&&userId) await cartesia(`/voices/${encodeURIComponent(providerVoiceId)}`,{method:'DELETE'},{userId,purpose:'clone'}).catch(()=>undefined);
    try {await releaseReservation();}
    catch {return failure(new VoiceError('Chưa thể hoàn tất yêu cầu clone. Lượt clone đang được đối soát; vui lòng liên hệ hỗ trợ.',503));}
  }
  return failure(error);
 }
}
export async function DELETE(request:Request) {
 try {
  const {user}=await identity(request); const id=new URL(request.url).searchParams.get('id');
  if(!isUUID(id)) throw new VoiceError('Giọng không hợp lệ.');
  const db=writer();
  const {data:clone,error}=await db.from('windi_voice_clones').select('provider_id,status').eq('id',id).eq('user_id',user.id).maybeSingle();
  if(error) throw error;
  if(!clone || clone.status!=='ready') throw new VoiceError('Không tìm thấy giọng có thể xóa.',404);
  const response=await cartesia(`/voices/${encodeURIComponent(clone.provider_id)}`,{method:'DELETE'},{userId:user.id,purpose:'clone'});
  if(!response.ok && response.status!==404) throw new VoiceError('Chưa xóa được giọng. Vui lòng thử lại.',502);
  const removed=await db.rpc('windi_voice_clone_remove',{p_user:user.id,p_clone:id});
  if(removed.error) throw removed.error;
  return Response.json({success:true});
 }catch(error){return failure(error);}
}
