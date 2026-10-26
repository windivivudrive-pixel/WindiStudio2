# Bán link Gemini 3 tháng

- Trang bán: `/gemini`.
- Quản trị: `/gemini/admin`, chỉ tài khoản có trong `public.windi_voice_admins` được truy cập (dùng cùng danh sách quản trị hiện có của WindiStudio).
- Giá: **150.000₫ / link**, cố định ở cả database và ứng dụng.
- Sản phẩm: link ưu đãi Google One để khách tự kích hoạt trên Google cá nhân đủ điều kiện. Không cấp tài khoản hay thu mật khẩu/thẻ/OTP của khách.

## Chuẩn bị và mở bán

1. Áp dụng riêng migration `supabase/migrations/20261026151540_gemini_activation_commerce.sql` vào đúng project WindiStudio. Không chạy toàn bộ migration chưa đồng bộ lên production một cách mù quáng. Migration chỉ thêm bốn bảng và bốn hàm, mặc định **tắt mở bán, kho rỗng**.
2. Triển khai phiên bản web chứa các route `/api/gemini/*` và phần mở rộng webhook mới.
3. Giữ cấu hình server hiện có: `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SEPAY_API_KEY`, `VOICE_BANK_BIN`, `VOICE_BANK_ACCOUNT`, `VOICE_BANK_NAME`. Không dùng service key ở frontend hoặc thêm tiền tố `NEXT_PUBLIC_` cho secret.
4. Webhook SePay phải trỏ tới `https://<domain>/api/payment-webhook`, xác thực `Authorization: Apikey <SEPAY_API_KEY>`, tài khoản nhận trùng `VOICE_BANK_ACCOUNT`. Route dùng chung cho Voice, Kits và Gemini; mã Gemini dạng `WINDI Gxxxxxxxx`. Không dùng Edge Function `supabase/functions/payment-webhook` cũ cho đơn Gemini.
5. Vào `/gemini/admin`, dán danh sách **link thật chưa dùng**, mỗi dòng một link. Nhập hạn kích hoạt thực tế của lô link (giờ địa phương trên máy). Chỉ chấp nhận `https://one.google.com/offer/<code>`, không query string, không domain khác; tối đa 500 link/lần. Link trùng không bao giờ được đưa lại vào kho kể cả đã bán.
6. Kiểm chứng điều kiện chương trình, thời lượng 3 tháng, giá ưu đãi 0₫ và quyền phân phối trước khi bật mở bán. Không nhập link đã sử dụng để kiểm tra kích hoạt vào kho.
7. Làm một giao dịch thật với SePay trước khi quảng bá rộng. Kiểm tra callback ngân hàng thật, đơn PAID, tải TXT chỉ có một link, tải lại vẫn đúng link, và khách khác không tải được đơn đó.

Link ví dụ người dùng cung cấp không được seed vào kho hoặc source. Bản thân định dạng URL không chứng minh ưu đãi còn hạn hay tài khoản đủ điều kiện.

## Dữ liệu và bảo mật

- `windi_gemini_settings`: một dòng giá và công tắc mở bán.
- `windi_gemini_links`: kho URL riêng tư, hạn dùng, cờ khóa.
- `windi_gemini_orders`: chủ đơn, link giữ riêng, mã chuyển khoản, số tiền, hạn QR, trạng thái, thời điểm thanh toán và phiên bản điều kiện được xác nhận.
- `windi_gemini_payment_events`: ID giao dịch SePay duy nhất, đơn, số tiền, thời gian, kết quả đối soát. Không lưu toàn bộ payload thông tin ngân hàng không cần thiết.

Cả bốn bảng bật RLS, thu hồi quyền `PUBLIC`, `anon`, `authenticated`; chỉ backend service role được đọc/ghi. Cả bốn RPC là `SECURITY INVOKER`, search_path rỗng, chỉ service role được gọi. API xác minh user bằng `auth.getUser()`; không dùng user_metadata để phân quyền. API quản trị dùng danh sách admin lưu trong database.

Không trả activation URL hoặc inventory ID qua API checkout/account. Route TXT kiểm tra đồng thời ID đơn, chủ sở hữu và PAID; response có `private, no-store`, `nosniff` và tải file `.txt` chứa duy nhất URL + xuống dòng. Các truy vấn database qua service role luôn kiểm tra quyền ở backend trước.

## Quy tắc giao hàng

Tạo đơn giữ một link hợp lệ trong 10 phút; mỗi tài khoản tái sử dụng đơn PENDING chưa hết hạn. Khóa transaction ở database tuần tự hóa thao tác giữ hàng/nhập kho/thanh toán/giải phóng, ràng buộc unique ngăn hai đơn giữ cùng link.

Link hết hạn hoặc sắp hết hạn trong 10 phút không bán cho đơn mới. API stock giải phóng link của đơn PENDING hết hạn trước khi đếm kho/tạo đơn. Đơn PAID và đơn cần đối soát giữ link, không tự đưa lại vào kho.

Chỉ xác nhận PAID khi webhook hợp lệ, đúng ngân hàng nhận, tiền vào, đúng mã, **đúng 150.000₫**, thời điểm chuyển khoản thuộc hạn QR và link còn hiệu lực. Chuyển thiếu/thừa tiền, timestamp cũ, callback đến khi đơn đã hết hạn hoặc đã giải phóng link đều không giao tự động. Không cộng dồn nhiều lần chuyển. Giao dịch trùng ID không giao lần hai; ID đã dùng ở đơn khác bị bỏ qua.

Nếu khách chuyển lần hai cho đơn PAID, giữ nguyên quyền tải và ghi event cần đối soát cho khoản tiền phát sinh. Không thu hồi file đã giao.

Tắt mở bán chặn đơn mới; webhook và tải lại của đơn đã thanh toán vẫn hoạt động. Đơn đã tạo còn hạn vẫn được xử lý.

## Đối soát ngoại lệ

Trang quản trị hiển thị 100 đơn và 100 mã kho mới nhất, không hiển thị activation URL. Tra cứu toàn bộ dữ liệu trong Supabase nếu cần.

- `UNDERPAID`, `OVERPAID`, `REVIEW_REQUIRED`: kiểm tra giao dịch thật tại ngân hàng/SePay bằng payment_code và event trước khi hỗ trợ khách. Không đổi PAID từ trình duyệt hay dùng callback giả trên production.
- `EXPIRED`: nếu khách đã chuyển, kiểm tra trước khi yêu cầu tạo đơn khác. Kho đã có thể cấp link đó cho đơn mới; không giao link từ đơn cũ.
- Hoàn tiền và đổi link cần đối soát thủ công; chưa có nút hoàn tiền hoặc cấp lại tự động. Không reset trạng thái hay xóa đơn đã giao để tái bán link.
- Cần ngừng bán một link lỗi: đặt `disabled=true` trên dòng link trong Supabase. Nếu đã giữ cho một đơn, liên hệ khách/đối soát; callback không giao link bị khóa.
- Google từ chối ưu đãi: khách gửi mã đơn và ảnh thông báo đã che thông tin nhạy cảm; kiểm tra điều kiện tài khoản và lô link. Không cam kết mọi tài khoản đều dùng được.

## Nội dung hướng dẫn Google

Trang có đủ 5 bước: thanh toán QR → tải TXT/copy link vào trình duyệt → kích hoạt gói → thêm phương thức xác thực → xác nhận chỉ khi hiển thị 0₫. 30.000₫ là số dư đề xuất; không cam kết mức giữ tiền cố định. MoMo/ZaloPay tùy phương thức Google hiển thị, không đảm bảo cho mọi checkout web.

Nguồn chính thức:
- https://support.google.com/googleone/answer/9155746?hl=vi
- https://support.google.com/googleone/answer/16476811?hl=vi
- https://support.google.com/googleplay/answer/2651410?co=GENIE.CountryCode%3DVN&hl=vi
- https://one.google.com/offer/terms-and-conditions/3-month-unbranded-AIP-2024

## Kiểm thử

```sh
npx vitest run tests/gemini-commerce-postgres.test.ts tests/gemini-commerce-api.test.ts tests/voice-v1-api.test.ts
npx tsc --noEmit
npm run build
npm run graph:update
```

PGlite kiểm chứng SQL, quyền, cấp hàng, idempotency và rollback. Đây là PostgreSQL một kết nối, không chứng minh contention thực tế giữa nhiều process production. Cần test giao dịch/callback thật trước khi gọi thanh toán hoàn toàn đã được kiểm chứng.
