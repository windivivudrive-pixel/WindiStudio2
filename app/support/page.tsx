import Link from 'next/link';
import { DonationWindow } from '@/windi/donation-window';
import { RetroWindow, RetroBadge } from '@/windi/ui/retro';
import { ShieldCheck, Heart, Coffee, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Keep Windi Online ♥ · Ủng hộ Windi Studio',
  description:
    'Help us test more tools, review more repos and keep Windi independent. Ủng hộ Windi trải nghiệm thực tế và tuyển chọn công cụ AI.',
};

export default function SupportPage() {
  return (
    <div className="page narrow-page" style={{ paddingTop: 48, paddingBottom: 96 }}>
      <header className="page-intro" style={{ textAlign: 'center', margin: '0 auto 32px' }}>
        <span className="eyebrow">SUPPORT WINDI // BUY ME A COFFEE</span>
        <h1>Giữ Windi luôn độc lập & hữu ích.</h1>
        <p style={{ margin: '0 auto' }}>
          Nếu Windi giúp bạn tiết kiệm thời gian tìm kiếm và ghép stack AI hiệu quả, một ly cà phê
          từ bạn là nguồn động viên to lớn cho team.
        </p>
      </header>

      {/* Main Retro Donation Window */}
      <DonationWindow />

      {/* Independence & Transparency Section */}
      <section style={{ marginTop: 36 }}>
        <RetroWindow title="CAM KẾT ĐỘC LẬP // TRANSPARENCY PLEDGE" accent="yellow">
          <div style={{ display: 'grid', gap: 16, fontSize: 13.5, lineHeight: 1.65 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <ShieldCheck size={20} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Không mua bán vị trí hay điểm số</strong>
                <p style={{ margin: '2px 0 0', color: 'var(--muted)' }}>
                  Khoản ủng hộ là hoàn toàn tự nguyện. Không đổi lấy điểm số Windi Score, huy hiệu
                  hay bất kỳ sự ưu tiên biên tập nào.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Coffee size={20} style={{ color: 'var(--pink)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Chi phí được dùng vào đâu?</strong>
                <p style={{ margin: '2px 0 0', color: 'var(--muted)' }}>
                  Toàn bộ kinh phí được dùng để chi trả token API LLM phục vụ kiểm thử chạy thật các
                  Skill/MCP, duy trì máy chủ hạ tầng và nạp caffeine cho các session coding đêm.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Sparkles size={20} style={{ color: 'var(--blue)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Cộng đồng là cốt lõi</strong>
                <p style={{ margin: '2px 0 0', color: 'var(--muted)' }}>
                  Ngoài việc donate, bạn có thể đóng góp bằng cách gửi các tool hay tại mục{' '}
                  <Link href="/submit" style={{ textDecoration: 'underline', fontWeight: 700 }}>
                    Submit Tool
                  </Link>{' '}
                  hoặc chia sẻ Windi Studio tới bạn bè trong cộng đồng lập trình viên.
                </p>
              </div>
            </div>
          </div>
        </RetroWindow>
      </section>
    </div>
  );
}
