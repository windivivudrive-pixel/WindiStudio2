# Phạm vi Git dành cho website

`.gitignore` dùng danh sách cho phép ở thư mục gốc. Git giữ website Next.js (`app`, `windi`, `lib`, `public`), dữ liệu catalog, Supabase/migrations, kiểm thử và script/tài liệu vận hành web, cấu hình build/deploy và `.env.example` đã làm sạch.

Ngoại lệ cần giữ: `kits/qr-payment` là mã nguồn chung được `lib/payments/sepay.ts` import trực tiếp. Không loại module này khi đưa website lên Git.

Các app desktop, source Vite cũ, công cụ cục bộ, agent skills, project/video/render, ảnh QA, artifacts, scratch và bản build không được đưa lên Git. Các file này vẫn ở trên máy nếu trước đó còn tồn tại. Thư mục `app/tool/extension` chứa source công cụ cũ; sản phẩm trả phí của website được cấp từ ZIP riêng trong Supabase Storage.

Tài nguyên website trong `public/` được giữ, gồm audio mẫu Voice Studio và hình/âm thanh landing Soundbooki. Không ignore toàn bộ MP3/video một cách toàn cục vì có thể làm mất media đang được trang web sử dụng.

Kiểm thử `video-kit-installer.test.ts` xác minh ZIP phát hành, token, checksum và vị trí file kết nối từ phía API web; không đọc source `tools/windi-connect` nằm ngoài phạm vi repository website.

`.vercelignore` cũng loại các thư mục cục bộ khi triển khai bằng Vercel CLI. Module QR/SePay vẫn được gửi để build webhook.

Đối với file đã được theo dõi từ trước, thêm ignore chưa đủ: bỏ khỏi index bằng `git rm --cached` để lần commit tiếp theo chỉ còn phạm vi web. Đây là bỏ theo dõi, không xóa file trên ổ đĩa và không xóa nội dung khỏi lịch sử Git đã có. Không dùng `git clean` để áp dụng cấu hình này.

Muốn thêm một thư mục hoặc cấu hình mới ngoài danh sách, thêm quy tắc `!/<path>/` hoặc `!/<file>` tương ứng rồi kiểm tra bằng `git check-ignore -v --no-index <path>` trước khi commit.
