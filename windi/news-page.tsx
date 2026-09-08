import React from 'react';
import Link from 'next/link';
import { ExternalLink, Radio, RefreshCw, Calendar, Clock, ArrowRight, Lightbulb, CheckCircle2, Sparkles } from 'lucide-react';
import { getPublishedNews } from '@/lib/news-repository';
import type { WindiNewsItem } from '@/lib/windi-news';

function formatDate(dateString: string) {
  const parsed = new Date(dateString.includes('T') ? dateString : `${dateString}T12:00:00Z`);
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' }).format(parsed);
}

export async function NewsPage({ category = '' }: { category?: string }) {
  const allNews = await getPublishedNews();

  const categories = [
    { label: 'Tất cả', slug: '' },
    { label: 'AI Agents', slug: 'AI AGENTS' },
    { label: 'Video AI', slug: 'VIDEO AI' },
    { label: 'An toàn & Bảo mật', slug: 'AN TOÀN AI' },
    { label: 'Công cụ AI', slug: 'AI TOOLS' },
  ];

  const filteredNews = category
    ? allNews.filter(n => n.category.toUpperCase().includes(category.toUpperCase()))
    : allNews;

  const featured = filteredNews[0];
  const restNews = filteredNews.slice(1);

  // Schema.org ItemList for SEO collection indexing
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: allNews.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.title,
      url: `https://windistudio.app/news/${item.slug}`,
      image: item.imageUrl,
    })),
  };

  return (
    <div className="page news-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="page-intro news-intro">
        <span className="eyebrow"><Radio size={13} /> WINDI NEWS DESK // BẢN TIN AI</span>
        <h1>Tin AI chọn lọc,<br />viết dễ hiểu cho công việc thực tế.</h1>
        <p className="news-lead">
          Chọn lọc những bước tiến công nghệ AI quan trọng nhất từ Google Workspace, OpenAI, Anthropic và GitHub —
          phân tích chuyên sâu, trực quan, kèm hình ảnh minh họa và liên kết đối chiếu nguồn gốc.
        </p>
        <div className="news-intro-badges">
          <span className="news-live-tag">
            <span className="status-light" /> Cập nhật liên tục
          </span>
          <span className="news-updated">
            <RefreshCw size={12} /> Tự động đối chiếu nguồn gốc · Phân tích chuyên sâu & Hướng dẫn ứng dụng
          </span>
        </div>
      </header>

      {/* Category Navigation Filter */}
      <nav className="filter-row news-category-filter" aria-label="Bộ lọc chuyên mục tin tức">
        {categories.map((cat) => {
          const isActive = category.toUpperCase() === cat.slug.toUpperCase();
          const href = cat.slug ? `/news?category=${encodeURIComponent(cat.slug)}` : '/news';
          return (
            <Link
              key={cat.slug || 'all'}
              href={href}
              className={`filter-tab ${isActive ? 'is-active' : ''}`}
            >
              {cat.label}
            </Link>
          );
        })}
      </nav>

      {/* FEATURED SPOTLIGHT ARTICLE */}
      {featured && (
        <section className="news-featured-section" aria-label="Tin tiêu điểm">
          <article className="featured-news-card retro-window">
            <div className="window-titlebar tone-pink">
              <div className="window-dot-group">
                <span className="window-dot" />
                <span className="window-dot" />
              </div>
              <span className="window-title">SPOTLIGHT STORY // {featured.category}</span>
              <span className="window-badge">TIN NỔI BẬT</span>
            </div>

            <div className="featured-card-grid">
              {featured.imageUrl && (
                <div className="featured-image-container">
                  <img
                    src={featured.imageUrl}
                    alt={featured.imageAlt || featured.title}
                    className="featured-cover-image"
                    loading="eager"
                  />
                  <span className="featured-image-tag">{featured.sourceName}</span>
                </div>
              )}

              <div className="featured-body-container">
                <div className="featured-meta">
                  <span className="featured-category-badge">{featured.category}</span>
                  <span className="featured-date">
                    <Calendar size={12} />
                    <time dateTime={featured.publishedAt}>{formatDate(featured.publishedAt)}</time>
                  </span>
                  <span className="featured-reading-time">
                    <Clock size={12} /> {featured.readingTimeMinutes} phút đọc
                  </span>
                </div>

                <h2 className="featured-title">
                  <Link href={`/news/${featured.slug}`}>{featured.title}</Link>
                </h2>

                <p className="featured-summary">{featured.summary}</p>

                {/* Non-tech takeaway bullet points */}
                {featured.takeaways && featured.takeaways.length > 0 && (
                  <div className="featured-takeaways-mini">
                    <div className="takeaways-mini-title">
                      <Lightbulb size={14} />
                      <strong>Điểm cốt lõi cho bạn:</strong>
                    </div>
                    <ul>
                      {featured.takeaways.slice(0, 2).map((pt, i) => (
                        <li key={i}>
                          <CheckCircle2 size={13} className="mini-check" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action buttons + Source link at the bottom */}
                <div className="featured-card-footer">
                  <Link href={`/news/${featured.slug}`} className="featured-read-btn">
                    <span>Đọc bài phân tích chi tiết</span>
                    <ArrowRight size={15} />
                  </Link>

                  {/* SOURCE LINK AT THE BOTTOM */}
                  <div className="news-source-bottom-bar">
                    <span className="source-label">Nguồn bài viết gốc:</span>
                    <a
                      href={featured.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="source-inline-link"
                      title="Mở bài viết gốc"
                    >
                      <strong>{featured.sourceName}</strong>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </section>
      )}

      {/* NEWS CARDS GRID */}
      <section className="news-grid-section" aria-label="Danh sách tin tức mới">
        <div className="section-heading">
          <div>
            <span className="eyebrow">DÒNG SỰ KIỆN</span>
            <h2>Các bản tin AI mới nhất</h2>
          </div>
          <span className="news-count-badge">{filteredNews.length} bài viết</span>
        </div>

        <div className="news-cards-grid">
          {restNews.map((item) => (
            <article key={item.slug} className="news-grid-card retro-window">
              {/* Card Image Thumbnail */}
              {item.imageUrl && (
                <div className="card-thumbnail-wrap">
                  <Link href={`/news/${item.slug}`} tabIndex={-1} aria-hidden="true">
                    <img
                      src={item.imageUrl}
                      alt={item.imageAlt || item.title}
                      className="card-thumbnail-img"
                      loading="lazy"
                    />
                  </Link>
                  <span className="card-category-tag">{item.category}</span>
                </div>
              )}

              <div className="card-main-content">
                <div className="card-meta-row">
                  <time dateTime={item.publishedAt} className="card-time">
                    <Calendar size={12} /> {formatDate(item.publishedAt)}
                  </time>
                  <span className="card-reading-time">
                    <Clock size={12} /> {item.readingTimeMinutes} phút đọc
                  </span>
                </div>

                <h3 className="card-headline">
                  <Link href={`/news/${item.slug}`}>{item.title}</Link>
                </h3>

                <p className="card-summary">{item.summary}</p>

                {/* Non-tech Highlights */}
                {item.takeaways && item.takeaways.length > 0 && (
                  <ul className="card-takeaways-list">
                    {item.takeaways.slice(0, 2).map((point, idx) => (
                      <li key={idx}>
                        <CheckCircle2 size={13} className="bullet-icon" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="card-actions-row">
                  <Link href={`/news/${item.slug}`} className="card-detail-link">
                    <span>Đọc tiếp</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                {/* SOURCE LINK AT THE BOTTOM OF THE CARD */}
                <footer className="card-source-bottom">
                  <span className="source-tag">Nguồn bài viết gốc:</span>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="source-anchor"
                    title={`Mở bài viết gốc tại ${item.sourceName}`}
                  >
                    <span>{item.sourceName}</span>
                    <ExternalLink size={12} />
                  </a>
                </footer>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Editorial Policy Aside */}
      <aside className="news-policy-banner retro-window">
        <div className="window-titlebar tone-blue">
          <span className="window-dot" />
          <h2>TIÊU CHUẨN BIÊN TẬP TIN TỨC WINDI (NEWS POLICY)</h2>
        </div>
        <div className="window-content">
          <strong>Chính xác · Trực quan dễ ứng dụng · Luôn minh bạch nguồn gốc</strong>
          <p>
            Windi Studio theo dõi các thông báo chính thống từ các phòng nghiên cứu AI và công ty công nghệ hàng đầu thế giới.
            Mỗi bản tin đều được phân tích chuyên sâu với ví dụ thực tế cho công việc hàng ngày của người sáng tạo nội dung,
            chủ doanh nghiệp và chuyên gia, kèm liên kết bài gốc để bạn luôn có thể kiểm chứng.
          </p>
        </div>
      </aside>
    </div>
  );
}
