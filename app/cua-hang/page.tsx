import type { Metadata } from 'next';
import { GeminiShop } from '@/windi/gemini-shop';
export const metadata: Metadata = {
  title: 'Cửa hàng công cụ số — WindiStudio',
  description: 'Khám phá Google Gemini, ChatGPT, Claude và YouTube tại WindiStudio. Xem thông tin và tình trạng sản phẩm.',
  alternates: { canonical: '/cua-hang' },
};
export default function GeminiPage() { return <GeminiShop />; }
