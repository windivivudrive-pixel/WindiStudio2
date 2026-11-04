import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '@/windi/gemini-2fa-guide.module.css';

export const metadata: Metadata = { title: 'Hướng dẫn dùng mã Gemini dài hạn', robots: { index: false, follow: false } };

export default function GeminiCodeGuide() {
  return <article className={styles.page}>
    <nav className={styles.breadcrumbs} aria-label="Đường dẫn"><Link href="/cua-hang">Cửa hàng</Link><span>/</span><Link href="/cua-hang/gemini-dai-han">Gemini Dài Hạn</Link><span>/</span><span>Hướng dẫn dùng mã</span></nav>
    <header className={styles.hero}><span className={styles.eyebrow}>HƯỚNG DẪN KÍCH HOẠT · GEMINI DÀI HẠN</span><h1>Hướng dẫn dùng mã nâng cấp Gemini</h1><p>Chuẩn bị mã gói đã nhận, tài khoản Google cần nâng cấp và phương thức xác minh hai bước.</p><div className={styles.heroActions}><a className={styles.btnPrimary} href="https://aipass.plus/" target="_blank" rel="noopener noreferrer">Mở trang kích hoạt ↗</a><Link className={styles.btnSecondary} href="/cua-hang/gemini-dai-han/huong-dan-2fa">Hướng dẫn lấy 2FA &amp; mã dự phòng</Link></div></header>
    <section className={styles.warningCard}><h2>Lưu ý bảo mật</h2><p>Trang kích hoạt là dịch vụ bên thứ ba và yêu cầu thông tin đăng nhập, bao gồm mật khẩu và khóa 2FA hoặc mã dự phòng. Chỉ tiếp tục nếu bạn tin tưởng dịch vụ; các thông tin này có thể cấp quyền truy cập tài khoản của bạn.</p></section>
    <section className={styles.videoContainer} aria-labelledby="code-guide-video"><h2 id="code-guide-video">Video hướng dẫn dùng mã</h2><p>Xem các bước nhập mã, gửi yêu cầu và kiểm tra kết quả. Thông tin tài khoản trong video đã được che.</p><div className={styles.videoWrapper}><video controls playsInline preload="metadata" aria-label="Video hướng dẫn dùng mã Gemini"><source src="/gemini-guide/huong-dan-dung-ma.mp4" type="video/mp4" />Trình duyệt của bạn không hỗ trợ phát video.</video></div></section>
    <section className={styles.hero}><h2>Các bước sử dụng mã</h2><ol><li>Mở trang kích hoạt và dán mã nhận được vào ô CDKEY.</li><li>Chọn Submit Task và kiểm tra gói, thời hạn trước khi tiếp tục.</li><li>Điền thông tin theo biểu mẫu trên trang kích hoạt. Xem kỹ thông tin được yêu cầu trước khi gửi.</li><li>Chờ trạng thái thành công và kiểm tra lại thời hạn trong tài khoản Google. Nếu kết quả chưa rõ, kiểm tra lịch sử tác vụ trước khi gửi lại.</li></ol></section>
  </article>;
}
