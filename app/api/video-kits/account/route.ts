import { failure, identity, paymentConfig, writer } from '@/lib/voice/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { user } = await identity();
    const db = writer();
    const now = new Date().toISOString();
    const { data: product, error: productError } = await db.from('products').select('id,name,price_vnd,is_active,metadata').eq('metadata->>sku', 'windi-video-workflow-v1').maybeSingle();
    if (productError) throw productError;
    const [entitlement, orders] = product ? await Promise.all([
      db.from('product_entitlements').select('id,status,created_at,voice_credits,voice_credits_used').eq('user_id', user.id).eq('product_id', product.id).maybeSingle(),
      db.from('orders').select('id,total_amount_vnd,status,payment_code,expires_at,created_at,order_items!inner(product_id)').eq('user_id', user.id).eq('order_items.product_id', product.id).order('created_at', { ascending: false }).limit(10),
    ]) : [{ data: null, error: null }, { data: [], error: null }];
    if (entitlement.error) throw entitlement.error;
    if (orders.error) throw orders.error;
    let release = null;
    if (entitlement.data?.status === 'active') {
      const result = await db.from('product_releases').select('id,version,sha256,size_bytes,changelog,created_at').eq('product_id', product!.id).eq('is_published', true).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (result.error) throw result.error;
      release = result.data;
    }
    const voicePlan = await db.from('windi_voice_periods').select('id,plan_id,credits,used_credits,ends_at').eq('user_id', user.id).neq('plan_id', 'welcome').lte('starts_at', now).gt('ends_at', now).order('ends_at', { ascending: false }).limit(1).maybeSingle();
    if (voicePlan.error) throw voicePlan.error;
    return Response.json({
      product,
      entitlement: entitlement.data?.status === 'active' ? entitlement.data : null,
      orders: orders.data,
      release,
      devices: [],
      accessMode: 'account',
      voiceApi: {
        plan: voicePlan.data,
        bonus: entitlement.data ? {
          credits: entitlement.data.voice_credits,
          used_credits: entitlement.data.voice_credits_used,
        } : null,
      },
      bank: paymentConfig(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
