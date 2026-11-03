import type { Metadata } from 'next';
import { GeminiAdmin } from '@/windi/gemini-admin';
export const metadata: Metadata = { title: 'Quản lý sản phẩm & kho', robots: { index: false, follow: false } };
export default function GeminiAdminPage() { return <GeminiAdmin />; }
