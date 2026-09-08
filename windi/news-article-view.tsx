'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  Share2,
  Sparkles,
  Check,
  CheckCircle2,
  Lightbulb,
  Radio,
  Compass,
} from 'lucide-react';
import type { WindiNewsItem } from '@/lib/windi-news';

function formatDate(dateString: string) {
  const parsed = new Date(dateString.includes('T') ? dateString : `${dateString}T12:00:00Z`);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

export function NewsArticleView({
  article,
  relatedNews = [],
}: {
  article: WindiNewsItem;
  relatedNews?: WindiNewsItem[];
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div className="page news-article-page">
      {/* Breadcrumbs Navigation */}
      <nav className="article-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/" className="crumb-link">Trang chủ</Link>
        <span className="crumb-separator">/</span>
        <Link href="/news" className="crumb-link">Tin tức AI</Link>
        <span className="crumb-separator">/</span>
        <span className="crumb-current">{article.category}</span>
      </nav>

      {/* Main Article Container */}
      <article className="news-article-container retro-window">
        {/* Retro Window Titlebar */}
        <div className="window-titlebar tone-blue">
          <div className="window-dot-group">
            <span className="window-dot" />
            <span className="window-dot" />
          </div>
          <span className="window-title">WINDI NEWS DESK // {article.category}.EXE</span>
          <span className="window-status">● LIVE</span>
        </div>

        <div className="article-content-wrapper">
          {/* Article Header */}
          <header className="article-header">
            <div className="article-meta-bar">
              <span className="article-category-badge">{article.category}</span>
              <div className="article-meta-group">
                <span className="article-meta-item">
                  <Calendar size={13} />
                  <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
                </span>
                <span className="article-meta-item">
                  <Clock size={13} />
                  <span>{article.readingTimeMinutes} phút đọc</span>
                </span>
              </div>
            </div>

            <h1 className="article-title">{article.title}</h1>
            <p className="article-lead">{article.summary}</p>
          </header>

          {/* Featured Image */}
          {article.imageUrl && (
            <figure className="article-hero-figure">
              <div className="article-image-frame">
                <img
                  src={article.imageUrl}
                  alt={article.imageAlt || article.title}
                  className="article-hero-image"
                  loading="eager"
                />
              </div>
              <figcaption className="article-image-caption">
                <span>Hình ảnh: Tài liệu công bố chính thức từ {article.sourceName}</span>
              </figcaption>
            </figure>
          )}

          {/* Quick Takeaways Box */}
          <section className="nontech-takeaways-box" aria-label="Điểm cốt lõi bài viết">
            <div className="takeaways-header">
              <Lightbulb size={18} className="takeaways-icon" />
              <h3>Điểm Cốt Lõi Cần Nắm Bắt Trong 30 Giây</h3>
            </div>
            <ul className="takeaways-list">
              {article.takeaways.map((point, index) => (
                <li key={index} className="takeaway-item">
                  <CheckCircle2 size={16} className="takeaway-bullet-icon" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Detailed Article Body Section */}
          <section className="article-body-section">
            <div className="body-heading-wrap">
              <span className="eyebrow">TỔNG QUAN & PHÂN TÍCH CHUYÊN SÂU</span>
              <h2>Khám Phá Toàn Diện Tính Năng & Khả Năng Ứng Dụng</h2>
            </div>
            {article.contentHtml ? (
              <div
                className="article-prose rich-article-prose"
                dangerouslySetInnerHTML={{ __html: article.contentHtml }}
              />
            ) : (
              <div className="article-prose">
                <p>{article.nontechGuide}</p>
              </div>
            )}
          </section>

          {/* Actionable Practical Tip */}
          {article.actionableTip && (
            <section className="actionable-tip-box">
              <div className="tip-header">
                <Sparkles size={16} className="tip-icon" />
                <h4>Gợi Ý Ứng Dụng Thực Tế</h4>
              </div>
              <p>{article.actionableTip}</p>
            </section>
          )}

          {/* SOURCE ATTRIBUTION BOX (Placed at the bottom of the article as requested) */}
          <section className="article-source-box" aria-label="Nguồn tham khảo bài viết gốc">
            <div className="source-box-header">
              <Compass size={16} />
              <span>NGUỒN BÀI VIẾT GỐC // SOURCE ATTRIBUTION</span>
            </div>
            <div className="source-box-content">
              <div className="source-info">
                <p className="source-label">Bài viết được tổng hợp và biên tập tiếng Việt từ công bố chính thức:</p>
                <strong className="source-original-title">&ldquo;{article.originalTitle}&rdquo;</strong>
                <span className="source-publisher">Đơn vị công bố: {article.sourceName}</span>
              </div>
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="source-direct-btn"
              >
                <span>Đọc bài viết gốc tại {article.sourceName}</span>
                <ExternalLink size={15} />
              </a>
            </div>
          </section>

          {/* Article Footer & Actions */}
          <footer className="article-footer">
            <Link href="/news" className="back-to-news-btn">
              <ArrowLeft size={16} />
              <span>Quay lại trang Tin Tức</span>
            </Link>

            <button
              type="button"
              onClick={handleCopyLink}
              className={`share-article-btn ${copied ? 'is-copied' : ''}`}
              title="Sao chép liên kết bài viết"
            >
              {copied ? (
                <>
                  <Check size={15} />
                  <span>Đã sao chép link!</span>
                </>
              ) : (
                <>
                  <Share2 size={15} />
                  <span>Chia sẻ bài viết</span>
                </>
              )}
            </button>
          </footer>
        </div>
      </article>

      {/* Related News Section */}
      {relatedNews.length > 0 && (
        <section className="related-news-section" aria-label="Tin tức liên quan">
          <div className="section-heading">
            <div>
              <span className="eyebrow">CẬP NHẬT TIẾP THEO</span>
              <h2>Có thể bạn quan tâm</h2>
            </div>
            <Link href="/news" className="text-link">Xem tất cả tin tức →</Link>
          </div>

          <div className="related-news-grid">
            {relatedNews.map((item) => (
              <article key={item.slug} className="related-card retro-window">
                {item.imageUrl && (
                  <div className="related-card-image-wrap">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="related-card-image"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="related-card-content">
                  <div className="related-card-meta">
                    <span className="related-category">{item.category}</span>
                    <time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time>
                  </div>
                  <h3 className="related-card-title">
                    <Link href={`/news/${item.slug}`}>{item.title}</Link>
                  </h3>
                  <p className="related-card-summary">{item.summary}</p>
                  <div className="related-card-footer">
                    <Link href={`/news/${item.slug}`} className="read-more-link">
                      Đọc chi tiết →
                    </Link>
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="related-source-sublink"
                      title="Nguồn bài viết gốc"
                    >
                      {item.sourceName} <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
