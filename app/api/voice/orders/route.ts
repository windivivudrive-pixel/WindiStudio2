import {boundedBody,failure,identity,paymentConfig,providerReady,VoiceError,writer} from '@/lib/voice/server';
import {isUUID,VOICE_PLANS} from '@/lib/voice/shared';
export async function POST(request:Request) {
 try {
  const {user}=await identity(request);
  if(!paymentConfig()||!providerReady()) throw new VoiceError('Gói dịch vụ chưa mở thanh toán. Vui lòng quay lại sau.',503);
  const {planId}=await (await boundedBody(request)).json();
  if(!VOICE_PLANS.some(p=>p.id===planId&&p.purchasable)) throw new VoiceError('Gói không hợp lệ.');
  const {data,error}=await writer().rpc('windi_voice_order',{p_user:user.id,p_plan:planId});
  if(error) throw error;
  return Response.json({order:data,bank:paymentConfig()});
 }catch(error){return failure(error);}
}
export async function GET(request:Request) {
 try {
  const {user,client}=await identity();const id=new URL(request.url).searchParams.get('id');
  if(!isUUID(id)) throw new VoiceError('Đơn không hợp lệ.');
  const {data,error}=await client.from('windi_voice_orders').select('id,plan_id,amount_vnd,payment_code,status,expires_at').eq('user_id',user.id).eq('id',id).maybeSingle();
  if(error) throw error;
  if(!data) throw new VoiceError('Không tìm thấy đơn.',404);
  return Response.json({order:{...data,status:data.status==='pending'&&Date.parse(data.expires_at)<=Date.now()?'expired':data.status},bank:paymentConfig()},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return failure(error);}
}
export async function DELETE(request:Request) {
 try {
  const {user}=await identity(request);const id=new URL(request.url).searchParams.get('id');
  if(!isUUID(id)) throw new VoiceError('Đơn không hợp lệ.');
  const {data,error}=await writer().from('windi_voice_orders').update({status:'expired'}).eq('id',id).eq('user_id',user.id).eq('status','pending').select('id').maybeSingle();
  if(error) throw error;
  if(!data) throw new VoiceError('Đơn đã được xử lý hoặc không còn chờ thanh toán.',409);
  return Response.json({success:true});
 }catch(error){return failure(error);}
}
