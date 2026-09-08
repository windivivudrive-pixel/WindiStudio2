import { ToolboxView } from '@/windi/toolbox-view';

export const metadata = {
  title: 'My Toolbox · Hộp đồ nghề AI',
  description: 'Quản lý bộ công cụ AI cá nhân của bạn trên Windi.',
};

export default function Page() {
  return (
    <div className="page">
      <ToolboxView />
    </div>
  );
}
