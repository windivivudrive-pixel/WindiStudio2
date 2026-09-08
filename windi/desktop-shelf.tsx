'use client';

import Link from 'next/link';
import { ArrowRight, Bookmark, Folder, Layers, Plug, Sparkles, TrendingUp, Workflow, Code2 } from 'lucide-react';
import type { WindiResource } from '@/lib/windi-data';
import { useToolbox } from '@/windi/toolbox-context';

const folders = [
  { href: '/skills', type: 'SKILL', label: 'Kỹ năng AI', detail: 'Giúp AI làm tốt hơn', icon: Sparkles },
  { href: '/mcp', type: 'MCP', label: 'Kết nối ứng dụng', detail: 'Kết nối AI với dữ liệu', icon: Plug },
  { href: '/open-source', type: 'OPEN_SOURCE', label: 'Mã nguồn mở', detail: 'Tự do khám phá & tùy chỉnh', icon: Code2 },
  { href: '/workflows', type: 'WORKFLOW', label: 'Quy trình', detail: 'Làm việc theo từng bước', icon: Workflow },
  { href: '/stacks', type: 'STACK', label: 'Bộ công cụ', detail: 'Kết hợp để làm trọn việc', icon: Layers },
];

export function DesktopShelf({ resources = [] }: { resources?: WindiResource[] }) {
  const { count } = useToolbox();
  const radar = resources.filter(r => r.badges?.includes('RISING') || r.badges?.includes('HOT') || r.creatorBrief?.trending);
  const featured = resources.filter(r => r.badges?.includes('EDITOR'));
  const featuredSlugs = new Set(featured.slice(0, 2).map(r => r.slug));
  const distinctRadar = radar.filter(r => !featuredSlugs.has(r.slug));
  const radarPreview = distinctRadar.length ? distinctRadar : radar;
  const stacks = resources.filter(r => r.type === 'STACK');
  return <div className="desktop-shelf-wrapper">
    <nav className="desktop-quick-folders" aria-label="Khám phá theo loại công cụ">
      <div className="folders-label"><Folder size={16} aria-hidden="true" /><span>THƯ VIỆN CỦA WINDI</span></div>
      <div className="folders-grid">{folders.map(({ icon: Icon, ...folder }) => <Link key={folder.href} href={folder.href} className="desktop-folder-item">
        <span className="folder-icon"><Icon size={23} aria-hidden="true" /></span>
        <div className="folder-meta"><span className="folder-name">{folder.label}</span><span className="folder-detail">{folder.detail}</span><span className="folder-count">{resources.filter(r => r.type === folder.type).length} công cụ</span></div>
        <ArrowRight className="folder-arrow" size={15} aria-hidden="true" />
      </Link>)}</div>
    </nav>
    <div className="guest-welcome-card">
      <Bookmark size={22} aria-hidden="true" />
      <div className="guest-copy"><strong>Gặp công cụ hay? Lưu lại.</strong><span>{count > 0 ? `Bạn đã lưu ${count} công cụ. Mở bộ sưu tập để dùng tiếp.` : 'Tạo bộ sưu tập riêng để dễ tìm khi cần.'}</span></div>
      <Link href="/toolbox" className="retro-button secondary">Công cụ đã lưu <ArrowRight size={15} /></Link>
    </div>
    {resources.length > 0 && <div className="spotlight-dual-grid">
      {[
        { title: radar.length ? 'ĐANG ĐƯỢC QUAN TÂM' : 'MỚI TRONG THƯ VIỆN', tone: 'pink', icon: TrendingUp, tools: (radarPreview.length ? radarPreview : resources).slice(0, 2) },
        { title: featured.length ? 'WINDI ĐỀ XUẤT' : 'KHÁM PHÁ THÊM', tone: 'yellow', icon: Sparkles, tools: (featured.length ? featured : resources.slice(2)).slice(0, 2) },
      ].filter(group => group.tools.length).map(({ title, tone, icon: Icon, tools }) => <section className="retro-window spotlight-window" key={title}>
        <div className={`window-titlebar tone-${tone}`}><span className="window-dot" aria-hidden="true" /><span className="window-dot" aria-hidden="true" /><h2>{title}</h2><Icon size={15} className="window-symbol" aria-hidden="true" /></div>
        <div className="window-content spotlight-content">{tools.map(tool => <div className="spotlight-item" key={tool.slug}>
          <span className="exe-mini">{folders.find(f => f.type === tool.type)?.label}</span><h3>{tool.name}</h3><p>{tool.tagline}</p>
          <Link className="text-link" href={tool.type === 'STACK' ? `/stack/${tool.slug}` : `/tool/${tool.slug}`}>Xem công cụ <ArrowRight size={14} /></Link>
        </div>)}</div>
      </section>)}
    </div>}
    {stacks.length > 0 && <section className="curated-stacks-shelf"><div className="section-heading"><div><span className="eyebrow">KẾT HỢP ĐỂ LÀM TỐT HƠN</span><h2>Một bộ công cụ. Trọn một việc.</h2></div><Link className="text-link" href="/stacks">Xem tất cả <ArrowRight size={15} /></Link></div><div className="stacks-grid">{stacks.slice(0, 3).map(stack => <Link className="stack-window-card home-stack-link" href={`/stack/${stack.slug}`} key={stack.slug}><Layers size={24} /><h3>{stack.name}</h3><p>{stack.tagline}</p><span className="text-link">Xem bộ công cụ <ArrowRight size={15} /></span></Link>)}</div></section>}
  </div>;
}
