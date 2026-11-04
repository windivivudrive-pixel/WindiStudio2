import 'server-only';
import { unstable_cache } from 'next/cache';
import { geminiCatalog } from './server';
import type { GeminiProduct } from './shared';

// Public product data only; personal orders, authentication and bank details are never cached.
const cachedProducts = unstable_cache(async (): Promise<GeminiProduct[]> => {
  const catalog = await geminiCatalog();
  return catalog.products.filter(product => product.published);
}, ['shop-public-products-v1'], { revalidate: 10 });

export async function publicShopProducts(): Promise<GeminiProduct[] | null> {
  try { return await cachedProducts(); } catch { return null; }
}
