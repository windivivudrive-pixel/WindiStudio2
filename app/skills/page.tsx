import { DiscoverPage } from '@/windi/page-views';
export default async function Page({searchParams}:{searchParams:Promise<{q?:string;purpose?:string}>}) { const {q,purpose} = await searchParams; return <DiscoverPage type="SKILL" query={q} purpose={purpose} />; }
