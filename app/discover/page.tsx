import { DiscoverPage } from '@/windi/page-views';
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; purpose?:string; badge?:string }> }) { const { q,purpose,badge } = await searchParams; return <DiscoverPage query={q} purpose={purpose} badge={badge === 'hot' || badge === 'trending' ? badge : ''} />; }
