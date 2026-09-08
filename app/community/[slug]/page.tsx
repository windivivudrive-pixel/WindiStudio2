import { SimplePage } from '@/windi/page-views';
export default async function Page({ params }: { params: Promise<{ slug: string }> }) { return <SimplePage label="COMMUNITY NOTE" title={(await params).slug.replaceAll('-', ' ')} copy="Các community thread sẽ dùng resource-centric comments, votes và report workflow sau khi data layer hoạt động." />; }
