'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Key,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  PlayCircle,
  HelpCircle,
  Smartphone,
  Lock,
  ArrowLeft,
  FileText,
  ChevronDown,
} from 'lucide-react';
import styles from './gemini-2fa-guide.module.css';

type Tab = '2fa-key' | 'backup-code' | 'video' | 'template';

export function Gemini2FaGuide() {
  const [activeTab, setActiveTab] = useState<Tab>('2fa-key');
  const [copied, setCopied] = useState(false);

  const templateText = `Chào Admin WindiStudio, mình vừa thanh toán gói nâng cấp Gemini Pro chính chủ:
- Mã đơn hàng: [MÃ ĐƠN HÀNG TRÊN WEB]
- Email Google: [EMAIL CẦN NÂNG CẤP]
- Mật khẩu: [MẬT KHẨU GMAIL]
- Mã 2FA Secret Key (chuỗi 32 ký tự): [CHUỖI KHOÁ BÍ MẬT]
(Hoặc 10 Mã dự phòng Backup Codes):
[DANH SÁCH MÃ DỰ PHÒNG GOOGLE]

Nhờ Admin hỗ trợ nâng cấp gói Gemini giúp mình nhé!`;

  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(templateText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <article className={styles.page}>
      {/* Breadcrumbs */}
      <nav className={styles.breadcrumbs} aria-label="Đường dẫn">
        <Link href="/cua-hang">Cửa hàng</Link>
        <span>/</span>
        <Link href="/cua-hang/gemini-dai-han">Gemini Dài Hạn</Link>
        <span>/</span>
        <span>Hướng dẫn 2FA & Backup Code</span>
      </nav>

      {/* Hero */}
      <header className={styles.hero}>
        <span className={styles.eyebrow}>
          <span className={styles.dot} aria-hidden="true" />
          HƯỚNG DẪN BẢO MẬT & CHUẨN BỊ TÀI KHOẢN · GEMINI CHÍNH CHỦ
        </span>
        <h1>Hướng Dẫn Lấy Mã 2FA & Backup Code (Mã Dự Phòng Google)</h1>
        <p>
          Để hệ thống WindiStudio tiến hành kích hoạt gói <strong>Gemini Pro (6, 12, 24 tháng)</strong> trực tiếp
          trên tài khoản của bạn nhanh chóng, không bị kẹt bước xác thực điện thoại, bạn cần chuẩn bị chuỗi <strong>Mã khoá 2FA (Secret Key)</strong> hoặc <strong>10 Mã dự phòng (Backup Codes)</strong> theo hướng dẫn dưới đây.
        </p>

        <div className={styles.heroActions}>
          <a
            href="https://myaccount.google.com/signinoptions/twosv"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnPrimary}
          >
            <ExternalLink size={16} aria-hidden="true" />
            Mở Cài Đặt Bảo Mật Google ↗
          </a>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => setActiveTab('video')}
          >
            <PlayCircle size={16} aria-hidden="true" />
            Xem Video Hướng Dẫn (15s)
          </button>
          <Link href="/cua-hang/gemini-dai-han" className={styles.btnSecondary}>
            <ArrowLeft size={16} aria-hidden="true" />
            Quay lại trang Gói Gemini
          </Link>
        </div>
      </header>

      {/* Security notice */}
      <section className={styles.warningCard} aria-labelledby="security-notice-title">
        <div className={styles.warningHeader}>
          <AlertTriangle size={18} aria-hidden="true" />
          <span id="security-notice-title">LƯU Ý BẢO MẬT & QUY TRÌNH NÂNG CẤP CHÍNH CHỦ</span>
        </div>
        <p>
          Hệ thống kỹ thuật cần đăng nhập tài khoản một lần để thanh toán &amp; kích hoạt gói Gemini Pro vào tài khoản Google của bạn.
        </p>
        <ul>
          <li>
            <strong>Khuyến khích tạo tài khoản Google mới:</strong> Nếu bạn không muốn chia sẻ tài khoản chính có dữ liệu cá nhân (ảnh, drive, thư từ), hãy tạo một tài khoản Gmail mới riêng để nâng cấp.
          </li>
          <li>
            <strong>Đổi lại mật khẩu sau khi nhận:</strong> Ngay sau khi Admin bàn giao tài khoản nâng cấp thành công, bạn nên đổi mật khẩu mới và làm mới mã 2FA để bảo mật tối đa.
          </li>
          <li>
            <strong>Vì sao cần 2FA Secret Key hoặc Backup Code?</strong> Google sẽ tự động chặn đăng nhập từ xa nếu chỉ có mật khẩu thông thường. Cung cấp mã khoá 2FA hoặc mã dự phòng giúp kỹ thuật viên đăng nhập hoàn tất nâng cấp ngay lập tức mà không phải gọi bạn để xác nhận số trên màn hình.
          </li>
        </ul>
      </section>

      {/* Tabs navigation */}
      <nav className={styles.navTabs} aria-label="Chọn cách thực hiện">
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === '2fa-key' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('2fa-key')}
        >
          <Key size={16} aria-hidden="true" />
          Cách 1: Lấy Mã Khoá 2FA Secret Key (Khuyên Dùng)
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'backup-code' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('backup-code')}
        >
          <ShieldCheck size={16} aria-hidden="true" />
          Cách 2: Lấy 10 Mã Dự Phòng (Backup Code)
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'video' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('video')}
        >
          <PlayCircle size={16} aria-hidden="true" />
          Video Thao Tác Thực Tế
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'template' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('template')}
        >
          <FileText size={16} aria-hidden="true" />
          Mẫu Thông Tin Gửi Admin
        </button>
      </nav>

      {/* TAB 1: 2FA Secret Key */}
      {activeTab === '2fa-key' && (
        <section className={styles.guideSection} aria-labelledby="tab-2fa-title">
          <header className={styles.sectionHeader}>
            <h2 id="tab-2fa-title">Cách 1: Bật 2FA & Lấy Chuỗi Khoá Bí Mật (Secret Key 32 Ký Tự)</h2>
            <p>
              Đây là cách nhanh nhất và chuẩn nhất. Chuỗi khoá 32 ký tự này cho phép hệ thống tự động đồng bộ mã 6 số mà không làm phiền bạn.
            </p>
          </header>

          <div className={styles.stepGrid}>
            {/* Step 1 */}
            <div className={styles.stepCard}>
              <div className={styles.stepCardTop}>
                <span className={styles.stepBadge}>BƯỚC 01</span>
                <div>
                  <h3 className={styles.stepTitle}>Vào Cài Đặt Bảo Mật & Chọn Ứng Dụng Authenticator</h3>
                  <p className={styles.stepDesc}>
                    Truy cập trang bảo mật Google tại{' '}
                    <a
                      href="https://myaccount.google.com/signinoptions/twosv"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#8fb5ff', textDecoration: 'underline' }}
                    >
                      myaccount.google.com/signinoptions/twosv
                    </a>
                    . Cuộn xuống phần <strong>Thêm các bước thứ hai để xác minh danh tính</strong> → chọn mục <strong>Ứng dụng Authenticator</strong> (Authenticator app) → Bấm <strong>+ Thiết lập ứng dụng xác thực</strong>.
                  </p>
                </div>
              </div>
              <figure className={styles.stepVisual}>
                <img
                  src="/gemini-guide/step1-chon-authenticator.png"
                  alt="Bước 1: Chọn mục Ứng dụng Authenticator trong Xác minh 2 bước"
                  loading="lazy"
                />
                <figcaption>Chọn &quot;+ Thiết lập ứng dụng xác thực&quot; trong phần Ứng dụng Authenticator.</figcaption>
              </figure>
            </div>

            {/* Step 2 */}
            <div className={styles.stepCard}>
              <div className={styles.stepCardTop}>
                <span className={styles.stepBadge}>BƯỚC 02</span>
                <div>
                  <h3 className={styles.stepTitle}>Bấm Vào Dòng Chữ: &quot;Không thể quét mã?&quot;</h3>
                  <p className={styles.stepDesc}>
                    Cửa sổ hiện mã QR quét camera. Đừng vội lấy điện thoại quét! Nhìn xuống dưới mã QR, có dòng chữ màu xanh: <strong>&quot;Không thể quét mã?&quot; (Can&apos;t scan it?)</strong>. Hãy <strong>BẤM VÀO DÒNG NÀY</strong>.
                  </p>
                </div>
              </div>
              <div className={styles.stepHighlight}>
                ⚠️ <strong>Điểm mấu chốt:</strong> Nếu bạn quét mã QR bằng camera thì điện thoại sẽ lưu mã nhưng bạn sẽ không có chuỗi khoá text để gửi cho hệ thống nâng cấp. Hãy bấm &quot;Không thể quét mã?&quot; để Google hiện chuỗi ký tự.
              </div>
              <figure className={styles.stepVisual}>
                <img
                  src="/gemini-guide/step2-khong-the-quet-ma.png"
                  alt="Bước 2: Nhấn vào dòng chữ Không thể quét mã"
                  loading="lazy"
                />
                <figcaption>Bấm vào dòng chữ xanh &quot;Không thể quét mã?&quot; ngay dưới mã QR.</figcaption>
              </figure>
            </div>

            {/* Step 3 */}
            <div className={styles.stepCard}>
              <div className={styles.stepCardTop}>
                <span className={styles.stepBadge}>BƯỚC 03</span>
                <div>
                  <h3 className={styles.stepTitle}>Sao Chép &amp; Lưu Lại Chuỗi Khoá 32 Ký Tự</h3>
                  <p className={styles.stepDesc}>
                    Google sẽ hiển thị mã khoá dạng chữ và số gồm 32 ký tự (Ví dụ: <code>7z05 obk2 c4sp gqyq cwum wqcw zaav vlbf</code>).
                    <br />
                    👉 <strong>HÃY COPY VÀ LƯU LẠI CHUỖI NÀY!</strong> Đây chính là chuỗi 2FA bạn sẽ gửi cho Admin khi nâng cấp.
                  </p>
                </div>
              </div>
              <figure className={styles.stepVisual}>
                <img
                  src="/gemini-guide/step3-lay-khoa-thiet-lap.png"
                  alt="Bước 3: Lấy chuỗi khoá thiết lập 32 ký tự"
                  loading="lazy"
                />
                <figcaption>Copy chuỗi ký tự khoá thiết lập hiển thị ở mục số 2.</figcaption>
              </figure>
            </div>

            {/* Step 4 */}
            <div className={styles.stepCard}>
              <div className={styles.stepCardTop}>
                <span className={styles.stepBadge}>BƯỚC 04</span>
                <div>
                  <h3 className={styles.stepTitle}>Thêm Khoá Vào Ứng Dụng Google Authenticator Trên Điện Thoại</h3>
                  <p className={styles.stepDesc}>
                    Mở ứng dụng <strong>Google Authenticator</strong> trên điện thoại (tải miễn phí trên App Store / CH Play):
                    <br />
                    1. Bấm vào biểu tượng dấu cộng <strong>(+)</strong> ở góc dưới màn hình.
                    <br />
                    2. Chọn <strong>Nhập khoá thiết lập</strong> (Enter a setup key).
                    <br />
                    3. Nhập tên tài khoản (Ví dụ: <em>Gemini Pro - email của bạn</em>) và dán chuỗi khoá 32 ký tự vừa copy ở Bước 3 vào.
                    <br />
                    4. Giữ nguyên tùy chọn <strong>Dựa theo thời gian (Time-based)</strong> → Bấm <strong>Thêm</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className={styles.stepCard}>
              <div className={styles.stepCardTop}>
                <span className={styles.stepBadge}>BƯỚC 05</span>
                <div>
                  <h3 className={styles.stepTitle}>Nhập Mã 6 Chữ Số Để Xác Minh & Bật Xác Minh 2 Bước</h3>
                  <p className={styles.stepDesc}>
                    Quay lại màn hình máy tính bấm nút <strong>Tiếp theo</strong>. Nhập mã 6 chữ số đang hiển thị trên ứng dụng Google Authenticator vào và bấm <strong>Xác minh</strong>. Sau khi xác minh xong, nếu Xác minh 2 bước chưa bật, hãy bấm <strong>Bật</strong> để hoàn tất.
                  </p>
                </div>
              </div>
              <figure className={styles.stepVisual}>
                <img
                  src="/gemini-guide/step4-nhap-ma-xac-minh.png"
                  alt="Bước 5: Nhập mã 6 chữ số từ app Authenticator"
                  loading="lazy"
                />
                <figcaption>Nhập mã 6 số từ app Authenticator để kích hoạt.</figcaption>
              </figure>
              <div style={{ marginTop: '16px' }}>
                <figure className={styles.stepVisual}>
                  <img
                    src="/gemini-guide/step5-da-bat-thanh-cong.png"
                    alt="Hoàn tất: Giờ đây tài khoản đã được bảo vệ bằng Xác minh 2 bước"
                    loading="lazy"
                  />
                  <figcaption>Màn hình thông báo Xác minh 2 bước đã bật thành công.</figcaption>
                </figure>
              </div>
              <div style={{ marginTop: '16px' }}>
                <figure className={styles.stepVisual}>
                  <img
                    src="/gemini-guide/step6-kiem-tra-2fa.webp"
                    alt="Màn hình xác minh 2 bước đã bật, hiển thị nút Turn off 2-Step Verification"
                    loading="lazy"
                  />
                  <figcaption>Sau khi bật thành công, trang cài đặt sẽ hiển thị nút tắt Xác minh 2 bước như hình.</figcaption>
                </figure>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: Backup Codes */}
      {activeTab === 'backup-code' && (
        <section className={styles.guideSection} aria-labelledby="tab-backup-title">
          <header className={styles.sectionHeader}>
            <h2 id="tab-backup-title">Cách 2: Lấy 10 Mã Dự Phòng (Google Backup Codes)</h2>
            <p>
              Dành cho những tài khoản đã bật Xác minh 2 bước từ trước qua điện thoại / SMS và bạn không muốn cài đặt lại ứng dụng Authenticator.
            </p>
          </header>

          <div className={styles.stepGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepCardTop}>
                <span className={styles.stepBadge}>BƯỚC 01</span>
                <div>
                  <h3 className={styles.stepTitle}>Vào Mục Mã Dự Phòng (Backup Codes)</h3>
                  <p className={styles.stepDesc}>
                    Mở trang{' '}
                    <a
                      href="https://myaccount.google.com/signinoptions/twosv"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#8fb5ff', textDecoration: 'underline' }}
                    >
                      myaccount.google.com/signinoptions/twosv
                    </a>
                    . Cuộn xuống phần <strong>Mã dự phòng (Backup codes)</strong> và bấm vào mũi tên bên phải.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.stepCard}>
              <div className={styles.stepCardTop}>
                <span className={styles.stepBadge}>BƯỚC 02</span>
                <div>
                  <h3 className={styles.stepTitle}>Nhận Hoặc Tạo Danh Sách Mã Mới</h3>
                  <p className={styles.stepDesc}>
                    Nhấp vào nút <strong>+ Nhận mã dự phòng</strong> (hoặc <em>Tạo mã mới</em> nếu đã từng tạo).
                    Google sẽ tạo ra 1 danh sách gồm <strong>10 mã</strong> (mỗi mã gồm 8 số, ví dụ: <code>1829 4021</code>, <code>9582 1049</code>...).
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.stepCard}>
              <div className={styles.stepCardTop}>
                <span className={styles.stepBadge}>BƯỚC 03</span>
                <div>
                  <h3 className={styles.stepTitle}>Sao Chép Hoặc Tải Xuống Danh Sách Mã</h3>
                  <p className={styles.stepDesc}>
                    Bấm <strong>Sao chép mã</strong> hoặc <strong>Tải mã xuống</strong>.
                    <br />
                    👉 Gửi danh sách 10 mã (hoặc ít nhất 2–3 mã) cho Admin cùng thông tin email và mật khẩu tài khoản.
                  </p>
                </div>
              </div>
              <div className={styles.stepHighlight}>
                💡 <strong>Đặc điểm của mã dự phòng:</strong> Mỗi mã 8 số chỉ có thể sử dụng đúng <strong>1 lần duy nhất</strong> để đăng nhập. Kỹ thuật viên khi đăng nhập sẽ dùng 1 mã, sau khi nâng xong mã đó tự động vô hiệu hoá, các mã còn lại vẫn dùng được bình thường.
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: Video Demo */}
      {activeTab === 'video' && (
        <section className={styles.videoContainer} aria-labelledby="tab-video-title">
          <header className={styles.sectionHeader}>
            <h2 id="tab-video-title">Video Thao Tác Thực Tế (15 Giây)</h2>
            <p>
              Video quay lại toàn bộ quá trình lấy chuỗi khoá thiết lập 2FA (Secret Key) trên tài khoản Google:
            </p>
          </header>

          <div className={styles.videoWrapper}>
            <video
              controls
              playsInline
              preload="metadata"
              poster="/gemini-guide/step3-lay-khoa-thiet-lap.png"
              src="/gemini-guide/huong-dan-2fa.mp4"
            >
              Trình duyệt của bạn không hỗ trợ thẻ video.
            </video>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => setActiveTab('template')}
            >
              Lấy Mẫu Tin Nhắn Gửi Admin →
            </button>
            <a
              href="https://myaccount.google.com/signinoptions/twosv"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnSecondary}
            >
              Thực hành ngay trên Google ↗
            </a>
          </div>
        </section>
      )}

      {/* TAB 4: Message Template */}
      {activeTab === 'template' && (
        <section className={styles.copyTemplateCard} aria-labelledby="tab-template-title">
          <div className={styles.copyHeader}>
            <h3 id="tab-template-title">Mẫu Tin Nhắn Cung Cấp Thông Tin Cho Admin</h3>
            <button
              type="button"
              onClick={handleCopyTemplate}
              className={styles.btnPrimary}
              style={{ fontSize: '11px', minHeight: '36px', padding: '6px 14px' }}
            >
              {copied ? (
                <>
                  <Check size={14} aria-hidden="true" />
                  Đã sao chép vào bộ nhớ!
                </>
              ) : (
                <>
                  <Copy size={14} aria-hidden="true" />
                  Sao chép mẫu tin nhắn
                </>
              )}
            </button>
          </div>

          <textarea
            className={styles.templateTextarea}
            readOnly
            value={templateText}
            onClick={handleCopyTemplate}
            aria-label="Nội dung mẫu tin nhắn gửi admin"
          />

          <p style={{ fontSize: '11px', color: '#9bb8e2', marginTop: '12px' }}>
            Bấm vào nút trên hoặc nhấp thẳng vào khung để sao chép, sau đó gửi qua kênh Zalo hoặc TikTok của WindiStudio:
          </p>

          <div className={styles.templateActions}>
            <a
              href="https://zalo.me/0777493267"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnPrimary}
            >
              Nhắn tin qua Zalo Admin (0777 493 267) ↗
            </a>
            <a
              href="https://www.tiktok.com/@windistudiovn"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnSecondary}
            >
              Nhắn tin qua TikTok @windistudiovn ↗
            </a>
          </div>
        </section>
      )}

      {/* FAQs */}
      <section className={styles.faqSection} aria-labelledby="faq-title">
        <h2 id="faq-title">Câu Hỏi Thường Gặp (FAQ)</h2>
        <div className={styles.faqList}>
          <details className={styles.faqItem}>
            <summary className={styles.faqSummary}>
              <span>1. Tại sao tôi chỉ đưa mật khẩu không được mà phải lấy 2FA / Backup Code?</span>
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <p>
              Google áp dụng cơ chế bảo mật định danh thiết bị. Khi một máy tính lạ hoặc địa chỉ IP mới đăng nhập vào tài khoản của bạn, Google sẽ ngay lập tức kích hoạt thử thách bảo mật yêu cầu xác minh 2 bước hoặc thông báo trên điện thoại. Nếu không có mã 2FA Secret Key hoặc 10 mã dự phòng (Backup Codes), quá trình nâng cấp sẽ bị dừng lại chờ bạn mở điện thoại bấm xác nhận, gây chậm trễ đặc biệt khi lệch múi giờ.
            </p>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqSummary}>
              <span>2. Tôi dùng tài khoản Gmail mới tạo có nâng cấp được Gemini Pro không?</span>
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <p>
              <strong>Hoàn toàn được và rất được khuyến khích!</strong> Việc tạo một tài khoản Google mới tinh giúp bạn yên tâm 100% về dữ liệu cá nhân riêng tư. Sau khi nâng cấp xong, bạn dùng tài khoản này để đăng nhập vào Gemini Advanced, Google Flow, Antigravity và YouTube Premium.
            </p>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqSummary}>
              <span>3. Sau khi Admin nâng cấp xong, tôi có được đổi lại mật khẩu không?</span>
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <p>
              <strong>Chắc chắn có.</strong> Ngay sau khi Admin thông báo nâng cấp hoàn tất, bạn hãy đăng nhập kiểm tra gói bản quyền (dung lượng 5TB, quyền truy cập Gemini 4 Argon, YouTube Premium) rồi vào ngay Cài đặt bảo mật Google để đổi mật khẩu mới. Gói bản quyền của bạn vẫn giữ nguyên không bị ảnh hưởng khi đổi mật khẩu.
            </p>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqSummary}>
              <span>4. Tôi nên chọn gửi chuỗi khoá 2FA (Cách 1) hay gửi Mã dự phòng (Cách 2)?</span>
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <p>
              Cả 2 cách đều hiệu quả như nhau. Nếu bạn tạo tài khoản mới từ đầu, Cách 1 (lấy chuỗi khoá 32 ký tự 2FA) là nhanh nhất. Nếu bạn nâng trên tài khoản cũ đã bật 2FA bằng số điện thoại từ lâu, bạn hãy dùng Cách 2 (vào mục Mã dự phòng lấy 10 mã) để không phải cấu hình lại Authenticator.
            </p>
          </details>
        </div>
      </section>

      {/* Footer Support */}
      <footer className={styles.footSupport}>
        <h3>Cần hỗ trợ trực tiếp khi thao tác?</h3>
        <p>Nếu bạn gặp vướng mắc ở bất kỳ bước nào, hãy liên hệ ngay với đội ngũ hỗ trợ kỹ thuật của WindiStudio.</p>
        <div className={styles.supportButtons}>
          <a
            href="https://zalo.me/0777493267"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnPrimary}
          >
            Chat Zalo: 0777 493 267
          </a>
          <a
            href="https://www.tiktok.com/@windistudiovn"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnSecondary}
          >
            TikTok: @windistudiovn
          </a>
          <Link href="/cua-hang/gemini-dai-han" className={styles.btnSecondary}>
            Đến trang Đặt hàng Gemini Pro
          </Link>
        </div>
      </footer>
    </article>
  );
}
