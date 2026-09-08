import type { Metadata } from 'next';
import './globals.css';
import '@/windi/calling-code-font.css';
import '@/windi/video-kits.css';
import '@/windi/ambient-motion.css';
import '@/windi/pixel-landscape.css';
import '@/windi/news.css';
import '@/windi/creator-catalog.css';
import '@/windi/home.css';
import { AppShell } from '@/windi/app-shell';
import { Providers } from '@/windi/providers';

export const metadata: Metadata = { metadataBase: new URL('https://windistudio.app'), title: { default: 'WindiStudio — Curated AI toolbox', template: '%s · WindiStudio' }, description: 'Skills, MCPs, workflows và AI tools thực sự đáng dùng — được Windi biên tập.', openGraph: { type: 'website', siteName: 'WindiStudio' } };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="vi" suppressHydrationWarning><body><Providers><AppShell>{children}</AppShell></Providers></body></html>; }
