import type { Metadata } from 'next';
import { GeminiShop } from '@/windi/gemini-shop';
import { publicShopProducts } from '@/lib/gemini/public-catalog';
import { publicRecentPurchases } from '@/lib/gemini/public-purchases';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Cửa hàng công cụ số — WindiStudio',
  description: 'Khám phá Google Gemini, ChatGPT, Claude và YouTube tại WindiStudio. Xem thông tin và tình trạng sản phẩm.',
  alternates: { canonical: '/cua-hang' },
};
export default async function GeminiPage() {
  const [products, purchases] = await Promise.all([publicShopProducts(), publicRecentPurchases()]);
  return <GeminiShop initialProducts={products} recentPurchases={purchases} />;
}
