import {timingSafeEqual} from 'node:crypto';
import {boundedBody,failure,paymentConfig,VoiceError,writer} from '@/lib/voice/server';
export const runtime='nodejs';
export async function POST(request:Request) {
 try {
  const expected=process.env.SEPAY_API_KEY || process.env.VITE_SEPAY_API_KEY;
  if(!expected||!paymentConfig()) throw new VoiceError('Payment unavailable',503);
  const supplied=request.headers.get('authorization')||'';
  const a=Buffer.from(supplied),b=Buffer.from(`Apikey ${expected}`);
  if(a.length!==b.length||!timingSafeEqual(a,b)) throw new VoiceError('Unauthorized',401);
  const body=await (await boundedBody(request)).json();
  if(body.transferType!=='in'||String(body.accountNumber)!==paymentConfig()!.account) return Response.json({success:true,status:'ignored'});
  if(!Number.isSafeInteger(body.transferAmount)||body.transferAmount<=0||!body.id) throw new VoiceError('Invalid payment',400);
  const raw=String(body.content||'').toUpperCase();
  const windiMatches=[...raw.matchAll(/\bWINDI\s*([A-Z0-9]{8})\b/g)];
  const wstMatches=[...raw.matchAll(/\bWST\s*([A-Z0-9]{8})\b/g)];
  const wvMatches=[...raw.matchAll(/\bWV[A-F0-9]{16}\b/g)];
  const totalMatches=windiMatches.length+wstMatches.length+wvMatches.length;
  if(totalMatches!==1) return Response.json({success:true,status:'ignored'});
  const p_code=windiMatches.length===1
    ? `WINDI ${windiMatches[0][1]}`
    : (wstMatches.length===1 ? `WST ${wstMatches[0][1]}` : wvMatches[0][0]);
  let {data,error}=await writer().rpc('windi_voice_pay',{p_code,p_gateway:String(body.id),p_amount:body.transferAmount});
  if(data==='ignored'&&p_code.includes(' ')) {
    const altCode=p_code.replace(/\s+/g,'');
    const retry=await writer().rpc('windi_voice_pay',{p_code:altCode,p_gateway:String(body.id),p_amount:body.transferAmount});
    if(!retry.error&&retry.data&&retry.data!=='ignored') data=retry.data;
  }
  if(error) throw error;
  return Response.json({success:true,status:data});
 }catch(error){return failure(error);}
}
