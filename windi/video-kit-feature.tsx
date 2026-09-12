import Link from 'next/link';
import {ArrowRight,Clapperboard,FileText,Mic,Subtitles} from 'lucide-react';
import {RetroBadge} from './ui/retro';
import {FloatingDetails} from './ambient-motion';

export function VideoKitFeature(){
  return <section className="kit-feature" aria-labelledby="kit-feature-title"><FloatingDetails kind="kit"/><div className="kit-feature-copy"><RetroBadge accent="orange">WINDI VIDEO KITS</RetroBadge><h2 id="kit-feature-title">Từ ý tưởng<br/>đến video đầu tiên.</h2><p>Kịch bản, giọng đọc và phụ đề trong một quy trình. Làm video cùng quy trình có ba điểm duyệt của Windi.</p><Link href="/video-kits" className="retro-button kit-cta">Khám phá Video Kits <ArrowRight size={17}/></Link></div><div className="kit-feature-visual" aria-hidden="true"><div className="kit-visual-bar"><Clapperboard size={16}/><span>GÓC SẢN XUẤT VIDEO</span><span>01</span></div><div className="kit-visual-title">Từ một ý tưởng<br/>đến nút <em>xuất bản.</em></div><div className="kit-mini-timeline"><span><FileText size={17}/> KỊCH BẢN</span><span><Mic size={17}/> GIỌNG ĐỌC</span><span><Subtitles size={17}/> PHỤ ĐỀ</span></div><div className="kit-visual-bottom"><span>SẴN SÀNG SÁNG TẠO</span><span>VIDEO DỌC · 9:16</span></div></div></section>;
}
