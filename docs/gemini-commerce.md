# Bán link Gemini — 3 và 18 tháng

| Sản phẩm | SKU | Giá mỗi link | Phiên bản điều kiện |
| --- | --- | --- | --- |
| Gemini 3 tháng | `gemini-3m` | 150.000₫ | `gemini-3m-2026-10-26` |
| Gemini 18 tháng | `gemini-18m` | 49.000₫ | `gemini-18m-2026-10-27` |

Trang bán `/gemini` dùng tông xanh dương, cho khách chọn một trong hai sản phẩm. Khách nhận file TXT chứa đúng một link Google One để tự kích hoạt trên Google cá nhân đủ điều kiện. Không cấp tài khoản, không thu mật khẩu/thẻ/OTP của khách.

## Chuẩn bị và mở bán

1. Áp dụng migration nền `20261026151540_gemini_activation_commerce.sql`, sau đó `20261027003556_gemini_product_variants.sql` trên đúng project WindiStudio. Không đẩy mù toàn bộ lịch sử migration của repo. Migration thứ hai giữ đơn/link cũ ở gói 3 tháng, thêm gói 18 tháng ở trạng thái tắt.
2. Triển khai web chứa bộ chọn sản phẩm và các API mới. Web cũ vẫn dùng được gói 3 tháng qua RPC tương thích trong thời gian chuyển tiếp.
3. Cấu hình backend hiện có: `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SEPAY_API_KEY`, `VOICE_BANK_BIN`, `VOICE_BANK_ACCOUNT`, `VOICE_BANK_NAME`. Không đưa secret vào `NEXT_PUBLIC_`.
4. SePay trỏ đến `https://<domain>/api/payment-webhook`, xác thực `Authorization: Apikey <SEPAY_API_KEY>`, đúng tài khoản `VOICE_BANK_ACCOUNT`. Cả hai gói dùng mã `WINDI Gxxxxxxxx`. Không dùng Edge Function payment-webhook cũ.
5. Quản trị ở `/gemini/admin`, dùng danh sách admin server kiểm soát `public.windi_voice_admins`. Chọn **đúng gói 3 hoặc 18 tháng** trước khi nhập link. Mỗi dòng một link `https://one.google.com/offer/<code>` chưa dùng, tối đa 500 link/lần. Nhập hạn kích hoạt thực tế của lô link.
6. Link đã có trong bất kỳ kho nào đều bị bỏ qua khi nhập trùng; không đưa link đã bán, đã dùng hoặc link mẫu vào kho. Không đổi phân loại của link đã giữ/giao.
7. Kiểm chứng thời hạn ưu đãi đúng gói, điều kiện tài khoản, giá 0₫ trên Google và quyền phân phối lô link. Mỗi gói có công tắc mở bán độc lập. Kho trống không bật bán được.
8. Thử chuyển khoản và callback SePay **thật cho từng mức giá** trước khi quảng bá. Kiểm tra PAID, đúng TXT/link, tải lại và chặn tài khoản khác tải đơn đó.

URL mẫu người dùng gửi không được seed vào source/kho. Dạng URL không chứng minh ưu đãi còn hạn hoặc là gói 18 tháng; chủ shop phải xác minh đúng nội dung lô hàng.

## Dữ liệu Supabase

- `windi_gemini_products`: SKU, tên gói, số tháng, giá cố định, công tắc mở bán.
- `windi_gemini_settings`: cấu hình 3 tháng tương thích web cũ; trigger đồng bộ sang products. RPC cấu hình mới đồng bộ ngược cho gói 3 tháng.
- `windi_gemini_links`: URL riêng tư, SKU, hạn kích hoạt, trạng thái khóa; URL unique toàn bộ hai kho.
- `windi_gemini_orders`: chủ đơn, SKU, số tháng và giá snapshot, link giữ riêng, mã chuyển khoản, hạn QR, trạng thái, thời gian thanh toán, phiên bản điều kiện.
- `windi_gemini_payment_events`: ID SePay unique, mã đơn, số tiền, thời điểm chuyển, kết quả. Không lưu toàn bộ payload ngân hàng không cần thiết.

Cả năm bảng bật RLS và thu hồi quyền `PUBLIC`, `anon`, `authenticated`; chỉ backend service role truy cập. RPC SECURITY INVOKER, search_path rỗng, chỉ service role thực thi. API xác minh user bằng `auth.getUser()` và kiểm tra admin bằng bảng membership, không tin user_metadata.

Ràng buộc database khóa giá/số tháng đúng SKU: 3 tháng = 150.000₫; 18 tháng = 49.000₫. Foreign key `(activation_id, product_sku)` ngăn đơn lấy link sai kho; unique activation_id ngăn giao trùng. Index phục vụ tra cứu người mua, sản phẩm và đơn gần nhất.

## API và giao hàng

- `GET /api/gemini/account`: catalog hai gói và 30 đơn gần nhất của user. Catalog công khai qua backend chỉ có tên/giá/số lượng; không có URL hoặc inventory ID.
- `POST /api/gemini/order`: `{product: "gemini-18m", termsVersion: "gemini-18m-2026-10-27"}`. Backend lấy user từ session, giá từ database, bỏ qua giá/user client gửi. Thiếu product mặc định 3 tháng để tương thích.
- `GET /api/gemini/download?order=<id>`: kiểm tra ID, chủ sở hữu và PAID. Tên file lấy từ đơn: `Gemini-18-thang-<id>.txt` hoặc `Gemini-3-thang-<id>.txt`; nội dung chỉ URL + xuống dòng, `private, no-store`, `nosniff`.
- `GET /api/gemini/admin?product=gemini-18m`: lọc đơn/kho theo SKU; vẫn trả catalog để chọn gói.
- `POST /api/gemini/admin`: action `import` hoặc `settings`, luôn kèm `product` đang quản lý.

Giữ một link trong 5 phút. Một user có thể giữ đơn riêng cho mỗi SKU; tạo lại đơn cùng SKU trả về đơn PENDING còn hạn. Khóa transaction chung tuần tự hóa giữ hàng, nhập, trả hàng và thanh toán. `pg_cron` chạy stock RPC mỗi 30 giây để đánh dấu đơn chờ đã quá hạn và trả link về kho; các lần đọc tồn kho và tạo đơn cũng dọn đơn quá hạn ngay trong transaction.

Hết hạn chưa thanh toán giải phóng đúng link; PAID và đơn đối soát giữ nguyên link. Link hết hạn hoặc còn dưới 10 phút không dùng cho đơn mới. Tắt một gói chặn đơn mới của gói đó; đơn đã tạo còn hạn và quyền tải đã mua vẫn hoạt động.

Webhook chỉ PAID khi tiền vào, đúng ngân hàng/mã, đúng số tiền snapshot của đơn, đúng hạn QR và link còn hiệu lực. Callback lặp không giao lần hai; ID giao dịch của đơn khác bị bỏ qua. Không cộng nhiều lần chuyển tiền. Chuyển thiếu/thừa, cũ/muộn hoặc link lỗi chuyển đối soát. Khoản chuyển thêm cho đơn PAID không thu hồi quyền tải đã giao.

## Ngoại lệ và nội dung Google

Đối soát `UNDERPAID`, `OVERPAID`, `REVIEW_REQUIRED` bằng giao dịch ngân hàng thật trước khi hỗ trợ. Không đổi PAID từ trình duyệt hoặc gửi callback giả lên production. Hoàn tiền/đổi link cần xử lý thủ công, không reset đơn hay xóa link đã giao để bán lại.

Trang hướng dẫn tự đổi giá và số tháng theo sản phẩm: QR → TXT → copy link → nhận đúng ưu đãi → thêm phương thức thanh toán → chỉ xác nhận khi Google hiện 0₫. Chuẩn bị thẻ quốc tế hoặc MoMo có số dư 30.000₫; MoMo tùy Google hiển thị. Số tiền xác minh thực tế và thời gian giải tỏa/hoàn lại tùy Google/ngân hàng, không hứa hoàn ngay. Nhắc khách kiểm tra ngày gia hạn trên Google.

Nguồn chính thức: [Google One dùng thử](https://support.google.com/googleone/answer/9155746?hl=vi), [phương thức thanh toán Việt Nam](https://support.google.com/googleplay/answer/2651410?co=GENIE.CountryCode%3DVN&hl=vi), [khoản xác minh và hoàn lại](https://support.google.com/googlepay/answer/12651770?hl=vi).

## Kiểm chứng

```sh
npx vitest run tests/gemini-commerce-postgres.test.ts tests/gemini-commerce-api.test.ts tests/voice-v1-api.test.ts tests/video-kit-installer.test.ts
npx tsc --noEmit
npm run build
npm run graph:update
```

PGlite kiểm tra nâng cấp bảo toàn đơn PAID cũ, tách SKU/kho, khóa giá/thời hạn, callback, expiry, RLS và API ownership/admin. PGlite một kết nối không thay thế kiểm thử contention hoặc giao dịch thật trên production.
