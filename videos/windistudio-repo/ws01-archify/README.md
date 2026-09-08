# WS01 — Archify

Video dọc WindiStudio, dựng từ idea WS01 được người dùng duyệt.

- `final.mp4`: bản xuất 1080×1920 / 30fps.
- `cover.png`: ảnh bìa không phụ đề.
- `script.md`, `captions.srt`, `post-caption.md`: nội dung và phụ đề.
- `public/workflow.html`, `public/workflow-revised.html`: demo Archify thực tế, có thể mở độc lập.
- `evidence/`: nguồn, receipts, transcript và QA.

Chỉnh sửa video bằng `npm install` rồi `npm run dev`. Render bằng `npx remotion render WS01 final.mp4`. Gói Remotion pin ở 4.0.521; cấu hình render dùng Chrome cài trên macOS. Không cần gọi lại TTS khi chỉ sửa hình. Script voice đọc cấu hình Cartesia ở web workspace cha, không chứa key; chỉ chạy lại nếu chủ đích thay lời đọc.

Nội dung sơ đồ là tiếng Việt; các nút của viewer Archify mặc định tiếng Anh. Website live đang là landing cũ, vì vậy CTA chỉ mời khám phá WindiStudio, không hứa có bài hướng dẫn Archify.
