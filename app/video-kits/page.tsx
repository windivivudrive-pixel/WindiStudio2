import type {Metadata} from 'next';
import Link from 'next/link';
import {VideoKitPreview} from '@/windi/video-kit-preview';
import {RetroBadge} from '@/windi/ui/retro';
import {AmbientMotion,FloatingDetails} from '@/windi/ambient-motion';

export const metadata:Metadata={title:'Video Kits — Bản xem trước',description:'Không gian riêng cho các bộ quy trình làm video của Windi. Xem trước các chặng từ môi trường, ý tưởng, kịch bản đến dựng và xuất video.',alternates:{canonical:'/video-kits'}};
export default function Page(){return <div className="page video-kits-page motion-page"><AmbientMotion/><FloatingDetails/><nav className="breadcrumbs" aria-label="Đường dẫn"><Link href="/">WindiStudio</Link><span>/</span><span>Video Kits</span></nav><header className="page-intro kit-intro"><RetroBadge accent="orange">KHÔNG GIAN MỚI · BẢN XEM TRƯỚC</RetroBadge><h1>Một bộ kit.<br/>Cả quy trình video.</h1><p>Không phải danh sách công cụ rời rạc. Đây là nơi dành cho các bộ hướng dẫn và dự án khởi đầu, để bạn đi từ ý tưởng đến video của riêng mình.</p></header><VideoKitPreview/><section className="kit-release-note"><div><span className="eyebrow">KIT ĐẦU TIÊN ĐANG ĐƯỢC CHUẨN BỊ</span><h2>Xem hướng đi trước.<br/>Quy trình hoàn chỉnh sẽ đến sau.</h2></div><p>Các chặng ở trên chỉ là minh họa. Hướng dẫn cài đặt, bộ công cụ, dự án mẫu và file tải xuống sẽ được bổ sung sau khi quy trình chính thức được hoàn thiện và kiểm thử.</p></section><Link className="text-link" href="/discover">← Trở lại danh mục công cụ</Link></div>;}
