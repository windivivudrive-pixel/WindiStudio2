import type { Metadata } from 'next';
import ActivationForm from '@/windi/gemini-activation';
export const metadata: Metadata = { title: 'Kích hoạt Gemini dài hạn', robots: { index: false, follow: false } };
export default function ActivationPage() { return <ActivationForm />; }
