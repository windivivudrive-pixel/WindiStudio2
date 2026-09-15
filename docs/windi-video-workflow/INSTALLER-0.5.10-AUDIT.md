# Kiểm tra ZIP 0.5.10 — 15/09/2026

## Thay đổi phát hành

- Bộ cài giữ runtime `watch` MIT từ `bradautomates/claude-video` ở commit
  `83da59fa78c3eee9e20f515fe75c438bb5166efd`.
- Khi khách dùng video mẫu để chọn hoặc thay layout, workflow tự kiểm tra runtime;
  nếu thiếu, nó khôi phục bản đã ghim rồi tạo bằng chứng frame/transcript và trình
  layout mới để duyệt. Video mẫu được yêu cầu làm layout không còn bị ghi đè bởi
  layout mặc định cũ.

## Artifact và Supabase

- File: `tools/windi-connect/dist/Windi-Video-Workflow-v0.5.10-universal.zip`.
- Kích thước: 596.392 bytes.
- SHA-256: `d7c7c35aec60498fe669f4c309b764af7f4884ed30bb8bbfdd160599038fb7a9`.
- Object private: `windi-releases/windi-video-workflow/0.5.10/Windi-Video-Workflow-v0.5.10-universal-rev2.zip`.
- Release `0.5.10` đã published lúc `2026-09-15T04:05:59Z`; product vẫn
  `is_active=true` và `release_ready=true`.

## Kiểm chứng

- Đã build extension, package installer và release ZIP từ source 0.5.10.
- ZIP chứa workflow skill, extension `Windi Connect Extension` ở cấp ngoài cùng,
  HUONG-DAN 3 bước, và bốn file runtime cần thiết của analyzer (`LICENSE`,
  `SKILL.md`, `scripts/setup.py`, `scripts/watch.py`).
- Storage và row `product_releases` đã được đọc lại sau publish; tải ngược object
  cho SHA-256 `d7c7c35aec60498fe669f4c309b764af7f4884ed30bb8bbfdd160599038fb7a9`.
