import { CategoriesPage } from '@/windi/page-views';
export default async function Page({ params }: { params: Promise<{ slug: string }> }) { return <CategoriesPage slug={(await params).slug} />; }
