import { failure, identity, paymentConfig, writer } from '@/lib/voice/server';
import { latestProductRelease } from '@/lib/products/releases';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { user } = await identity(request);
    const db = writer();
    const { data: product, error } = await db.from('products').select('id,price_vnd,is_active,metadata').eq('metadata->>sku', 'windi-dubbing-kit-v1').maybeSingle();
    if (error) throw error;
    if (!product) return Response.json({ product: null, entitlement: null, orders: [], release: null, bank: null }, { headers: { 'Cache-Control': 'no-store' } });
    const [entitlement, orders, releases] = await Promise.all([
      db.from('product_entitlements').select('id,status').eq('user_id', user.id).eq('product_id', product.id).eq('kind', 'local_dubbing_v1').eq('status', 'active').maybeSingle(),
      db.from('orders').select('id,total_amount_vnd,status,payment_code,expires_at,order_items!inner(product_id)').eq('user_id', user.id).eq('order_items.product_id', product.id).order('created_at', { ascending: false }).limit(10),
      db.from('product_releases').select('id,version,created_at').eq('product_id', product.id).eq('is_published', true),
    ]);
    for (const result of [entitlement, orders, releases]) if (result.error) throw result.error;
    return Response.json({ product, entitlement: entitlement.data, orders: orders.data, release: latestProductRelease(releases.data ?? []), bank: paymentConfig() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
