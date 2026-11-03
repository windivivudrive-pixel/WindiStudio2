import { writer } from '@/lib/voice/server';
import { geminiCatalog, geminiIdentity, geminiFailure, geminiOrderColumns, privateHeaders } from '@/lib/gemini/server';
export const runtime = 'nodejs';
export async function GET() {
  try {
    const [catalog, user] = await Promise.all([geminiCatalog(), geminiIdentity(undefined, true)]);
    let orders = [];
    if (user) {
      const result = await writer().from('windi_gemini_orders').select(geminiOrderColumns).eq('user_id', user.id).order('created_at', { ascending: false }).limit(30);
      if (result.error) throw result.error;
      const paidIds = (result.data || []).filter(order => order.status === 'PAID').map(order => order.id);
      const paid = paidIds.length ? await writer().from('windi_gemini_orders').select('id,activation_id,product_sku').eq('user_id', user.id).eq('status', 'PAID').in('id', paidIds) : { data: [], error: null };
      if (paid.error) throw paid.error;
      const ids = (paid.data || []).map(order => order.activation_id).filter((id): id is string => !!id);
      const links = ids.length ? await writer().from('windi_gemini_links').select('id,product_sku,activation_url').in('id', ids) : { data: [], error: null };
      if (links.error) throw links.error;
      const byId = new Map((links.data || []).map(link => [link.id, link]));
      const urls = new Map((paid.data || []).map(order => { const link = byId.get(order.activation_id); return [order.id, link && link.product_sku === order.product_sku ? link.activation_url : null]; }));
      orders = (result.data || []).map(order => ({ ...order, activation_url: urls.get(order.id) ?? null }));
    }
    return Response.json({ ...catalog, authenticated: !!user, orders }, { headers: privateHeaders });
  } catch (error) { return geminiFailure(error); }
}
