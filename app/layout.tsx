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
  title: { default: 'WindiStudio — Video Kits & Voice Studio', template: '%s · WindiStudio' },
  description: 'Bạn duyệt. Windi làm video. Video Kits, giọng đọc tiếng Việt và công cụ hỗ trợ sáng tạo.',
  openGraph: { type: 'website', siteName: 'WindiStudio' },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="vi" suppressHydrationWarning><body><Providers><AppShell>{children}</AppShell></Providers></body></html>; }
