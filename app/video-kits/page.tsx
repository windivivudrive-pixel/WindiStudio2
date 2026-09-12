import type { Metadata } from "next";
import Link from "next/link";
import { WorkflowHero } from "@/windi/workflow-hero";
import { VideoKitCommerce } from "@/windi/video-kit-commerce";
import { AmbientMotion } from "@/windi/ambient-motion";

export const metadata: Metadata = {
  title: "Windi Video Workflow",
  description:
    "Hệ thống làm video dọc từ ý tưởng, kịch bản, hình, voice đến MP4. Xử lý trên máy Mac của bạn.",
  alternates: { canonical: "/video-kits" },
};
export default function Page() {
  return (
    <div className="page video-kits-page motion-page">
      <nav className="breadcrumbs" aria-label="Đường dẫn">
        <Link href="/">WindiStudio</Link>
        <span>/</span>
        <span>Video Workflow</span>
      </nav>
      <WorkflowHero detail />
      <AmbientMotion />
      <section className="kit-truth-strip">
        <span>1080 × 1920</span>
        <span>Render trên máy Mac</span>
        <span>20K Voice API credit</span>
        <span>Flow hoặc ChatGPT</span>
      </section>
      <section id="kit-layouts" className="kit-layout-showcase">
        <article>
          <div className="kit-layout-paper">
            <span>Ý TƯỞNG</span>
            <strong>
              Giải thích rõ ràng,
              <br />
              nhịp kể nhẹ nhàng.
            </strong>
            <p>Hình và chữ cùng dẫn mắt theo lời đọc.</p>
          </div>
          <h2>paper-editorial</h2>
          <p>Cho kiến thức, storytelling và nội dung cần trình bày sáng rõ.</p>
        </article>
        <article>
          <div className="kit-layout-dark">
            <span>GÓC NHÌN</span>
            <strong>
              Mỗi cảnh phải
              <br />
              có sức nặng.
            </strong>
            <p>Ảnh toàn khung. Typography mạnh. Chuyển động có chủ đích.</p>
          </div>
          <h2>dark-cinematic</h2>
          <p>Cho drama, review và câu chuyện cần không khí điện ảnh.</p>
        </article>
        <article>
          <div className="kit-layout-reference">
            <span>VIDEO MẪU</span>
            <strong>
              Giữ cấu trúc,
              <br />
              làm nội dung của bạn.
            </strong>
            <p>Phân tích hook, nhịp cắt, caption và bố cục theo timestamp.</p>
          </div>
          <h2>reference-layout</h2>
          <p>
            Đưa URL hoặc file video. Windi dùng bộ phân tích mã nguồn mở, tạo
            layout JSON và chờ bạn duyệt trước khi viết kịch bản.
          </p>
        </article>
      </section>
      <section className="kit-requirements">
        <h2>Bạn cần chuẩn bị gì?</h2>
        <div>
          <p>
            <strong>Máy</strong>macOS Apple Silicon, Chrome hoặc Cốc Cốc.
          </p>
          <p>
            <strong>Môi trường</strong>Codex hoặc Antigravity. CLI vẫn dùng được
            ở môi trường khác.
          </p>
          <p>
            <strong>Tài khoản ảnh</strong>Flow hoặc ChatGPT đã đăng nhập và có
            quota riêng.
          </p>
          <p>
            <strong>Voice</strong>Tặng 20.000 credit Windi Voice API, có sẵn
            word timestamp. Có thể mua thêm hoặc nhập file thu âm riêng.
          </p>
          <p>
            <strong>Video mẫu</strong>Python, ffmpeg và yt-dlp được kiểm tra ở
            bước setup. Whisper chỉ dùng khi video không có caption và bạn đồng
            ý cấu hình khóa riêng.
          </p>
        </div>
      </section>
      <div id="kit-purchase"><VideoKitCommerce /></div>
      <section className="kit-honest-note">
        <h2>Không phải “dán một lệnh là xong”.</h2>
        <p>
          Lần đầu bạn cần cài bộ kết nối và đăng nhập provider. Sau đó workflow
          dùng chung cho mọi project, giữ đúng ba cổng duyệt để bạn không tốn
          quota cho một layout hoặc kịch bản chưa chốt.
        </p>
      </section>
      <Link className="text-link" href="/discover">
        ← Trở lại danh mục công cụ
      </Link>
    </div>
  );
}
