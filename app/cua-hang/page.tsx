import type { Metadata } from 'next';
import { GeminiShop } from '@/windi/gemini-shop';
import { publicShopProducts } from '@/lib/gemini/public-catalog';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Cửa hàng công cụ số — WindiStudio',
  description: 'Khám phá Google Gemini, ChatGPT, Claude và YouTube tại WindiStudio. Xem thông tin và tình trạng sản phẩm.',
  alternates: { canonical: '/cua-hang' },
};
export default async function GeminiPage() { return <GeminiShop initialProducts={await publicShopProducts()} />; }
