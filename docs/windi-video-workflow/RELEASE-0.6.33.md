# Windi Video Workflow 0.6.33

Đã phát hành ngày 03/10/2026 (giờ Việt Nam).

Web production: https://windistudio.app
Deployment: `dpl_BFoseSeUbK177r5SXMAKB6vx27FS` — READY, đã gắn domain production.

Bản ZIP 0.6.33 được chọn bởi selector phiên bản hiện tại trên web. Release ID: `40261a23-ba73-4da6-ba7b-4105d2dce755`.

SHA-256: `50398834d1ff1b30f1235a7f8cf6d122dd503f63756690046b7f7ad64ed59817`.
Kích thước: 735.047 byte. Tải qua URL ký trả 200, khớp checksum và kích thước.

## Hành vi đã xác minh

- Web và API workflow dùng chung luồng tạo audio + timestamp; cờ timing luôn bật ở server.
- Một request thật trên production cố tình gửi tắt hai cờ timing vẫn trả job ready, MP3 và 10 word timestamp.
- Hàm tạo phụ đề trong gói ZIP 0.6.33 chuyển timing đó thành 10 caption hợp lệ; không chạy nhận dạng giọng nói lại.
- Trang Voice và Workflow trả 200. Quét HTML và 16 JS chunk phục vụ trực tiếp không thấy tên backend/model bị lộ. Trang Voice dùng Windi Clone Pro 2.1.
- Route `/api/voice/timestamps` đã hoạt động trên production và trả 401 cho request chưa đăng nhập.
- ZIP CRC, 80 đối chiếu source, tất cả phiên bản nhúng và kiểm tra file không được đóng gói đều đạt.
- Chuẩn bị cài đặt từ chính ZIP trong thư mục tạm độc lập thành công.
- Build production/typecheck thành công; 51 test giọng/API và 126 test Windi Connect đạt.

## Phạm vi

Không gọi nút tải bộ cài cá nhân qua một phiên đăng nhập web trong lần kiểm tra này; đã xác minh tải ZIP ký và selector đang dùng bởi endpoint web. Không tạo ảnh mới qua Flow/ChatGPT/Grok vì bản phát hành này chỉ thay đổi giọng/timing. Bộ test web tổng còn một lỗi tra cứu bài News ngoài phạm vi thay đổi.

Máy đã cài bản cũ cần tải và cài bộ 0.6.33 để nhận mã workflow và hướng dẫn mới.
