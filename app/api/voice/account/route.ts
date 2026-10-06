import { isVoiceAdmin } from '@/lib/voice/admin';
import { ensureOrderValid, failure, identity, paymentConfig, providerReady, writer } from '@/lib/voice/server';
import { voiceHistoryCutoff } from '@/lib/voice/retention';

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
  const cloneResult=await client.from('windi_voice_clones').select('id,provider_id,name,language,accent,status,created_at,is_demo,demo_expires_at').eq('user_id',user.id).neq('status','deleted').order('created_at',{ascending:false});
  let cloneError=cloneResult.error;
  let cloneData=cloneResult.data;
  if(cloneError&&missingAccentSchema(cloneError)) {
    const legacy=await client.from('windi_voice_clones').select('id,provider_id,name,language,status,created_at,is_demo,demo_expires_at').eq('user_id',user.id).neq('status','deleted').order('created_at',{ascending:false});
    cloneError=legacy.error;
    cloneData=legacy.data?.map(clone=>({...clone,accent:null}));
  }
  const now=new Date().toISOString();
  const [period,nextPeriod,bonus,jobs,orders,paidClonePlan]=await Promise.all([
    client.from('windi_voice_periods').select('*').eq('user_id',user.id).lte('starts_at',now).gt('ends_at',now).order('ends_at',{ascending:false}).limit(1).maybeSingle(),
    client.from('windi_voice_periods').select('plan_id,starts_at,ends_at').eq('user_id',user.id).gt('starts_at',now).order('starts_at',{ascending:true}).limit(1).maybeSingle(),
    client.from('product_entitlements').select('voice_credits,voice_credits_used').eq('user_id',user.id).eq('kind','video_workflow_v1').eq('status','active').limit(1).maybeSingle(),
    client.from('windi_voice_jobs').select('id,voice_name,transcript,credits,status,created_at').eq('user_id',user.id).gte('created_at',voiceHistoryCutoff()).order('created_at',{ascending:false}),
    client.from('windi_voice_orders').select('id,plan_id,amount_vnd,payment_code,status,expires_at,created_at').eq('user_id',user.id).neq('plan_id','welcome').order('created_at',{ascending:false}).limit(10),
    client.from('windi_voice_orders').select('id').eq('user_id',user.id).eq('status','paid').in('plan_id',['trial','starter','creator','studio']).limit(1),
  ]);
  if(cloneError) throw cloneError;
  for(const r of [period,nextPeriod,bonus,jobs,orders,paidClonePlan]) if(r.error) throw r.error;
  if(orders.data) {
    for(const order of orders.data) {
      await ensureOrderValid(order);
    }
  }
  const demoUsage=await writer().from('windi_voice_clone_demo_usage').select('attempts').eq('user_id',user.id).maybeSingle();
  if(demoUsage.error)throw demoUsage.error;
  const used=demoUsage.data?.attempts||0;
  const trialEligible=!paidClonePlan.data?.length;
  const demoEligible=trialEligible&&(!period.data||period.data.plan_id==='welcome');
  const clones=cloneData?.filter(clone=>!clone.is_demo||Date.parse(clone.demo_expires_at)>Date.now()).map(clone=>({...clone,provider_id:clone.is_demo?null:clone.provider_id}));
  return Response.json({isAdmin:await isVoiceAdmin(user.id),period:period.data,nextPeriod:nextPeriod.data,bonus:bonus.data,clones,jobs:jobs.data,orders:orders.data,trialEligible,cloneDemo:{used,remaining:demoEligible?Math.max(0,2-used):0,eligible:demoEligible},available:providerReady(),paymentsAvailable:!!paymentConfig()},{headers:{'Cache-Control':'no-store'}});
 } catch(error) {return failure(error);}
}
