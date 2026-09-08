import { notFound } from 'next/navigation';
import { getPublishedResource } from '@/lib/catalog-repository';
import { ResourceDetail } from '@/windi/page-views';
export default async function Page({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const { resource, available } = await getPublishedResource(slug); if (!available) throw new Error('Không tải được danh mục Supabase.'); if (!resource || resource.type === 'STACK') notFound(); return <ResourceDetail resource={resource} />; }
