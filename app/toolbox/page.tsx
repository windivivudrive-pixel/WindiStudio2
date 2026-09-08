import { createClient } from '@/lib/supabase/server';
import { ToolboxView } from '@/windi/toolbox-view';
import { RetroWindow } from '@/windi/ui/retro';
import { LogIn, Wrench } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'My Toolbox · Hộp đồ nghề AI cá nhân',
  description: 'Quản lý, tổng hợp và xuất lệnh cho toàn bộ Skill, MCP, Workflow trong bộ công cụ AI của bạn.',
};

export default async function ToolboxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="page narrow-page" style={{ paddingTop: 60, paddingBottom: 100 }}>
        <RetroWindow title="AUTHENTICATION REQUIRED // MY TOOLBOX" accent="yellow">
          <div className="login-card" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div
              style={{
                display: 'inline-flex',
                padding: 14,
                borderRadius: 12,
                background: 'var(--surface-2)',
                border: '2px solid var(--border)',
                margin: '0 auto 16px',
                color: 'var(--ink)',
              }}
            >
              <Wrench size={32} />
            </div>
            <h1 style={{ fontSize: 24, margin: '0 0 10px', letterSpacing: '-0.03em' }}>
              Yêu cầu đăng nhập tài khoản
            </h1>
            <p
              style={{
                color: 'var(--muted)',
                maxWidth: 440,
                margin: '0 auto 24px',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              <strong>My Toolbox</strong> là không gian riêng tư được đồng bộ Cloud để bạn lưu trữ, quản
              lý và xuất lệnh cho toàn bộ Skill, MCP, Workflow trong bộ công cụ AI của bạn.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/login?next=/toolbox" className="retro-button primary">
                <LogIn size={15} /> Đăng nhập để mở Toolbox
              </Link>
              <Link href="/" className="retro-button secondary">
                Về trang chủ
              </Link>
            </div>
          </div>
        </RetroWindow>
      </div>
    );
  }

  return (
    <div className="page">
      <ToolboxView />
    </div>
  );
}
