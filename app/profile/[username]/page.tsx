import { SimplePage } from '@/windi/page-views';
export default async function Page({ params }: { params: Promise<{ username: string }> }) { return <SimplePage label="PUBLIC PROFILE" title={`@${(await params).username}`} copy="Public profile sẽ hiển thị collections, stacks và đóng góp cộng đồng khi chủ tài khoản bật công khai." />; }
