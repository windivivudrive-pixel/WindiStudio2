import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { voiceStudioFaqs } from '@/lib/voice/seo';

export function VoiceStudioGuide() {
  return (
    <div className="voice-guide">
      <section aria-labelledby="voice-guide-title">
        <div className="voice-guide-heading">
          <span className="voice-eyebrow">TỪ VĂN BẢN ĐẾN TIẾNG NÓI</span>
          <h2 id="voice-guide-title">Một chất giọng riêng cho mọi câu chuyện.</h2>
          <p>Voice Studio giúp bạn clone giọng nói và tạo giọng AI tiếng Việt ngay trên trình duyệt. Viết lời dẫn, chọn tiếng nói phù hợp và nghe câu chuyện của mình thành tiếng.</p>
        </div>
        <div className="voice-guide-features">
          <article>
            <span className="voice-guide-number" aria-hidden="true">01</span>
            <h3>Clone giọng nói của bạn</h3>
            <p>Từ một bản thu rõ lời, tạo giọng riêng để đọc kịch bản mới. Giữ sự nhất quán cho lời dẫn video, chuỗi podcast hay những câu chuyện mang dấu ấn của bạn.</p>
          </article>
          <article>
            <span className="voice-guide-number" aria-hidden="true">02</span>
            <h3>Voice AI giàu cảm xúc</h3>
            <p>Windi Clone Pro 3.0 đọc ngữ cảnh để điều chỉnh nhịp điệu và sắc thái lời thoại. Nghe các mẫu so sánh phía trên để chọn cách thể hiện phù hợp với nội dung.</p>
          </article>
          <article>
            <span className="voice-guide-number" aria-hidden="true">03</span>
            <h3>Chuyển văn bản thành giọng nói</h3>
            <p>Chọn giọng AI trong thư viện hoặc giọng đã clone, nhập văn bản và điều chỉnh tốc độ đọc. Tải bản ghi MP3 để biên tập video YouTube, TikTok, đọc sách hoặc podcast.</p>
          </article>
        </div>
      </section>

      <section className="voice-guide-workflow" aria-labelledby="voice-guide-workflow-title">
        <div>
          <h2 id="voice-guide-workflow-title">Tạo giọng đọc AI trong 3 bước</h2>
          <a href="#voice-workspace" className="voice-guide-link">Mở phòng thu <ArrowRight size={15} aria-hidden="true" /></a>
        </div>
        <ol>
          <li><strong>Chọn hoặc clone giọng</strong><p>Nghe thử thư viện giọng có sẵn, hoặc đăng nhập và mở mục Tạo giọng của tôi để dùng bản thu của bạn.</p></li>
          <li><strong>Nhập lời thoại</strong><p>Dán nội dung cần đọc, chọn ngôn ngữ và tốc độ. Viết dấu câu rõ ràng để giọng đọc có nhịp tự nhiên.</p></li>
          <li><strong>Nghe và tải MP3</strong><p>Tạo âm thanh, kiểm tra cách phát âm và sắc thái, rồi tải bản ghi để ghép vào nội dung của bạn.</p></li>
        </ol>
      </section>

      <section className="voice-guide-faq" aria-labelledby="voice-faq-title">
        <div className="voice-guide-heading">
          <span className="voice-eyebrow">GIẢI ĐÁP TRƯỚC KHI BẮT ĐẦU</span>
          <h2 id="voice-faq-title">Câu hỏi thường gặp về clone giọng và voice AI</h2>
        </div>
        {voiceStudioFaqs.map(({ question, answer }) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
        <p className="voice-guide-related">Bạn đang làm nội dung bằng giọng AI? Khám phá <Link href="/video-kits">Video Kits để dựng video</Link> và <Link href="/discover">kho công cụ AI hỗ trợ sáng tạo</Link>.</p>
      </section>
    </div>
  );
}
