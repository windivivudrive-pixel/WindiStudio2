import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowRight, CircleHelp, ExternalLink, Search, TrendingUp, Star } from 'lucide-react';
import { categories, resourceTypes, type ResourceType, type WindiResource } from '@/lib/windi-data';
import { getCatalog, getCommunityEvidence, getPublishedEasyPrompt } from '@/lib/catalog-repository';
import { calculateWindiScore, scoreLabels } from '@/lib/score';
import { RetroBadge, RetroButton, RetroInput, RetroProgress, RetroWindow } from './ui/retro';
import { ResourceGrid } from './ui/resource-card';
import { SubmitForm } from './submit-form';
import { CommunityEvidenceSection } from './community-evidence';
import { WorkflowHero, HomeVoiceFeature, HomeLayouts, HomeConnectFeature } from './workflow-hero';
import { AmbientMotion } from './ambient-motion';
import {matchesPurpose,normalizeSearch,purposeLabel,validPurpose} from '@/lib/creator-catalog';
import {notFound} from 'next/navigation';
import {CreatorEvidence} from './creator-evidence';
import {CreatorGuide} from './creator-guide';
import {EasyPromptCard} from './easy-prompt';
import { HeroNewsTicker } from './hero-news-ticker';

import { InteractiveCatalog } from './interactive-catalog';
import { ResourceDetailView } from './resource-detail-view';

export function SectionHeading({ eyebrow, title, copy, action }: { eyebrow?: string; title: string; copy?: string; action?: React.ReactNode }) {
  return <div className="section-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{copy && <p>{copy}</p>}</div>{action}</div>;
}
function CatalogNotice({ available }: { available: boolean }) {
  return <EmptyState title={available ? 'Công cụ mới sẽ sớm có mặt.' : 'Chưa tải được danh mục.'} copy={available ? 'Bạn có thể quay lại sau để khám phá thêm công cụ.' : 'Bạn thử tải lại sau một lát nhé.'} actionHref="/discover" actionLabel="Tải lại danh mục" />;
}
export function HomePage() {
  return <div className="page home-page motion-page">
    <WorkflowHero />
    <AmbientMotion />
    <HomeVoiceFeature />
    <HomeLayouts />
    <HomeConnectFeature />
    <section className="home-news-secondary"><Link href="/news">Tin mới cho người làm sáng tạo <ArrowRight size={16}/></Link><Suspense fallback={null}><HeroNewsTicker /></Suspense></section>
  </div>;
}

export async function DiscoverPage({ query = '', type, purpose = '', badge = '' }: { query?: string; type?: ResourceType; purpose?: string; badge?: 'hot' | 'trending' | '' }) {
  const catalog = await getCatalog();
  const normalized = normalizeSearch(query);
  const selectedPurpose = validPurpose(purpose) ? purpose : '';
  const hotIds = new Set([...catalog.resources].filter(row => row.creatorBrief).sort((a, b) => (b.creatorBrief?.github.stars || 0) - (a.creatorBrief?.github.stars || 0)).slice(0, 20).map(row => row.id));
  const trendingIds = new Set(catalog.resources.filter(row => row.creatorBrief?.trending).map(row => row.id));
  const results = catalog.resources.filter(row => (!type || row.type === type) && matchesPurpose(row, selectedPurpose) && (!badge || (badge === 'hot' ? hotIds.has(row.id) : trendingIds.has(row.id))) && normalizeSearch([row.name, row.tagline, row.description, ...row.tags].join(' ')).includes(normalized));
  const route = resourceTypes.find(item => item.type === type)?.href || '/discover';
  const queryString = (nextBadge = '') => `q=${encodeURIComponent(query)}&purpose=${selectedPurpose}${nextBadge ? `&badge=${nextBadge}` : ''}`;

  return (
    <div className="page">
      <header className="page-intro">
        <span className="eyebrow">KHÁM PHÁ KHO CÔNG CỤ</span>
        <h1>{type ? `${type.replace('_', ' ')}.EXE cho công việc của bạn` : 'Bàn làm việc AI của bạn cần gì?'}</h1>
        <p>Chọn mục đích, mở ứng dụng để kiểm tra tiêu chuẩn và thêm vào My Toolbox để ghép Stack.</p>
      </header>

      <RetroWindow title="TÌM ỨNG DỤNG // DISCOVER SEARCH" accent="blue" className="discover-search">
        <form action={route}>
          <Search size={20} />
          <input type="hidden" name="purpose" value={selectedPurpose} />
          <input type="hidden" name="badge" value={badge} />
          <RetroInput name="q" defaultValue={query} aria-label="Tìm công cụ" placeholder="Tìm theo tên tool, mục đích, kỹ năng..." />
          <RetroButton type="submit">Tìm</RetroButton>
        </form>
        <nav className="filter-row" aria-label="Lọc theo mục đích">
          <Link className={!selectedPurpose ? 'is-active' : ''} href={`${route}?q=${encodeURIComponent(query)}`}>
            Mọi mục đích
          </Link>
          {categories.map(c => (
            <Link
              aria-current={selectedPurpose === c.slug ? 'page' : undefined}
              className={selectedPurpose === c.slug ? 'is-active' : ''}
              href={`${route}?q=${encodeURIComponent(query)}&purpose=${c.slug}`}
              key={c.slug}
            >
              {c.name}
            </Link>
          ))}
        </nav>
        <details>
          <summary>Lọc thêm theo loại ứng dụng (.EXE)</summary>
          <div className="filter-row">
            <Link href={`/discover?${queryString()}`}>Tất cả loại</Link>
            {resourceTypes.map(item => (
              <Link
                className={type === item.type ? 'is-active' : ''}
                href={`${item.href}?${queryString(badge)}`}
                key={item.type}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </details>
        <div className="filter-row badge-filter" aria-label="Công cụ được quan tâm">
          {hotIds.size > 0 && <Link className={badge === 'hot' ? 'is-active' : ''} href={`${route}?${queryString('hot')}`}>HOT · Nhiều sao GitHub</Link>}
          {trendingIds.size > 0 && <Link className={badge === 'trending' ? 'is-active' : ''} href={`${route}?${queryString('trending')}`}>TRENDING · {trendingIds.size}</Link>}
          {badge && <Link href={`${route}?${queryString()}`}>Xóa bộ lọc {badge.toUpperCase()}</Link>}
        </div>
      </RetroWindow>

      <SectionHeading title={query ? `Kết quả cho “${query}”` : 'Ứng dụng AI dành cho bạn'} copy={`${results.length} công cụ`} />

      {!catalog.available || !catalog.resources.length ? (
        <CatalogNotice available={catalog.available} />
      ) : results.length ? (
        <InteractiveCatalog resources={results} />
      ) : (
        <EmptyState title="Chưa tìm thấy công cụ phù hợp." copy="Thử một từ khóa ngắn hơn hoặc chọn loại resource khác." actionHref="/discover" actionLabel="Xem tất cả" />
      )}
    </div>
  );
}

export async function ResourceDetail({ resource }: { resource: WindiResource }) {
  const [community, easyPrompt] = await Promise.all([
    getCommunityEvidence(resource.id),
    getPublishedEasyPrompt(resource.id),
  ]);

  return (
    <ResourceDetailView
      resource={resource}
      community={community.evidence}
      communityAvailable={community.available}
      easyPrompt={easyPrompt.prompt}
    />
  );
}
export async function CategoriesPage({ slug }: { slug?: string }) {
  const category = categories.find(item => item.slug === slug);
  if (category) return <DiscoverPage purpose={category.slug} />;
  if(slug) notFound();
  return <div className="page"><header className="page-intro"><span className="eyebrow">CATEGORIES</span><h1>Bắt đầu từ công việc bạn đang làm.</h1></header><div className="category-grid">{categories.map((item,index) => <Link href={`/category/${item.slug}`} className="category-card" key={item.slug}><span>0{index+1}</span><h2>{item.name}</h2><p>{item.description}</p><ArrowRight size={18} /></Link>)}</div></div>;
}
export async function CommunityPage() {
  const catalog = await getCatalog();
  return <div className="page"><header className="page-intro"><span className="eyebrow">COMMUNITY</span><h1>Trải nghiệm thật, có bài nguồn.</h1><p>Mở một tool để xem ảnh/video, bối cảnh sử dụng và cả những giới hạn người dùng gặp phải. Các ví dụ liên quan đến dự án gốc được ghi nhãn riêng.</p></header>{catalog.resources.length ? <ResourceGrid resources={catalog.resources.slice(0,12)} /> : <CatalogNotice available={catalog.available} />}</div>;
}
export function SubmitPage() { return <div className="page narrow-page"><header className="page-intro"><span className="eyebrow">SUBMIT A RESOURCE</span><h1>Gửi một tool đáng được kiểm tra.</h1><p>Submission là miễn phí. Resource chỉ xuất hiện công khai sau khi được duyệt.</p></header><RetroWindow title="SUBMISSION FORM" accent="green"><SubmitForm /></RetroWindow></div>; }
export function PricingPage({ support = false }: { support?: boolean }) { const plans = support ? ['49.000đ','99.000đ','199.000đ','499.000đ'] : ['Free','Windi Pro · 99.000đ/tháng','Windi Pro · 790.000đ/năm']; return <div className="page"><header className="page-intro"><span className="eyebrow">{support ? 'SUPPORT WINDI' : 'PRICING'}</span><h1>{support ? 'Giúp Windi review thêm tool tốt.' : 'Public knowledge vẫn là free.'}</h1><p>Thanh toán mới chưa mở. Editorial score không phụ thuộc khoản ủng hộ.</p></header><div className="pricing-grid">{plans.map((plan,index) => <RetroWindow key={plan} title={support ? 'ONE-TIME SUPPORT' : index === 0 ? 'FREE' : 'WINDI PRO'} accent={index === 0 ? 'green' : 'orange'}><h2>{plan}</h2><p>{!support && index === 0 ? 'Khám phá dữ liệu công khai đã được biên tập.' : 'Chưa kích hoạt thanh toán cho gói này.'}</p><button className="retro-button primary" disabled>{!support && index === 0 ? 'Miễn phí' : 'Sắp mở'}</button></RetroWindow>)}</div></div>; }
export function EmptyState({ title, copy, actionHref, actionLabel }: { title: string; copy: string; actionHref: string; actionLabel: string }) { return <RetroWindow title="SYSTEM MESSAGE" accent="orange" className="empty-state"><CircleHelp size={28} /><h2>{title}</h2><p>{copy}</p><Link href={actionHref} className="retro-link">{actionLabel} <ArrowRight size={16} /></Link></RetroWindow>; }
export function SimplePage({ title, copy, label = 'SYSTEM' }: { title: string; copy: string; label?: string }) { return <div className="page narrow-page"><header className="page-intro"><span className="eyebrow">{label}</span><h1>{title}</h1><p>{copy}</p></header><RetroWindow title="WINDI STATUS" accent="blue"><p className="long-copy">Chức năng này chưa hoàn tất kết nối dữ liệu. Các tác vụ chỉ được bật khi backend và quyền truy cập tương ứng đã được kiểm thử.</p></RetroWindow></div>; }
