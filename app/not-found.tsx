import Link from 'next/link';
import { Search } from 'lucide-react';
import { RetroWindow } from '@/windi/ui/retro';
export default function NotFound() { return <div className="page narrow-page"><RetroWindow title="SYSTEM ERROR · 404" accent="pink" className="not-found"><span>4 ○ 4</span><h1>RESOURCE NOT FOUND</h1><p>Có vẻ resource này đã thoát khỏi toolbox.</p><div><Link href="/discover" className="retro-button primary"><Search size={16} /> Search Windi</Link><Link href="/" className="retro-button secondary">Go home</Link></div></RetroWindow></div>; }
