import type { Metadata } from 'next';
import { GeminiShop } from '@/windi/gemini-shop';
export const metadata: Metadata = {
  title: 'Gemini 3 & 18 tháng — Từ 49.000₫',
  description: 'Mua link ưu đãi Gemini 3 tháng 150.000₫ hoặc 18 tháng 49.000₫ tại WindiStudio. Thanh toán QR, tự động nhận file TXT chứa link kích hoạt trên tài khoản Google cá nhân. Xem điều kiện và hướng dẫn trước khi mua.',
  alternates: { canonical: '/gemini' },
};
export default function GeminiPage() { return <GeminiShop />; }
