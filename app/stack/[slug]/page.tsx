import { notFound } from 'next/navigation';
import { getPublishedResource } from '@/lib/catalog-repository';
import { StackDetailView } from '@/windi/stack-detail-view';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { resource, available } = await getPublishedResource(slug);
  if (!available) throw new Error('Không tải được danh mục.');
  if (!resource || resource.type !== 'STACK') notFound();
  return <StackDetailView stack={resource} />;
}
