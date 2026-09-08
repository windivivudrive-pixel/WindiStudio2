import 'server-only';
import { cache } from 'react';
import { latestNews, type WindiNewsItem } from './windi-news';

type NewsRow = {
  id?: string;
  canonical_url: string;
  source_name: string;
  source_title: string;
  title_vi: string;
  title_en: string | null;
  summary_vi: string;
  summary_en: string | null;
  category: string;
  published_at: string;
  raw_payload?: Record<string, any>;
};

async function publicQuery(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!base || !key) throw new Error('News is not configured');
  const response = await fetch(`${base}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`News unavailable (${response.status})`);
  return response.json();
}

function toShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date).replace('/', '.');
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
    .replace(/^-+|-+$/g, '');
}

const defaultCategoryImages: Record<string, string> = {
  'AI AGENTS': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
  'VIDEO AI': 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=1200&q=80',
  'AN TOÀN AI': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
  'AN TOÀN AGENT': 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',
  'AI TOOLS': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
};

function mapRow(row: NewsRow): WindiNewsItem {
  const raw = row.raw_payload || {};
  const generatedSlug = raw.slug || slugify(row.title_vi) || (row.id ? row.id.slice(0, 8) : 'tin-tuc-ai');
  const imageUrl = raw.image_url || defaultCategoryImages[row.category] || defaultCategoryImages['AI TOOLS'];

  return {
    id: row.id,
    slug: generatedSlug,
    category: row.category,
    sourceName: row.source_name,
    sourceUrl: row.canonical_url,
    originalTitle: row.source_title,
    title: row.title_vi,
    summary: row.summary_vi,
    imageUrl,
    imageAlt: raw.image_alt || row.title_vi,
    takeaways: Array.isArray(raw.takeaways) && raw.takeaways.length ? raw.takeaways : [
      'Cập nhật chính thức từ nguồn đáng tin cậy.',
      'Được biên tập lại ngắn gọn cho người dùng phổ thông.',
      'Có link nguồn bài viết gốc ở chân trang để đối chiếu.'
    ],
    nontechGuide: raw.nontech_guide || row.summary_vi,
    contentHtml: raw.content_html || undefined,
    actionableTip: raw.actionable_tip || undefined,
    ticker: raw.ticker || row.title_vi,
    publishedAt: row.published_at,
    shortDate: toShortDate(row.published_at),
    readingTimeMinutes: raw.reading_time_minutes || 2,
  };
}

/** Public news always comes from the RLS-protected Supabase table. The small
 * local list is only a graceful fallback while the database is unavailable. */
export const getPublishedNews = cache(async (): Promise<WindiNewsItem[]> => {
  try {
    const rows = await publicQuery('news_items?select=id,canonical_url,source_name,source_title,title_vi,title_en,summary_vi,summary_en,category,published_at,raw_payload&status=eq.PUBLISHED&order=published_at.desc&limit=30');
    if (Array.isArray(rows) && rows.length) {
      return rows.map(mapRow);
    }
  } catch {
    // Keep the homepage useful during a temporary data API outage.
  }
  return latestNews;
});

export async function getPublishedNewsBySlug(slug: string): Promise<{ available: boolean; item: WindiNewsItem | null }> {
  const newsList = await getPublishedNews();
  const normalizedSlug = slug.toLowerCase().trim();
  const matched = newsList.find(
    item => item.slug === normalizedSlug || item.id === normalizedSlug || slugify(item.title) === normalizedSlug
  );

  return {
    available: true,
    item: matched || null,
  };
}

export async function getRelatedNews(currentSlug: string, limit = 3): Promise<WindiNewsItem[]> {
  const newsList = await getPublishedNews();
  return newsList
    .filter(item => item.slug !== currentSlug)
    .slice(0, limit);
}
