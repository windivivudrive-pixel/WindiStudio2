import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GeminiShop } from '@/windi/gemini-shop';
import { publicShopProducts } from '@/lib/gemini/public-catalog';

export const dynamic = 'force-dynamic';
const mockups = new Set(['gemini-18m','chatgpt-personal-1m','claude-1m','youtube-1m','elevenlabs-1m','capcut-12m','cursor-1m','gamma-6m']);
export async function generateMetadata({ params }: { params: Promise<{ sku: string }> }): Promise<Metadata> {
  const { sku } = await params;
  const products = await publicShopProducts();
  const product = products?.find(item => item.sku === sku);
  return { title: product?.title || 'Sản phẩm', alternates: { canonical: `/cua-hang/${encodeURIComponent(sku)}` } };
}
export default async function ProductPage({ params }: { params: Promise<{ sku: string }> }) {
  const { sku } = await params;
  if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(sku) || mockups.has(sku) || sku.startsWith('gemini-managed-')) notFound();
  const products = await publicShopProducts();
  if (products && !products.some(product => product.sku === sku)) notFound();
  return <GeminiShop initialProduct={sku === 'gemini-3m' ? 'google' : 'product'} initialSku={sku} initialProducts={products} />;
}
