import { failure, identity, paymentConfig, providerReady } from '@/lib/voice/server';
export async function GET() {
 try {
  const {client,user}=await identity();
  const [period,clones,jobs,orders]=await Promise.all([
    client.from('windi_voice_periods').select('*').eq('user_id',user.id).lte('starts_at',new Date().toISOString()).gt('ends_at',new Date().toISOString()).order('ends_at',{ascending:false}).limit(1).maybeSingle(),
    client.from('windi_voice_clones').select('id,provider_id,name,language,status,created_at').eq('user_id',user.id).neq('status','deleted').order('created_at',{ascending:false}),
    client.from('windi_voice_jobs').select('id,voice_name,transcript,credits,status,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50),
    client.from('windi_voice_orders').select('id,plan_id,amount_vnd,payment_code,status,expires_at').eq('user_id',user.id).neq('plan_id','welcome').order('created_at',{ascending:false}).limit(10),
  ]);
  for(const r of [period,clones,jobs,orders]) if(r.error) throw r.error;
  return Response.json({period:period.data,clones:clones.data,jobs:jobs.data,orders:orders.data,available:providerReady(),paymentsAvailable:!!paymentConfig()},{headers:{'Cache-Control':'no-store'}});
 } catch(error) {return failure(error);}
}
