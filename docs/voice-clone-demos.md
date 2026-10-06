# Clone nghe thử miễn phí

- Tài khoản chưa mua gói Voice có 2 lượt clone nghe thử. Lượt bị nhà cung cấp từ chối được hoàn; xóa giọng không hoàn lượt đã thành công.
- Giọng thử thuộc riêng tài khoản, chỉ phát `greeting` và `news` từ `VOICE_CLONE_DEMO_SAMPLES`. Không nhận transcript từ client, không trừ credit và không xuất hiện trong thư viện giọng dùng tạo nội dung hoặc API Workflow.
- Tạo giọng thử khác đánh dấu giọng cũ đã xóa, rồi chờ xóa provider và mẫu audio trước khi tạo provider mới.
- Deadline tính từ lúc giữ chỗ: 19 phút 30 giây, dành 30 giây cho lịch cleanup; UI nói tối đa 20 phút và hiển thị thời gian còn lại. Hết deadline chặn nghe/mua giữ giọng ngay. Provider lỗi được retry, không báo đã dọn khi xóa thất bại.
- `windi_voice_demo_order` gắn giọng cụ thể vào đơn 39.000đ và giới hạn deadline thanh toán. Webhook xác minh đúng tiền mới chuyển cùng provider ID sang slot trả phí. Checkout thông thường cũng giữ giọng demo hiện tại khi còn hạn.
- Gói trả phí đầu tiên có hiệu lực ngay, các kỳ trả phí kế tiếp vẫn xếp sau kỳ đang dùng. Giữ nguyên balance và lịch sử cũ. Giọng đã hết hạn/bị thay thế không được phục hồi bởi webhook đến muộn; thanh toán hợp lệ vẫn mở gói để clone lại.
- Giọng trả phí chỉ có mẫu `paid`: “Chào mừng bạn đến với WindiStudio.”

## Worker trên Supabase

Project: `zpjphixcttehkkgxlmsn`. Function: `voice-demo-cleanup`.

- Edge Secrets: `VOICE_DEMO_PROVIDER_KEY` (cùng tài khoản provider với API clone), `VOICE_DEMO_CLEANUP_TOKEN` (bearer token riêng của worker).
- Vault secret: `windi_voice_demo_cleanup_token`, cùng giá trị với Edge bearer token. Không commit giá trị bí mật.
- Cron `windi-voice-demo-cleanup` chạy mỗi 30 giây. SQL tick chỉ gọi Edge khi có giọng cần dọn.
- Edge kiểm tra bearer token trong code; `verify_jwt=false` vì token worker không phải JWT người dùng. User/anon không được gọi RPC giữ chỗ, dọn tài nguyên, tạo mẫu hay thanh toán.
- Khi đổi tài khoản/key provider ở web, cập nhật key worker tương ứng. Khi đổi bearer token, cập nhật cả Edge Secret và Vault.
- Lease cleanup tránh tranh chấp với thanh toán; callback clone đến muộn đưa provider vào hàng chờ dọn, không làm giọng hết hạn hoạt động lại.

## Trạng thái triển khai

Các migration `20261006080859`, `20261006081447`, `20261006082245`, `20261006084017` đã áp dụng. Giá dùng thử hiện tại là 39.000đ cho đơn mới; các đơn cũ giữ giá đã ghi. Worker/Secrets/Vault/Cron đã cấu hình trên Supabase. Web cần deploy source mới để hiện luồng miễn phí.

Kiểm tra: build và TypeScript thành công; 34 kiểm tra database cô lập cho quota, refund, preview, chặn TTS, ownership, expiry, chuyển trả phí và webhook idempotence. Worker không token trả 401, có token trả 200; cron có lần chạy `succeeded`. Security advisors không có WARN/ERROR liên quan tính năng mới (hai bảng nội bộ có INFO RLS không policy, chủ ý chỉ cho service_role).

Chưa chạy thanh toán tiền thật hoặc tạo/xóa một giọng thật qua provider trong lần triển khai này.
