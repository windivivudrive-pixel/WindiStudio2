# Test report, production candidate 0.3.0

## Layout gate và video tham chiếu — 2026-09-10

- Thêm state `layout_review` giữa `idea_review` và `script_review`.
- Core từ chối script khi layout chưa duyệt và từ chối beat dùng scene ID không
  tồn tại trong layout đã duyệt.
- Layout tham chiếu bắt buộc khai báo analyzer
  `bradautomates/claude-video`, detail `balanced` và evidence directory trong
  project. Upstream MIT dependency được đóng gói từ commit
  `83da59fa78c3eee9e20f515fe75c438bb5166efd` cùng license.
- Unit test workflow/layout, renderer bundle và typecheck đã đạt.
- Chưa chạy cổng thực tế với một video mẫu ở lượt này do chưa có video khách
  cung cấp; release checklist vẫn giữ mục kiểm chứng nhịp, caption và full render.

## Đã tự động hóa

- State machine, approval gate, artifact invalidation và manifest request key.
- Project isolation, scheduler, duplicate request key, resume và file integrity.
- Voice token, idempotency, Cartesia SSE parser và MP3 encoder.
- Windi Voice API đã bắt buộc `add_timestamps: true`, kiểm tra word timestamp
  trước khi hoàn tất job và hoàn credit nếu provider trả payload xác định là
  thiếu/hỏng. Mã kích hoạt Workflow dùng trực tiếp cho Voice API và entitlement
  có ví bonus 20.000 credit riêng; người mua riêng gói Voice vẫn dùng token Voice.
- Pricing 100 suất đầu, payment replay, thiếu/thừa/trễ, device uniqueness và RLS.
- Migration commerce, entitlement, private release, automation token và device
  đã áp dụng lên project WindiStudio `zpjphixcttehkkgxlmsn` ngày 2026-09-10.
- Migration `20260910145158_video_kit_voice_bonus.sql` đã áp dụng và được ghi
  nhận trên production: metadata bonus là 20.000, payment cấp ví bonus, reserve
  trừ đúng ví và refund trả lại đúng ví. Production hiện chưa có entitlement
  Workflow cũ cần backfill.
- Remote verification: product giữ `is_active=false` và `release_ready=false`,
  hai Storage bucket là private, service role đọc được các bảng mới và anon bị
  từ chối đọc entitlement với HTTP 401.
- Root application build/typecheck, Windi Connect tests và Remotion lint.
- Request đọc danh sách giọng Cartesia trả HTTP 200 với key/version backend;
  chưa gọi TTS thật ở lần kiểm tra này để không tiêu quota.
- Installer packaging, bundled runtime và ZIP integrity.

Artifact hiện tại:

- `Windi-Video-Workflow-v0.3.0-beta.zip`
- 170 MB trên filesystem, 162.202.453 bytes dữ liệu ZIP nén.
- SHA-256: `ee8f83da03d0e539fd8b48237527c386e7bba1e2d8003127c7f5d60f4156b625`.

## Chưa phải bằng chứng production

- Chưa chạy đủ create/reference/edit/original-download trên provider thật.
- Live gate ngày 2026-09-10 tạo job Flow `4f21b879-e9e1-4112-9b62-e82f170d9a32`
  nhưng dừng ở `TAB_NOT_OWNED_OR_WRONG_PROVIDER`, chưa submit prompt. Lỗi này đã
  được đổi thành `needs_user_action` với hướng dẫn mở tab và extension giữ tab
  vừa tạo cả trong memory lẫn session storage. Cần cài/reload build mới rồi chạy
  lại cùng job; không tính lần này là provider pass.
- Chưa render và xem/nghe trọn vẹn hai video demo sáu cảnh.
- Chưa clean-install trên máy Apple Silicon mới.
- Chưa upload/publish ZIP vào private release bucket.

Vì vậy bản này là production candidate. Product seed và CTA thanh toán phải giữ
trạng thái khóa cho đến khi hoàn thành release checklist.
