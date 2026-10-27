# Gemini 3 / 18 tháng — kiểm tra 27/10/2026

## Thay đổi

- Tông xanh dương Google cho hero, nút, nhãn, đường nét, trạng thái chọn và focus; kiểm tra cả light/dark.
- Hai sản phẩm: 3 tháng 150.000₫ và 18 tháng 49.000₫. Chọn gói cập nhật giá, số tháng, hướng dẫn, FAQ và file minh họa. Đổi gói xóa xác nhận điều kiện cũ.
- Quản trị chọn SKU trước khi nhập kho/bật bán. Chuyển kho xóa danh sách link đang nhập, hạn dùng và xác nhận ưu đãi; dữ liệu đang tải không cho thao tác nhầm.
- Đơn ghi SKU/số tháng/giá và phiên bản điều kiện tại thời điểm tạo. QR, lịch sử và tên TXT dùng dữ liệu đơn; không phụ thuộc gói đang chọn lúc tải lại.

## Supabase thật

Migration `20261027003556_gemini_product_variants.sql` đã áp dụng trên project WindiStudio trong Safari và lưu lịch sử migration. Không seed link mẫu hay tạo đơn/thanh toán thử trên production.

Đã thêm bảng products và ràng buộc tách kho theo SKU, khóa giá/thời hạn, RPC catalog/order/stock/import/settings và tương thích API 3 tháng. Bảng mới bật RLS, hàm SECURITY INVOKER/search_path rỗng; chỉ service role được truy cập.

HTTP Data API: service role đọc catalog được cả hai gói; anon đọc bảng products và gọi catalog đều bị 401. Dữ liệu đơn/link trước migration đều là 0 tại lúc kiểm tra; trong lúc làm việc chủ shop đã thêm link và bật gói 3 tháng qua giao diện cũ. Catalog mới nhận đúng trạng thái đó, chứng minh trigger tương thích hoạt động. Lần đọc cuối: 3 tháng enabled=true, stock=6; 18 tháng enabled=false, stock=0. Số tồn kho là ảnh chụp tại thời điểm kiểm tra, có thể thay đổi.

Không có kiểm thử ngân hàng thật cho gói 18 tháng. Chủ shop cần nhập link 18 tháng thật, xác minh đúng ưu đãi, triển khai web mới và thử callback SePay thật trước khi bán công khai. Không có cam kết Google chấp nhận mọi tài khoản hoặc hoàn khoản xác minh ngay.

## Kiểm thử

- Build production và TypeScript: qua.
- 38/38 kiểm thử liên quan qua trong `gemini-commerce-postgres`, `gemini-commerce-api`, `voice-v1-api`, `video-kit-installer`.
- PostgreSQL/PGlite: giữ đơn PAID cũ sau nâng cấp; 18 tháng dùng 49.000₫; một người giữ riêng hai gói; không lẫn link, giả giá/số tháng, giao trùng hoặc tái bán URL; thừa/thiếu/muộn cần đối soát; expiry không giải phóng nhầm kho; RLS và RPC chặn client roles.
- API: kiểm tra session/owner/admin, SKU/terms tương ứng, lấy giá từ DB, import/toggle đúng gói, tên TXT 18 tháng lấy từ đơn dù URL request gửi product 3 tháng.
- UI fixture localhost riêng: nhập link giả vào kho 18 tháng; chuyển về kho 3 tháng không thấy link đó; tạo QR 18 tháng 49.000₫; polling tự sang PAID và hiển thị đúng gói; consent reset khi đổi SKU. Máy chủ mô phỏng không gọi API ghi của Supabase.
- Responsive storefront: không thấy tràn ngang ở 320px, 390px và 1440px. Ở 320px, scrollWidth=clientWidth=305 (15px scrollbar), hai ô chọn gói nằm trong khung.
- Không chạy lại toàn bộ suite Voice trong đợt này; hai lỗi Voice ngoài Gemini đã được ghi ở báo cáo trước.

Ảnh tại `artifacts/gemini-qa/2026-10-27/`. File có hậu tố QA dùng dữ liệu mô phỏng. Source web và migration chưa commit/push trong tác vụ này; website production còn bản trước cho đến khi triển khai bản mới.
