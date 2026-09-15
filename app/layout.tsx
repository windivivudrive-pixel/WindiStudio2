import type { Metadata } from 'next';
import './globals.css';
import '@/windi/calling-code-font.css';
import '@/windi/video-kits.css';
import '@/windi/ambient-motion.css';
import '@/windi/pixel-landscape.css';
import '@/windi/news.css';
import '@/windi/creator-catalog.css';
import '@/windi/home.css';
import '@/windi/workflow-arcade.css';
import { AppShell } from '@/windi/app-shell';
import { Providers } from '@/windi/providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://windistudio.app'),
  title: { default: 'WindiStudio — Sử Dụng AI Hiệu Quả', template: '%s · WindiStudio' },
  description: 'Nền tảng ứng dụng AI hiệu quả vào công việc và sáng tạo: Hệ thống làm video (Video Kits), giọng đọc AI tiếng Việt (Voice Studio), cùng kho công cụ & workflow AI tuyển chọn.',
  alternates: {
    canonical: 'https://windistudio.app',
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: 'https://windistudio.app',
    siteName: 'WindiStudio',
    title: 'WindiStudio — Sử Dụng AI Hiệu Quả',
    description: 'Nền tảng ứng dụng AI hiệu quả vào công việc và sáng tạo: Hệ thống làm video (Video Kits), giọng đọc AI tiếng Việt (Voice Studio), cùng kho công cụ & workflow AI tuyển chọn.',
    images: [
      {
        url: '/og-image.png',
        width: 1024,
        height: 673,
        alt: 'WindiStudio — Sử Dụng AI Hiệu Quả',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WindiStudio — Sử Dụng AI Hiệu Quả',
    description: 'Nền tảng ứng dụng AI hiệu quả vào công việc và sáng tạo: Hệ thống làm video (Video Kits), giọng đọc AI tiếng Việt (Voice Studio), cùng kho công cụ & workflow AI tuyển chọn.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="vi" suppressHydrationWarning><body><Providers><AppShell>{children}</AppShell></Providers></body></html>; }
