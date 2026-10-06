import 'server-only';
import {cartesia,previewBucket,VoiceError,writer} from './server';
import {VOICE_CLONE_DEMO_SAMPLES,type VoiceCloneSample} from './shared';
import {cleanVoiceDemos,cloneSamplePath} from '../../supabase/functions/_shared/voice-demo-cleanup';

export async function cleanupVoiceDemos(userId:string) {
 const db=writer();
 const result=await cleanVoiceDemos({
  claim:async()=>{const {data,error}=await db.rpc('windi_voice_demo_cleanup_claim',{p_user:userId});if(error)throw error;return data||[];},
  deleteProvider:async row=>{const response=await cartesia(`/voices/${encodeURIComponent(row.provider_id!)}`,{method:'DELETE',signal:AbortSignal.timeout(15000)},{userId,purpose:'clone'});if(!response.ok&&response.status!==404)throw Error('Provider cleanup failed');},
  removeSamples:async paths=>{const {error}=await db.storage.from(previewBucket).remove(paths);if(error)throw error;},
  finish:async(row,success)=>{const {error}=await db.rpc('windi_voice_demo_cleanup_finish',{p_clone:row.id,p_token:row.cleanup_token,p_success:success});if(error)throw error;},
 });
 const outstanding=await db.from('windi_voice_clones').select('id').eq('user_id',userId).eq('is_demo',true).eq('status','deleted').is('provider_deleted_at',null).limit(1);
 if(outstanding.error)throw outstanding.error;
 if(result.failed||outstanding.data?.length)throw new VoiceError('Giọng thử trước đang được xóa để giải phóng slot. Vui lòng thử lại sau ít phút. Lượt clone mới đã được hoàn lại.',503);
}

export async function clonePreview(userId:string,cloneId:string,preset:VoiceCloneSample) {
 const db=writer();
 const {data:claim,error}=await db.rpc('windi_voice_clone_sample_claim',{p_user:userId,p_clone:cloneId,p_preset:preset});
 if(error)throw error;
 if(claim.status==='busy')throw new VoiceError('Đang tạo bản nghe thử. Vui lòng thử lại sau ít giây.',409);
 const path=cloneSamplePath(cloneId,preset);
 if(claim.status==='ready') {
  const {data,error:downloadError}=await db.storage.from(previewBucket).download(claim.path);
  if(downloadError)throw downloadError;
  await assertAvailable();
  return data.arrayBuffer();
 }
 const failLease=async()=>{await db.from('windi_voice_clone_samples').update({status:'failed',lease_until:null,lease_token:null}).eq('clone_id',cloneId).eq('preset',preset).eq('lease_token',claim.token);};
 async function assertAvailable() {
  const {data:clone,error}=await db.from('windi_voice_clones').select('status,is_demo,demo_expires_at').eq('id',cloneId).eq('user_id',userId).maybeSingle();
  if(error)throw error;
  if(!clone||clone.status!=='ready'||(clone.is_demo&&Date.parse(clone.demo_expires_at)<=Date.now()))throw new VoiceError('Giọng nghe thử đã hết hạn hoặc bị thay thế.',410);
 }
 try {
  const response=await cartesia('/tts/bytes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model_id:'sonic-3.6',transcript:VOICE_CLONE_DEMO_SAMPLES[preset],language:'vi',voice:{mode:'id',id:claim.provider},output_format:{container:'mp3',bit_rate:128000,sample_rate:44100}})},{userId,purpose:'clone'});
  if(!response.ok)throw new VoiceError('Chưa tạo được bản nghe thử. Vui lòng thử lại.',502);
  const audio=await response.arrayBuffer();
  if(!audio.byteLength||audio.byteLength>5*1024*1024)throw new VoiceError('Bản nghe thử không hợp lệ.',502);
  await assertAvailable();
  const {error:uploadError}=await db.storage.from(previewBucket).upload(path,new Uint8Array(audio),{contentType:'audio/mpeg',upsert:true});
  if(uploadError)throw uploadError;
  try {await assertAvailable();}catch(error){await db.storage.from(previewBucket).remove([path]);throw error;}
  const finished=await db.from('windi_voice_clone_samples').update({status:'ready',storage_path:path,lease_token:null,lease_until:null}).eq('clone_id',cloneId).eq('preset',preset).eq('lease_token',claim.token).select('clone_id').maybeSingle();
  if(finished.error)throw finished.error;
  if(!finished.data){await db.storage.from(previewBucket).remove([path]);throw new VoiceError('Bản nghe thử đã hết hạn. Vui lòng làm mới.',410);}
  return audio;
 }catch(error){await failLease();throw error;}
}
