import type { Metadata } from 'next';
import { Gemini2FaGuide } from '@/windi/gemini-2fa-guide';

export const metadata: Metadata = {
  title: 'Hướng Dẫn Lấy 2FA & Mã Dự Phòng Google — Gói Gemini Dài Hạn',
  description: 'Hướng dẫn chi tiết từng bước bật 2FA, lấy mã khoá thiết lập (Secret Key) và 10 mã dự phòng (Backup Codes) Google để nâng cấp tài khoản Gemini Pro chính chủ.',
  alternates: { canonical: '/cua-hang/gemini-dai-han/huong-dan-2fa' },
  openGraph: {
    title: 'Hướng Dẫn Lấy 2FA & Mã Dự Phòng Google — WindiStudio',
    description: 'Cách lấy chuỗi khoá 2FA và 10 mã backup codes để nâng cấp tài khoản Gemini Pro chính chủ nhanh nhất.',
    images: ['/gemini-guide/step3-lay-khoa-thiet-lap.png'],
  },
};

export default function Gemini2FaGuidePage() {
  return <Gemini2FaGuide />;
}
