import type { Metadata } from 'next';
import { GeminiShop } from '@/windi/gemini-shop';
import { publicShopProducts } from '@/lib/gemini/public-catalog';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Nâng Cấp Gemini Dài Hạn — WindiStudio',
  description: 'Gói Gemini Pro nâng chính chủ 6, 12 hoặc 24 tháng, kèm 1 tháng YouTube Premium.',
  alternates: { canonical: '/cua-hang/gemini-dai-han' },
};

export default async function GeminiLongTermPage() {
  return <GeminiShop initialProduct="google-managed" initialProducts={await publicShopProducts()} />;
}
