import type { Metadata } from 'next';
import { GeminiShop } from '@/windi/gemini-shop';
export const metadata: Metadata = {
  title: 'Gemini 3 tháng — Link kích hoạt 150.000₫',
  description: 'Mua link ưu đãi Gemini 3 tháng tại WindiStudio. Thanh toán QR, tự động nhận file TXT chứa link kích hoạt trên tài khoản Google cá nhân. Xem điều kiện và hướng dẫn trước khi mua.',
  alternates: { canonical: '/gemini' },
};
export default function GeminiPage() { return <GeminiShop />; }
