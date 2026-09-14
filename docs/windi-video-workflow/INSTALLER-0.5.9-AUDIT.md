# Kiểm tra ZIP 0.5.9 — 14/09/2026

## Kết luận và sửa sai bản trước

Bản 0.5.8 có lỗi cài đặt: `install.mjs` chứa chú thích kiểu TypeScript không hợp lệ; không chép package.json/package-lock.json trước npm ci; chưa chuẩn bị Python và FFmpeg. Kiểm thử dependency riêng của lần trước không chứng minh installer chạy được. Bản 0.5.9 đã sửa những lỗi này và bổ sung kiểm thử cú pháp toàn bộ script JavaScript.

## Nội dung ZIP

- `Windi Connect Installer.app`: macOS Apple Silicon và Intel, cùng nguồn Windi Connect, extension, skill, source renderer, manifest và lockfile.
- `Cai Windi Windows.cmd`: launcher Windows 10/11 x64.
- `HUONG-DAN.txt`: yêu cầu mạng và giới hạn hỗ trợ.
- Không đóng gói Node, node_modules, Python runtime, browser, staging media hoặc thông tin tài khoản.
- File: `tools/windi-connect/dist/Windi-Video-Workflow-v0.5.9-universal.zip`.
- Kích thước 507145 bytes; SHA-256 `1a66e8e2509e17cba5fffef71da1f17b6d9a792e8fdce57ef563bd4f928da764`.

## Môi trường

Node 24.11.1 được tải từ nodejs.org theo OS/CPU, kiểm SHA-256 đã ghim; cài lại dùng runtime đã có. npm ci dùng lockfile và runtime Node của Windi. Python có sẵn >=3.10 được dùng để tạo venv; nếu không có, uv 0.12.13 có checksum đã ghim tải Python 3.12.12 vào thư mục Windi. Python tải riêng không thêm binary/registry toàn hệ thống. yt-dlp 2026.8.19 cài trong venv. FFmpeg/ffprobe dùng dependency Remotion tương ứng OS/CPU. Remotion tải browser khi render lần đầu.

CLI `windi doctor` kiểm tra tình trạng môi trường thực tế. Các lệnh `windi-python`, `windi-python3`, `windi-ffmpeg`, `windi-ffprobe`, `windi-yt-dlp` dùng môi trường riêng. Voice Windi có timestamps sẵn; imported-audio local Whisper trên macOS vẫn cần Apple command line build tools khi biên dịch lần đầu.

## Windows

Có launcher PowerShell, Node x64, npm dependencies Windows, Python/FFmpeg Windows, lưu token qua DPAPI CurrentUser, registry native messaging theo tài khoản, named pipe và startup theo tài khoản. Không yêu cầu tài khoản quản trị để cài Windi. API ZIP cá nhân đã thêm launcher Windows và chuyển token qua file tài khoản riêng; kiểm thử ZIP API đạt. Website đã triển khai production `dpl_4wBfcBkbQiBwq2mu8q1X3EYrYKYN`, alias `https://windistudio.app` sau khi đăng nhập Vercel thành công.

Chưa chạy trên Windows thật; không coi typecheck hoặc kiểm tra lockfile là bằng chứng Windows hoạt động đầy đủ. macOS Intel cũng chưa được thử trên phần cứng Intel. Bộ cài không tự cài Chrome/Cốc Cốc hoặc đăng nhập thay khách.

## Bằng chứng

- 48 test Windi Connect đạt, typecheck đạt; 2 test API installer đạt; Next.js build đạt.
- Chạy chính `scripts/install.mjs` từ ZIP giải nén với `--prepare-only --target=...`; thử cả Python đã có và `--managed-python` cho nhánh Python thiếu.
- Môi trường mới trả `ready=true`: Node v24.11.1, Python 3.12.12, FFmpeg/ffprobe n7.1, yt-dlp 2026.08.19.
- Daemon chạy bằng runtime trong thư mục mới, kết nối socket riêng và trả doctor. Chưa ghép browser của khách trong thử nghiệm này.
- Render từ môi trường mới xuất MP4 H.264/AAC 1080x1920, sáu frame. Đây là smoke test, không phải video khách hoàn chỉnh hay xác nhận cài GUI/launchd trên một máy sạch.
- ZIP upload private và tải ngược từ Supabase có checksum khớp, giải nén đạt.

## Trạng thái bán

0.5.8 đã bỏ published; 0.5.9 đã published, product giữ `is_active=true` và `release_ready=true`. API ZIP cá nhân trên website đã triển khai launcher của cả macOS và Windows. Windows vẫn là bản thử nghiệm chưa xác nhận trên máy thật. Giá giữ 89.000đ dùng thử / 369.000đ giá gốc. Chưa kiểm thử giao dịch mua thật hoặc tải ZIP bằng tài khoản khách mới.
