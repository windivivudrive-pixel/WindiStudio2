# Gemini commerce — biên bản kiểm tra 26/10/2026

## Hoàn tất

- Trang `/gemini`: gói 3 tháng, giá 150.000₫, hướng dẫn 5 bước, điều kiện Google, FAQ, đơn của tôi, QR và tải TXT.
- Trang `/gemini/admin`: kiểm tra admin, nhập hàng loạt link, hạn kích hoạt, bật/tắt mở bán, xem đơn/kho.
- Áp dụng migration `20261026151540_gemini_activation_commerce` qua SQL Editor trong phiên Safari của project WindiStudio; ghi vào `supabase_migrations.schema_migrations`.
- Database live: bốn bảng bật RLS; bốn hàm SECURITY INVOKER, search_path rỗng; anon/authenticated không có quyền đọc bảng hoặc thực thi RPC. Kiểm chứng bằng truy vấn catalog PostgreSQL và HTTP Data API (anon bị 401 ở cả 4 bảng và RPC stock; service role gọi stock 200).
- Trạng thái live sau kiểm tra: giá 150.000₫, enabled=false, kho còn 0 link, không tạo đơn hoặc payment event thử trên production.
- Security Advisor chạy lại: 0 errors, 13 warnings của các đối tượng hiện có như redeem_promo_code, RLS các bảng legacy, bucket cũ và cấu hình Auth; danh sách không có đối tượng windi_gemini. Chưa sửa các đối tượng ngoài phạm vi sản phẩm này.
- `npx tsc --noEmit`: qua.
- `npm run build`: qua; có đủ `/gemini`, `/gemini/admin`, bốn API Gemini.
- `npx vitest run tests/gemini-commerce-postgres.test.ts tests/gemini-commerce-api.test.ts tests/voice-v1-api.test.ts`: **25/25 qua** (14 kiểm thử Gemini + 11 kiểm thử tương thích hiện có).
- `npm run graph:update`: đã cập nhật graph, 6.987 nodes / 15.823 edges.
- UI thật với Supabase live đã kiểm tra trạng thái đóng bán. Màn hình 320, 390, 768, 1024, 1440px không quan sát tràn ngang ở lần đo cuối. Kiểm tra cả Light/Dark; khôi phục lựa chọn theme System.
- UI fixture localhost riêng: nút mua bị khóa trước xác nhận điều kiện; tạo QR; polling tự đổi sang PAID; tải được TXT chứa đúng duy nhất URL giả + xuống dòng. Không chuyển tiền thật; không nhập URL mẫu của người dùng vào kho. Máy chủ fixture đã dừng, file tải giả chuyển vào thư mục QA.

## Giới hạn và việc cần làm trước mở bán

- Chưa commit/push hoặc triển khai web lên production. Supabase đã cập nhật độc lập với bản web local.
- Kho còn rỗng. Cần chủ shop nhập lô link thật chưa dùng, hạn sử dụng thực tế, xác minh điều kiện phân phối/ưu đãi rồi mở bán tại `/gemini/admin`.
- Chưa kiểm chứng một giao dịch chuyển khoản và callback SePay thật cho Gemini; cần thử trước khi quảng bá công khai. SePay phải dùng `/api/payment-webhook` trên bản triển khai mới, không dùng Edge Function thanh toán cũ.
- PGlite là database một kết nối; kiểm thử tuần tự/ràng buộc/khóa không thay thế kiểm thử contention production.
- Chạy toàn bộ test repo ở thời điểm kiểm tra cho 227/229 qua, còn hai ca ở `tests/voice-database.test.ts` (thứ tự ngôn ngữ mẫu) và `tests/workflow-default-access.test.ts` (quyền giọng mặc định). Chạy riêng hai file vẫn tái hiện hai lỗi; các file Voice liên quan đã có thay đổi từ trước tác vụ Gemini và không được sửa trong tác vụ này.

## Bằng chứng

Ảnh lưu tại `artifacts/gemini-qa/`: desktop-light.jpg, desktop-dark.jpg, mobile-light.jpg, supabase-rls.jpg, checkout-qa.jpg, paid-mobile-qa.jpg. Các ảnh có hậu tố QA dùng dữ liệu giả cục bộ.

File `artifacts/gemini-qa/download-qa.txt` là link giả để kiểm tra cấu trúc TXT, không phải sản phẩm và không được bán.
