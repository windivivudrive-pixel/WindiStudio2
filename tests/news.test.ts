import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { slugify, getPublishedNews, getPublishedNewsBySlug } from '@/lib/news-repository';
import { latestNews } from '@/lib/windi-news';

describe('Windi News System & Non-tech Editorial', () => {
  it('slugify converts Vietnamese titles to clean kebab-case slugs', () => {
    const slug = slugify('GitHub Copilot cho phép chạy nhiều trợ lý AI cùng lúc');
    expect(slug).toBe('github-copilot-cho-phep-chay-nhieu-tro-ly-ai-cung-luc');
    expect(slug).not.toContain(' ');
    expect(slug).not.toMatch(/[^\x00-\x7F]/); // only ASCII
  });

  it('all fallback news items have required images, non-tech takeaways and source URLs', () => {
    expect(latestNews.length).toBeGreaterThanOrEqual(4);
    for (const item of latestNews) {
      expect(item.slug).toBeTruthy();
      expect(item.imageUrl).toMatch(/^https:\/\//);
      expect(item.sourceUrl).toMatch(/^https:\/\//);
      expect(item.title).toBeTruthy();
      expect(item.summary).toBeTruthy();
      expect(item.takeaways.length).toBeGreaterThanOrEqual(2);
      expect(item.nontechGuide).toBeTruthy();
      expect(item.readingTimeMinutes).toBeGreaterThanOrEqual(1);
    }
  });

  it('getPublishedNews returns items with proper non-tech structure and images', async () => {
    const items = await getPublishedNews();
    expect(items.length).toBeGreaterThan(0);
    const first = items[0];
    expect(first.slug).toBeTruthy();
    expect(first.title).toBeTruthy();
    expect(first.imageUrl).toMatch(/^https:\/\//);
    expect(first.sourceUrl).toMatch(/^https:\/\//);
  });

  it('getPublishedNewsBySlug finds the article by its SEO slug', async () => {
    const { item } = await getPublishedNewsBySlug('github-copilot-chay-nhieu-agent-song-song');
    expect(item).not.toBeNull();
    expect(item?.sourceName).toBe('GitHub Blog');
    expect(item?.takeaways.length).toBeGreaterThan(0);
  });

  it('finds Google Pics long-form SEO article with images and rich content', async () => {
    const { item } = await getPublishedNewsBySlug('google-ra-mat-google-pics-canh-tranh-canva');
    expect(item).not.toBeNull();
    expect(item?.sourceName).toBe('Google Workspace');
    expect(item?.sourceUrl).toBe('https://workspace.google.com/products/pics/');
    expect(item?.category).toBe('THIẾT KẾ AI');
    expect(item?.takeaways.length).toBeGreaterThanOrEqual(3);
  });
});
