import {boundedBody,cartesia,failure,identity,VoiceError,writer} from '@/lib/voice/server';
import {isUUID,VOICE_CLONE_CLIP_LIMITS} from '@/lib/voice/shared';
import {cleanupVoiceDemos} from '@/lib/voice/clone-demo';
import {heygenReady,cloneHeyGenVoice,deleteHeyGenVoice} from '@/lib/voice/heygen';
export const runtime='nodejs';
export const maxDuration=120;

function missingAccentSchema(error: unknown) {
 const detail=error as {code?:string;message?:string}|null;
 const message=String(detail?.message||'').toLowerCase();
 return detail?.code==='42703'||(detail?.code==='PGRST202'&&message.includes('p_accent'));
}

export async function POST(request:Request) {
 let cloneId:string|undefined;
 let reservationActive=false;
 let processingClone=false;
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
  if(!heygenReady()) throw new VoiceError('Hệ thống quá tải, vui lòng thử lại sau.',503);
  if(Number(request.headers.get('content-length'))>4*1024*1024) throw new VoiceError('Mẫu giọng tối đa 3 MB.',413);
  const form=await (await boundedBody(request,4*1024*1024)).formData();
  const clip=form.get('clip'),name=String(form.get('name')||'').trim(),language=String(form.get('language')||'vi'),key=form.get('requestKey'),durationMs=Number(form.get('durationMs'));
  if(language!=='vi') throw new VoiceError('Tính năng clone hiện chỉ hỗ trợ mẫu tiếng Việt.');
  if(!(clip instanceof File)||!clip.size||clip.size>VOICE_CLONE_CLIP_LIMITS.maxBytes||!isUUID(key)||!name||name.length>80||form.get('consent')!=='true') throw new VoiceError('Kiểm tra tên giọng, file mẫu (tối đa 3 MB) và xác nhận quyền sử dụng.');
  if(!Number.isFinite(durationMs)||durationMs<=0||durationMs>VOICE_CLONE_CLIP_LIMITS.maxDurationMs) throw new VoiceError('Mẫu ghi âm tối đa 60 giây. Hãy cắt ngắn file rồi tải lại.');
  if(!/\.(mp3|wav|flac|ogg|webm)$/i.test(clip.name)) throw new VoiceError('Chọn file MP3, WAV, FLAC, OGG hoặc WebM.');
  const accent=null;
  processingClone=true;
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
  if(clone.status==='ready') {
   if(clone.is_demo&&Date.parse(clone.demo_expires_at)<=Date.now()) throw new VoiceError('Giọng nghe thử đã hết hạn.',410);
   return Response.json({id:clone.id,voice_id:clone.is_demo?null:clone.provider_id,is_demo:!!clone.is_demo,demo_expires_at:clone.demo_expires_at});
  }
  const claim=await db.from('windi_voice_clones').update({status:'pending'}).eq('id',clone.id).eq('status','reserved').select('id').maybeSingle();
  if(claim.error) throw claim.error;
  if(!claim.data) throw new VoiceError('Mẫu này đã được tiếp nhận. Kiểm tra danh sách giọng clone.',409);
  cloneId=clone.id;
  reservationActive=true;
  if(clone.is_demo) await cleanupVoiceDemos(user.id);
  providerVoiceId = await cloneHeyGenVoice(clip, name, clip.name || 'sample.mp3');

  const finish=await db.rpc('windi_voice_clone_finish',{p_clone:clone.id,p_provider:providerVoiceId});
  if(finish.error) throw finish.error;
  if(clone.is_demo) {
   const {data:finished,error}=await db.from('windi_voice_clones').select('status,demo_expires_at').eq('id',clone.id).maybeSingle();
   if(error)throw error;
   if(finished?.status!=='ready') {
    reservationActive=false;
    await cleanupVoiceDemos(user.id);
    throw new VoiceError('Giọng nghe thử đã hết hạn. Vui lòng làm mới.',410);
   }
  }
  reservationActive=false;
  return Response.json({id:clone.id,voice_id:clone.is_demo?null:providerVoiceId,is_demo:!!clone.is_demo,demo_expires_at:clone.demo_expires_at});
 }catch(error){
  if(reservationActive) {
    if(providerVoiceId) {
      if (/^[0-9a-f]{32}$/i.test(providerVoiceId)) {
        await deleteHeyGenVoice(providerVoiceId).catch(()=>undefined);
      } else if (userId) {
        await cartesia(`/voices/${encodeURIComponent(providerVoiceId)}`,{method:'DELETE'},{userId,purpose:'clone'}).catch(()=>undefined);
      }
    }
    try {await releaseReservation();}
    catch {console.error('Voice clone reservation release failed'); return failure(new VoiceError('Hệ thống quá tải, vui lòng thử lại sau.',503));}
  }
  if(processingClone) {
    console.error('Voice clone failed', error);
    return failure(new VoiceError('Hệ thống quá tải, vui lòng thử lại sau.',503));
  }
  return failure(error);
 }
}
export async function DELETE(request:Request) {
 try {
  const {user}=await identity(request); const id=new URL(request.url).searchParams.get('id');
  if(!isUUID(id)) throw new VoiceError('Giọng không hợp lệ.');
  const db=writer();
  const {data:clone,error}=await db.from('windi_voice_clones').select('provider_id,status,is_demo').eq('id',id).eq('user_id',user.id).maybeSingle();
  if(error) throw error;
  if(!clone || clone.status!=='ready') throw new VoiceError('Không tìm thấy giọng có thể xóa.',404);
  if(clone.is_demo) {
   const removed=await db.rpc('windi_voice_clone_remove',{p_user:user.id,p_clone:id});
   if(removed.error)throw removed.error;
   await cleanupVoiceDemos(user.id);
   return Response.json({success:true});
  }
  if (clone.provider_id && /^[0-9a-f]{32}$/i.test(clone.provider_id)) {
    await deleteHeyGenVoice(clone.provider_id);
  } else if (clone.provider_id) {
    const response=await cartesia(`/voices/${encodeURIComponent(clone.provider_id)}`,{method:'DELETE'},{userId:user.id,purpose:'clone'});
    if(!response.ok && response.status!==404) throw new VoiceError('Chưa xóa được giọng. Vui lòng thử lại.',502);
  }
  const removed=await db.rpc('windi_voice_clone_remove',{p_user:user.id,p_clone:id});
  if(removed.error) throw removed.error;
  return Response.json({success:true});
 }catch(error){return failure(error);}
}
