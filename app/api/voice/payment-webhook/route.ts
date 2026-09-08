import {timingSafeEqual} from 'node:crypto';
import {boundedBody,failure,paymentConfig,VoiceError,writer} from '@/lib/voice/server';
export const runtime='nodejs';
export async function POST(request:Request) {
 try {
  const expected=process.env.SEPAY_API_KEY;
  if(!expected||!paymentConfig()) throw new VoiceError('Payment unavailable',503);
  const supplied=request.headers.get('authorization')||'';
  const a=Buffer.from(supplied),b=Buffer.from(`Apikey ${expected}`);
  if(a.length!==b.length||!timingSafeEqual(a,b)) throw new VoiceError('Unauthorized',401);
  const body=await (await boundedBody(request)).json();
  if(body.transferType!=='in'||String(body.accountNumber)!==paymentConfig()!.account) return Response.json({success:true,status:'ignored'});
  if(!Number.isSafeInteger(body.transferAmount)||body.transferAmount<=0||!body.id) throw new VoiceError('Invalid payment',400);
  const codes=String(body.content||'').toUpperCase().match(/\bWV[A-F0-9]{16}\b/g);
  if(!codes||codes.length!==1) return Response.json({success:true,status:'ignored'});
  const {data,error}=await writer().rpc('windi_voice_pay',{p_code:codes[0],p_gateway:String(body.id),p_amount:body.transferAmount});
  if(error) throw error;
  return Response.json({success:true,status:data});
 }catch(error){return failure(error);}
}
