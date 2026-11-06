import 'server-only';
import { unstable_cache } from 'next/cache';
import { writer } from '@/lib/voice/server';
import { maskPurchaseEmail, purchaseProductTitle, type RecentPurchase } from './recent-purchases';

type PurchaseRow = { user_id: string; product_sku: string; product_title: string; duration_months: number };
type OrderedPurchaseQuery = { order: (column: string, options: { ascending: boolean }) => { limit: (count: number) => PromiseLike<{ data: PurchaseRow[] | null; error: unknown }> } };
type PurchaseFilterQuery = { not: (column: string, operator: string, value: string) => OrderedPurchaseQuery; neq: (column: string, value: string) => OrderedPurchaseQuery };
const managedSkus = ['gemini-managed-6m', 'gemini-managed-12m', 'gemini-managed-24m'];
const productKind = (sku: string) => managedSkus.includes(sku) ? 'gemini-managed' : sku;

// Cache only the masked, public projection; raw emails never leave this function.
const cachedPurchases = unstable_cache(async (): Promise<RecentPurchase[]> => {
  const db = writer();
  const { data, error } = await db.from('windi_gemini_orders')
    .select('user_id,product_sku,product_title,duration_months')
    .eq('status', 'PAID').not('user_id', 'is', null)
    .order('paid_at', { ascending: false }).limit(20);
  if (error) throw error;

  async function hydrate(rows: PurchaseRow[]) {
    const userIds = [...new Set(rows.map(order => order.user_id))];
    const users = await Promise.all(userIds.map(async id => {
      const { data: result, error: userError } = await db.auth.admin.getUserById(id);
      return [id, userError ? null : maskPurchaseEmail(result.user?.email)] as const;
    }));
    const emails = new Map(users);
    return rows.flatMap(order => {
      const email = emails.get(order.user_id);
      const product = purchaseProductTitle(order.product_sku, order.product_title || '', order.duration_months);
      return email && product ? [{ email, product, kind: productKind(order.product_sku) }] : [];
    });
  }

  const candidates = await hydrate(data || []);
  const selected = candidates.slice(0, 8);
  if (selected.length && selected.every(item => item.kind === selected[0].kind)) {
    let alternative = candidates.find(item => item.kind !== selected[0].kind);
    if (!alternative) {
      try {
        const baseQuery = db.from('windi_gemini_orders')
          .select('user_id,product_sku,product_title,duration_months')
          .eq('status', 'PAID').not('user_id', 'is', null);
        // Narrow the builder's type before adding a conditional filter to avoid
        // recursive Supabase generic inference on the reassigned query.
        const query = baseQuery as unknown as PurchaseFilterQuery;
        const filtered = selected[0].kind === 'gemini-managed'
          ? query.not('product_sku', 'in', `(${managedSkus.join(',')})`)
          : query.neq('product_sku', selected[0].kind);
        const result = await filtered.order('paid_at', { ascending: false }).limit(20);
        if (!result.error) alternative = (await hydrate(result.data || [])).find(item => item.kind !== selected[0].kind);
      } catch { /* Keep the original purchases if the diversity lookup fails. */ }
    }
    if (alternative) {
      if (selected.length === 8) selected.pop();
      selected.push(alternative);
    }
  }
  return selected.map(({ email, product }) => ({ email, product }));
}, ['shop-recent-purchases-v2'], { revalidate: 60 });

export async function publicRecentPurchases(): Promise<RecentPurchase[]> {
  try { return await cachedPurchases(); } catch { return []; }
}
