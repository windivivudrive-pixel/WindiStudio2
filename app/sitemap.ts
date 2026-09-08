import type { MetadataRoute } from 'next';
import { getCatalog } from '@/lib/catalog-repository';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://windistudio.app';
  const { resources } = await getCatalog();
  return ['/', '/discover', '/video-kits', '/voice-studio', '/news', '/skills', '/mcp', '/open-source', '/workflows', '/stacks', '/categories', '/community', '/pricing', '/support'].map(path => ({ url: `${base}${path}` })).concat(resources.map(item => ({ url: `${item.type === 'STACK' ? `${base}/stack/` : `${base}/tool/`}${item.slug}` })));
}
