import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '@/windi/gemini-2fa-guide.module.css';

export const metadata: Metadata = { title: 'Hướng dẫn dùng mã Gemini dài hạn', robots: { index: false, follow: false } };

export default function GeminiCodeGuide() {
  return <article className={styles.page}>
    <nav className={styles.breadcrumbs} aria-label="Đường dẫn"><Link href="/cua-hang">Cửa hàng</Link><span>/</span><Link href="/cua-hang/gemini-dai-han">Gemini Dài Hạn</Link><span>/</span><span>Hướng dẫn dùng mã</span></nav>
    <header className={styles.hero}><span className={styles.eyebrow}>HƯỚNG DẪN KÍCH HOẠT · GEMINI DÀI HẠN</span><h1>Hướng dẫn dùng mã nâng cấp Gemini</h1><p>Chuẩn bị mã gói đã nhận, tài khoản Google cần nâng cấp và phương thức xác minh hai bước.</p><div className={styles.heroActions}><Link className={styles.btnPrimary} href="/cua-hang/gemini-dai-han/kich-hoat">Mở trang kích hoạt →</Link><Link className={styles.btnSecondary} href="/cua-hang/gemini-dai-han/huong-dan-2fa">Hướng dẫn lấy 2FA &amp; mã dự phòng</Link></div></header>
    <section className={styles.warningCard}><h2>Lưu ý bảo mật</h2><p>Trang kích hoạt là dịch vụ bên thứ ba và yêu cầu thông tin đăng nhập, bao gồm mật khẩu và khóa 2FA hoặc mã dự phòng. Chỉ tiếp tục nếu bạn tin tưởng dịch vụ; các thông tin này có thể cấp quyền truy cập tài khoản của bạn.</p></section>
    <section className={styles.videoContainer} aria-labelledby="code-guide-video"><h2 id="code-guide-video">Video hướng dẫn dùng mã</h2><p>Xem các bước nhập mã, gửi yêu cầu và kiểm tra kết quả. Thông tin tài khoản trong video đã được che.</p><div className={styles.videoWrapper}><video controls playsInline preload="metadata" aria-label="Video hướng dẫn dùng mã Gemini"><source src="/gemini-guide/huong-dan-dung-ma.mp4" type="video/mp4" />Trình duyệt của bạn không hỗ trợ phát video.</video></div></section>
    <section className={styles.hero}><h2>Các bước sử dụng mã</h2><ol><li>Mở trang kích hoạt và nhập mã đã nhận.</li><li>Điền thông tin tài khoản, đọc lưu ý bảo mật và gửi yêu cầu.</li><li>Tra cứu trạng thái cho đến khi kích hoạt thành công và kiểm tra lại thời hạn trong tài khoản Google. Nếu kết quả chưa rõ, tra cứu trước khi gửi lại.</li></ol></section>
    <section className={styles.hero}><h2>Kiểm tra xác minh 2 bước</h2><p>Khi xác minh 2 bước đã được bật, bạn có thể kiểm tra mục Authenticator trong trang bảo mật tài khoản Google. Không bấm nút tắt xác minh 2 bước.</p><img src="/gemini-guide/xac-minh-2-buoc.webp" alt="Ví dụ trang xác minh 2 bước đã bật và ứng dụng Authenticator đã được thiết lập" loading="lazy" decoding="async" style={{ width: '100%', height: 'auto', borderRadius: '12px' }} /></section>
  </article>;
}
