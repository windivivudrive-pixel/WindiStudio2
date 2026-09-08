import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublishedNewsBySlug, getRelatedNews } from '@/lib/news-repository';
import { NewsArticleView } from '@/windi/news-article-view';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { item: article } = await getPublishedNewsBySlug(slug);

  if (!article) {
    return {
      title: 'Bài viết không tìm thấy · Windi News',
      description: 'Không tìm thấy bài viết tin tức yêu cầu trên WindiStudio.',
    };
  }

  const pageUrl = `https://windistudio.app/news/${article.slug}`;

  return {
    title: `${article.title} — Tin tức AI`,
    description: article.summary,
    alternates: {
      canonical: `/news/${article.slug}`,
    },
    openGraph: {
      title: `${article.title} — Windi News`,
      description: article.summary,
      url: pageUrl,
      siteName: 'WindiStudio',
      locale: 'vi_VN',
      type: 'article',
      publishedTime: article.publishedAt,
      authors: [article.sourceName],
      images: [
        {
          url: article.imageUrl,
          width: 1200,
          height: 630,
          alt: article.imageAlt || article.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.summary,
      images: [article.imageUrl],
    },
  };
}

export default async function NewsDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const { item: article, available } = await getPublishedNewsBySlug(slug);

  if (!available) {
    throw new Error('Hệ thống tin tức tạm thời không khả dụng.');
  }

  if (!article) {
    notFound();
  }

  const relatedNews = await getRelatedNews(article.slug, 3);

  // Schema.org NewsArticle Structured Data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.summary,
    image: [article.imageUrl],
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    author: {
      '@type': 'Organization',
      name: article.sourceName,
      url: article.sourceUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'WindiStudio',
      url: 'https://windistudio.app',
      logo: {
        '@type': 'ImageObject',
        url: 'https://windistudio.app/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://windistudio.app/news/${article.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NewsArticleView article={article} relatedNews={relatedNews} />
    </>
  );
}
