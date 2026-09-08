import {boundedBody,audioUrl,bucket,cartesia,failure,identity,providerReady,resolveVoice,VoiceError,writer} from '@/lib/voice/server';
import {validateSpeech} from '@/lib/voice/shared';
export const runtime='nodejs';
export const maxDuration=120;
export async function POST(request:Request) {
 try {
  const {user}=await identity(request);
  if(!providerReady()) throw new VoiceError('Dịch vụ tạo giọng chưa được kết nối.',503);
  if(Number(request.headers.get('content-length'))>100000) throw new VoiceError('Nội dung quá dài.',413);
  const input=validateSpeech(await (await boundedBody(request)).json());
  const voice=await resolveVoice(user.id,input.voiceId);
  const db=writer();
  const {data:job,error}=await db.rpc('windi_voice_reserve',{p_user:user.id,p_key:input.requestKey,p_voice:voice.id,p_name:voice.name,p_text:input.text,p_language:input.language,p_speed:input.speed});
  if(error) throw error;
  if(job.status==='ready') return Response.json({id:job.id,url:await audioUrl(user.id,job.id)});
  // Atomic claim means duplicate/retried requests cannot call the provider twice.
  const claim=await db.from('windi_voice_jobs').update({status:'pending'}).eq('id',job.id).eq('status','reserved').select('id').maybeSingle();
  if(claim.error) throw claim.error;
  if(!claim.data) throw new VoiceError('Yêu cầu này đã được tiếp nhận. Kiểm tra Lịch sử trước khi tạo lại.',409);
  let response:Response;
  try {
    response=await cartesia('/tts/bytes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model_id:'sonic-3.6',transcript:input.text,voice:voice.id,language:input.language,output_format:{container:'mp3',sample_rate:44100,bit_rate:128000},generation_config:{speed:input.speed}})});
  } catch {
    // Timeout is ambiguous: preserve the reservation for manual reconciliation.
    throw new VoiceError('Kết nối bị gián đoạn. Yêu cầu đang chờ đối soát; credit được tạm giữ. Xem Lịch sử hoặc liên hệ hỗ trợ.',503);
  }
  if(!response.ok) {
    const refund=await db.rpc('windi_voice_finish',{p_job:job.id,p_success:false});
    if(refund.error) throw refund.error;
    throw new VoiceError('Nhà cung cấp chưa tạo được âm thanh. Credit đã được hoàn lại.',502);
  }
  const bytes=await response.arrayBuffer();
  if(!bytes.byteLength || bytes.byteLength>52428800) throw new VoiceError('File âm thanh cần được kiểm tra. Yêu cầu đang chờ đối soát.',503);
  const path=`${user.id}/${job.id}.mp3`;
  const upload=await db.storage.from(bucket).upload(path,bytes,{contentType:'audio/mpeg',upsert:false});
  if(upload.error) throw new VoiceError('Âm thanh đã tạo nhưng chưa lưu được. Credit tạm giữ để đối soát; vui lòng liên hệ hỗ trợ.',503);
  const finish=await db.rpc('windi_voice_finish',{p_job:job.id,p_success:true,p_path:path});
  if(finish.error) throw finish.error;
  return Response.json({id:job.id,url:await audioUrl(user.id,job.id)});
 } catch(error) {return failure(error);}
}
