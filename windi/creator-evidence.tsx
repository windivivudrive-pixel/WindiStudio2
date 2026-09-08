import {type CreatorBrief,purposeLabel} from '@/lib/creator-catalog';
import {RetroWindow,RetroBadge} from './ui/retro';
import {externalHttps} from '@/lib/community-evidence';
import {GitFork,Star} from 'lucide-react';
export function CreatorEvidence({brief}:{brief:CreatorBrief}){
  return <RetroWindow title="TÁC GIẢ & NGUỒN THAM KHẢO" accent="green">
    <div className="badge-row">{brief.categories.map(c=><RetroBadge key={c}>{purposeLabel(c)}</RetroBadge>)}</div>
    <div className="evidence-metrics"><RetroBadge accent="orange"><Star size={12} /> {brief.github.stars.toLocaleString('vi-VN')} sao GitHub</RetroBadge><RetroBadge accent="blue"><GitFork size={12} /> {brief.github.forks.toLocaleString('vi-VN')} fork</RetroBadge></div><p className="small-copy">Số liệu ngày {new Date(brief.github.observedAt).toLocaleDateString('vi-VN')}.</p>
    {brief.trending&&<p><a className="text-link" href={brief.trending.url} target="_blank" rel="noopener noreferrer">{brief.trending.source} #{brief.trending.rank} · {brief.trending.period} · {new Date(brief.trending.observedAt).toLocaleDateString('vi-VN')}</a></p>}
    <p className="small-copy">Dự án cập nhật: {new Date(brief.github.pushedAt).toLocaleDateString('vi-VN')}.</p>
    <ul className="detail-list">{[[brief.github.url,'Trang GitHub của tác giả'],[brief.readme.url,'Tài liệu hướng dẫn gốc']].map(([url,label])=><li key={url}>{externalHttps(url)&&<a className="text-link" href={url} target="_blank" rel="noopener noreferrer">{label} ↗</a>}</li>)}</ul>
    {!!brief.extraSources?.length&&<ul className="detail-list">{brief.extraSources.map(url=><li key={url}><a className="text-link" href={url} target="_blank" rel="noopener noreferrer">Tài liệu chính chủ bổ sung ↗</a></li>)}</ul>}
  </RetroWindow>;
}
