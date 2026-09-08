'use client';
import { useState } from 'react';
import { ExternalLink, Play, ImageIcon } from 'lucide-react';
import { embedUrl, externalHttps, type CommunityEvidence, type EvidenceMedia } from '@/lib/community-evidence';
import { RetroBadge, RetroWindow } from './ui/retro';
import './community-evidence.css';

function MediaPreview({ media }: { media: EvidenceMedia }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const embed = embedUrl(media);
  const source = externalHttps(media.source_url);
  const image = media.kind === 'IMAGE' && ['PERMISSION','LICENSE'].includes(media.rights_basis) && media.rights_verified_at && externalHttps(media.media_url);
  if (!source) return null;
  return <div className="evidence-media">
    {embed && loaded ? <iframe src={embed} title={media.alt_text} loading="lazy" referrerPolicy="no-referrer" allow="fullscreen; picture-in-picture" allowFullScreen />
      : image && loaded && !failed ? <img src={image} alt={media.alt_text} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      : (embed || image) && !failed ? <button className="evidence-consent" onClick={() => setLoaded(true)}><Play size={28} /><strong>{media.alt_text}</strong><span>Nhấn để tải nội dung từ nền tảng gốc.</span></button>
      : <a className="evidence-consent" href={source} target="_blank" rel="noopener noreferrer"><ImageIcon size={26} /><strong>{media.alt_text}</strong><span>Xem ảnh/video trong bài gốc <ExternalLink size={13} /></span></a>}
    {failed && <a href={source} target="_blank" rel="noopener noreferrer">Không tải được ảnh. Xem bài gốc.</a>}
  </div>;
}

export function CommunityEvidenceSection({ evidence }: { evidence: CommunityEvidence[]; unavailable?: boolean }) {
  if (!evidence.length) return null;
  return <RetroWindow title="TRẢI NGHIỆM TỪ CỘNG ĐỒNG" accent="orange">
    <p className="small-copy">Xem cách mọi người sử dụng công cụ qua ảnh, video và chia sẻ thực tế.</p>
    <div className="evidence-grid">{evidence.map(item => <article className="evidence-card" key={item.id}>
        <div className="badge-row"><RetroBadge>{item.platform}</RetroBadge><RetroBadge>{item.author_relationship === 'USER' ? 'Người dùng' : item.author_relationship === 'MAINTAINER' ? 'Tác giả / đội ngũ tool' : item.author_relationship === 'AFFILIATE' ? 'Có liên kết thương mại' : 'Chưa rõ quan hệ với tool'}</RetroBadge></div>
        <h3>{item.title}</h3><p className="small-copy">Đăng bởi {item.author_name} · Đối chiếu nguồn {new Date(item.observed_at).toLocaleDateString('vi-VN')}</p>
        {item.resource_match === 'RELATED_PROJECT' && <p className="evidence-caveat">Minh họa dự án liên quan, không chứng minh riêng skill này. {item.match_explanation}</p>}
        {item.media.map(media => <MediaPreview key={media.id} media={media} />)}
        <p>{item.summary_vi}</p>
        {item.positive_notes && <p><strong>Điểm hữu ích: </strong>{item.positive_notes}</p>}
        {item.limitation_notes && <p><strong>Giới hạn: </strong>{item.limitation_notes}</p>}
        {externalHttps(item.source_url) && <a className="text-link" href={item.source_url} target="_blank" rel="noopener noreferrer">Đọc feedback và thảo luận gốc <ExternalLink size={14} /></a>}
      </article>)}</div>
  </RetroWindow>;
}
