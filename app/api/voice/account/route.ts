import { ensureOrderValid, failure, identity, paymentConfig, providerReady } from '@/lib/voice/server';

function missingAccentSchema(error: unknown) {
 const detail=error as {code?:string;message?:string}|null;
 const message=String(detail?.message||'').toLowerCase();
 return detail?.code==='42703'||(detail?.code==='PGRST202'&&message.includes('p_accent'));
}

export async function GET() {
 try {
  const {client,user}=await identity();
  // Older production databases may not have received the optional accent
  // migration yet. Do not let that cosmetic field prevent Voice Studio itself
  // from loading; the normal query resumes as soon as the migration is live.
  const cloneResult=await client.from('windi_voice_clones').select('id,provider_id,name,language,accent,status,created_at').eq('user_id',user.id).neq('status','deleted').order('created_at',{ascending:false});
  let cloneError=cloneResult.error;
  let cloneData=cloneResult.data;
  if(cloneError&&missingAccentSchema(cloneError)) {
    const legacy=await client.from('windi_voice_clones').select('id,provider_id,name,language,status,created_at').eq('user_id',user.id).neq('status','deleted').order('created_at',{ascending:false});
    cloneError=legacy.error;
    cloneData=legacy.data?.map(clone=>({...clone,accent:null}));
  }
  const [period,jobs,orders,paidClonePlan]=await Promise.all([
    client.from('windi_voice_periods').select('*').eq('user_id',user.id).lte('starts_at',new Date().toISOString()).gt('ends_at',new Date().toISOString()).order('ends_at',{ascending:false}).limit(1).maybeSingle(),
    client.from('windi_voice_jobs').select('id,voice_name,transcript,credits,status,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50),
    client.from('windi_voice_orders').select('id,plan_id,amount_vnd,payment_code,status,expires_at,created_at').eq('user_id',user.id).neq('plan_id','welcome').order('created_at',{ascending:false}).limit(10),
    client.from('windi_voice_orders').select('id').eq('user_id',user.id).eq('status','paid').in('plan_id',['trial','starter','creator','studio']).limit(1),
  ]);
  if(cloneError) throw cloneError;
  for(const r of [period,jobs,orders,paidClonePlan]) if(r.error) throw r.error;
  if(orders.data) {
    for(const order of orders.data) {
      await ensureOrderValid(order);
    }
  }
  return Response.json({period:period.data,clones:cloneData,jobs:jobs.data,orders:orders.data,trialEligible:!paidClonePlan.data?.length,available:providerReady(),paymentsAvailable:!!paymentConfig()},{headers:{'Cache-Control':'no-store'}});
 } catch(error) {return failure(error);}
}
