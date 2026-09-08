import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/settings', '/library', '/my-stacks', '/following'] }, sitemap: 'https://windistudio.app/sitemap.xml' }; }
