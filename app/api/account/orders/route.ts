import {failure,identity,writer,VoiceError} from '@/lib/voice/server';
import {parseOrderQuery,readAccountOrders} from '@/lib/account-orders';
export const runtime='nodejs';
export async function GET(request:Request){
  try{
    const {user}=await identity();
    const params=new URL(request.url).searchParams;
    try{parseOrderQuery(params);}catch(error){throw new VoiceError((error as Error).message);}
    const result=await readAccountOrders(writer(),user.id,params);
    if(params.has('id')&&!result.data.length)throw new VoiceError('Không tìm thấy đơn hàng.',404);
    return Response.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(error){return failure(error);}
}
