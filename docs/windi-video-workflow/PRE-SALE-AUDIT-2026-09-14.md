# Kiểm tra trước mở bán — 14/09/2026

Trạng thái cập nhật: 0.5.8 có lỗi installer được phát hiện khi kiểm tra lại. Xem `INSTALLER-0.5.9-AUDIT.md` để biết lỗi, bản sửa 0.5.9 và bằng chứng thực tế. Nội dung bên dưới là báo cáo lịch sử của 0.5.8, không phải chứng nhận installer 0.5.8 hoạt động.

## Đã kiểm tra và sửa

- Skill thực sự đi theo bộ cài là `tools/windi-connect/agent-adapters/windi-video-workflow/skills/windi-video-workflow/SKILL.md`. Đã bổ sung giọng văn gần gũi, lợi ích thực tế, title ngắn, số liệu có phạm vi, minh họa sát thoại, hình người khi phù hợp, nhịp cảnh 3–6 giây và ratio bắt buộc. Layout validator nay giữ lại `imageAspectRatio`.
- Voice mặc định: `60cf30cf-dcad-4cb1-b2e9-b6c08a23569e`. Pipeline và lệnh tạo voice trực tiếp có fallback; cấu hình `WINDI_VOICE_ID` được ưu tiên, tương thích cấu hình cũ. Voice mặc định vẫn yêu cầu quyền Workflow/admin ở backend.
- API workflow `/api/v1/voice/generations` dùng SSE, bật `add_timestamps` và `use_normalized_timestamps`, lưu MP3 và word timestamps từ cùng lần tạo. CLI tải timestamp có sẵn. Endpoint web `/api/voice/generate` vẫn dùng MP3 bytes, không trả timestamp; đây không phải đường gọi của workflow.
- Key miễn phí 1–5 có trong cấu hình local (không in giá trị). Pool chọn key ban đầu rồi thử tối đa mỗi key một lần khi nhận HTTP 402/429. Không retry timeout/5xx/stream đã thành công. Main/private clone/default giữ key chính vì quyền sở hữu voice; không dùng vòng key miễn phí cho voice riêng của một tài khoản khác.
- UI công khai, admin, thông báo cấu hình và log clone đổi sang Clone Pro 2.1. Error và metadata thư viện được lọc tên upstream. Identifier/header/URL giao thức chỉ nằm trong server. Build client được quét không có tên upstream.
- Giá UI 89.000đ; giá gốc 369.000đ. Giữ chương trình 100 tài khoản đầu đã có. Migration `20260914053354_video_kit_trial_pricing.sql` cập nhật đúng SKU và cho hàm tạo đơn đọc giá từ sản phẩm; không sửa đơn cũ.
- Bộ cài cũ thiếu `dist/connections.json` và gom media staging. Đã thêm cấu hình, loại dữ liệu lần dựng cũ/cache khỏi đóng gói, giữ runtime dependencies. Renderer hỗ trợ video theo thời gian cảnh được đưa về source bán khách.

## Bằng chứng local

- Web: 31 file kiểm thử, 188 test đạt; build Next.js đạt.
- Windi Connect: 46 test đạt; TypeScript đạt. Test bảo toàn ratio bổ sung cũng đạt.
- Test pool dùng phản hồi giả lập: hết quota, đổi key thành công, hết cả 5 key, timeout không retry, main không chuyển tài khoản.
- Test database PGlite xác nhận giá 89k/369k, slot 100/101, thanh toán idempotent, hoàn credit và RLS. Không tạo giao dịch thật.
- UI đã kiểm tra và xem ảnh ở 390/1440px: `visual-checks/kit-sale/`. Kiểm tra không tạo đơn.
- ZIP phát hành: `tools/windi-connect/dist/Windi-Video-Workflow-v0.5.8-bootstrap.zip`, 565.269 bytes, SHA-256 `5cd77f61b1a3cc63a46fc201ef3ec99ae19c9db851af681e4be48c30fd3b19a0`. ZIP không chứa Node hay `node_modules`; lần cài đầu tải Node 24.11.1 ARM64, kiểm SHA-256 chính thức rồi dùng `npm ci` theo lockfile cho Connect và renderer.
- Quét 30 file văn bản source/scripts/adapter/watch trong bộ cài: không chứa các giá trị secret đã cấu hình local; không có `windi-account.json` hay media của lần dựng trước. Không phải chứng nhận mọi dependency bên thứ ba.
- Runtime Node và renderer từ ZIP giải nén xuất thành công đoạn MP4 30 frame có video demo; bằng chứng `visual-checks/kit-sale/package-render-smoke.mp4`. Đây là smoke test trên máy hiện tại, không thay thế clean-machine test.

## Production release

- Migration `20260914053354_video_kit_trial_pricing.sql` đã áp dụng và được ghi nhận. Giá live là 89.000đ dùng thử và 369.000đ giá gốc.
- Object private `windi-video-workflow/0.5.8/Windi-Video-Workflow-v0.5.8-bootstrap.zip` đã upload vào bucket `windi-releases`; tải ngược từ Storage cho checksum và kiểm tra nén đạt.
- Release `0.5.8` có `is_published=true`; product có `is_active=true` và `release_ready=true`. Không có release hoặc object dở dang trước đó.

## Giới hạn còn biết

- Lần cài đầu cần Internet để tải Node 24.11.1 ARM64 và dependency NPM đã ghim lockfile; không hỗ trợ cài offline. Bootstrap được kiểm thử trong thư mục sạch: cài dependency và Remotion bundle thành công.
- Chưa kiểm chứng cấu hình 5 key trên production, quota còn dùng được của từng key, hay khả năng truy cập voice bằng các key đó. Sự hiện diện key local không chứng minh các điều này.
- Chưa cài trên máy khách macOS Apple Silicon sạch, chưa kiểm thử vòng mua → nhận bộ cài cá nhân → cài → tạo ảnh/voice → render bằng tài khoản khách mới. Bộ cài hiện chỉ hỗ trợ macOS Apple Silicon.
- Chưa chạy giao dịch thanh toán thật; theo dõi đơn mua đầu tiên và cài thử từ máy khách macOS Apple Silicon sạch.
