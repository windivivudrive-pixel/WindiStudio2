import { AudioLines, Clapperboard, Laptop, Timer } from "lucide-react";
import { RetroBadge } from "./ui/retro";
import { DubbingKitCommerce } from "./dubbing-kit-commerce";
import styles from "./local-dubbing-section.module.css";

const benefits = [
  {
    icon: Clapperboard,
    title: "Đưa file hoặc dán link video",
    copy: "Chọn video trên máy hoặc dán đường dẫn được hỗ trợ. Bộ kit nhận diện lời thoại để bạn kiểm tra và dịch sang tiếng Việt.",
  },
  {
    icon: AudioLines,
    title: "Chọn giọng, nghe thử trước khi xuất",
    copy: "Tạo giọng Việt trên máy hoặc kết nối dịch vụ giọng đọc của bạn. Video nhiều người nói có thể chọn giọng riêng cho từng người.",
  },
  {
    icon: Timer,
    title: "Bớt công canh lời, ghép tiếng",
    copy: "Bộ kit hỗ trợ cân thời lượng lời đọc theo từng đoạn. Bạn có thể sửa câu dịch, nghe lại và xuất video kèm phụ đề.",
  },
];

export function LocalDubbingSection() {
  return (
    <section id="local-dubbing" className={styles.section} aria-labelledby="local-dubbing-title">
      <div className={styles.titlebar}>
        <Laptop size={18} aria-hidden="true" />
        <span>WINDI VIDEO KITS / LỒNG TIẾNG VIỆT</span>
      </div>
      <div className={styles.body}>
        <div className={styles.copy}>
          <RetroBadge accent="blue">WINDI DUBBING KIT · BẢN BETA</RetroBadge>
          <h2 id="local-dubbing-title">Video nước ngoài.<br />Giọng Việt trên máy bạn.</h2>
          <p className={styles.intro}>
            Lồng tiếng Việt cho video hướng dẫn, bài giảng hay phỏng vấn của bạn.
            Nhận diện lời thoại, dịch, chọn giọng và xuất video trong cùng một
            giao diện — bớt chuyển công cụ, bớt ghép từng câu bằng tay.
          </p>
          <ul className={styles.benefits}>
            {benefits.map(({ icon: Icon, title, copy }) => (
              <li key={title}>
                <Icon size={21} aria-hidden="true" />
                <div><h3>{title}</h3><p>{copy}</p></div>
              </li>
            ))}
          </ul>
        </div>
        <aside className={styles.offer} aria-label="Mua bộ kit Windi Dubbing">
          <DubbingKitCommerce />
        </aside>
      </div>
      <ol className={styles.pipeline} aria-label="Quy trình lồng tiếng">
        <li><span>01</span> Video gốc</li>
        <li><span>02</span> Lời thoại & bản dịch</li>
        <li><span>03</span> Giọng Việt</li>
        <li><span>04</span> Video tiếng Việt</li>
      </ol>
      <p className={styles.setup}>
        <strong>Cài một lần, dùng cho nhiều video.</strong> Bạn cần máy tính và tài khoản
        ChatGPT qua Codex hoặc Antigravity để dịch; cũng có thể nhập bản dịch có sẵn.
        Hướng dẫn cài đặt nằm trong bộ kit. Giọng đọc trên máy không tính phí theo từng
        lần tạo; nếu chọn dịch vụ giọng đọc bên ngoài, bạn trả phí theo dịch vụ đó.
      </p>
      <details className={styles.setup}>
        <summary>Yêu cầu cài đặt và thông tin bản beta</summary>
        <p>Cần Node.js 20 trở lên, Python và FFmpeg. Cần internet để tải công cụ,
          model, video từ link hoặc dùng dịch vụ AI. Tốc độ và khả năng chạy giọng
          local phụ thuộc cấu hình máy. Bản beta chưa được kiểm chứng đầy đủ trên
          mọi cấu hình Windows và macOS.</p>
      </details>
    </section>
  );
}
