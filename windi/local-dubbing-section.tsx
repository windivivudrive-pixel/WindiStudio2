import { ArrowUpRight, AudioLines, Clapperboard, Laptop, Timer } from "lucide-react";
import { RetroBadge } from "./ui/retro";
import styles from "./local-dubbing-section.module.css";

const benefits = [
  {
    icon: Clapperboard,
    title: "Đưa file hoặc dán link video",
    copy: "Nhận video có sẵn trên máy hoặc tải từ URL. Skill tự lấy lời thoại và mốc thời gian từng câu.",
  },
  {
    icon: AudioLines,
    title: "Có giọng Việt ngay trên máy",
    copy: "VieNeu-TTS tạo giọng Bảo Long, nam miền Bắc. Tạo voice local, không tiêu hao credit TTS cloud mỗi lần dub.",
  },
  {
    icon: Timer,
    title: "Bớt công canh lời, ghép tiếng",
    copy: "Tự điều chỉnh độ dài câu dịch và cân tốc độ âm thanh với hình ảnh để lời đọc khớp từng đoạn video.",
  },
];

export function LocalDubbingSection() {
  return (
    <section id="local-dubbing" className={styles.section} aria-labelledby="local-dubbing-title">
      <div className={styles.titlebar}>
        <Laptop size={18} aria-hidden="true" />
        <span>WINDI VIDEO KITS / LOCAL DUBBING</span>
      </div>
      <div className={styles.body}>
        <div className={styles.copy}>
          <RetroBadge accent="blue">SKILL DUB VIDEO · VIENEU</RetroBadge>
          <h2 id="local-dubbing-title">Video nước ngoài.<br />Giọng Việt trên máy bạn.</h2>
          <p className={styles.intro}>
            Từ video gốc đến bản lồng tiếng Việt trong một quy trình:
            lấy lời thoại, dịch, tạo giọng và xuất video. Bớt chuyển qua nhiều
            công cụ, bớt ghép từng câu bằng tay.
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
        <aside className={styles.offer} aria-label="Giá skill dub video local">
          <span className={styles.offerLabel}>SKILL DUB VIDEO LOCAL</span>
          <p className={styles.price}><span className={styles.only}>Chỉ</span><strong>169.000<span>đ</span></strong></p>
          <p className={styles.offerCopy}>Một workflow riêng cho việc lồng tiếng video sang tiếng Việt.</p>
          <div className={styles.localNote}>
            <Laptop size={24} aria-hidden="true" />
            <strong>Xử lý trên máy của bạn</strong>
            <span>Whisper nhận diện lời thoại.<br />VieNeu tạo giọng. Remotion xuất video.</span>
          </div>
          <a
            className={`kit-buy-button ${styles.buy}`}
            href="https://www.facebook.com/profile.php?id=61594238790213"
            target="_blank"
            rel="noopener noreferrer"
          >
            Liên hệ mua skill <ArrowUpRight size={18} aria-hidden="true" />
          </a>
          <small className={styles.contactNote}>Qua Facebook WindiStudio (mở tab mới).<br />Sản phẩm bán riêng với Video Workflow.</small>
        </aside>
      </div>
      <ol className={styles.pipeline} aria-label="Quy trình lồng tiếng">
        <li><span>01</span> Video gốc</li>
        <li><span>02</span> Lời thoại & bản dịch</li>
        <li><span>03</span> Giọng Việt</li>
        <li><span>04</span> Video đã dub</li>
      </ol>
      <p className={styles.setup}>
        <strong>Cài lần đầu, dùng lại cho nhiều video.</strong> Skill hướng dẫn AI agent kiểm tra và cài công cụ còn thiếu.
        Cần internet để tải công cụ/model hoặc video từ URL; sau đó có thể chạy hoàn toàn local với file trên máy và LLM local cho bước dịch.
        Tốc độ xử lý tùy cấu hình máy.
      </p>
    </section>
  );
}
