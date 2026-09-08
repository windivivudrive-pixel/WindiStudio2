import { createClient } from '@/lib/supabase/server';
import { SubmitPage } from '@/windi/page-views';
import { RetroWindow } from '@/windi/ui/retro';
import { LogIn, Plus } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Submit Resource · Gửi công cụ AI vào Windi Studio',
  description: 'Đề xuất Skill, MCP, Open Source hoặc Workflow cho cộng đồng AI power users.',
};

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="page narrow-page" style={{ paddingTop: 60, paddingBottom: 100 }}>
        <RetroWindow title="AUTHENTICATION REQUIRED // SUBMIT RESOURCE" accent="yellow">
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
              <Plus size={32} />
            </div>
            <h1 style={{ fontSize: 24, margin: '0 0 10px', letterSpacing: '-0.03em' }}>
              Yêu cầu đăng nhập để gửi công cụ
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
              Để bảo đảm chất lượng danh mục, ghi nhận đóng góp chính xác và ngăn chặn spam bot, bạn cần
              đăng nhập tài khoản trước khi gửi công cụ vào Windi Studio.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/login?next=/submit" className="retro-button primary">
                <LogIn size={15} /> Đăng nhập để gửi tool
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

  return <SubmitPage />;
}
