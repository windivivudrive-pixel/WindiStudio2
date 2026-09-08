# WS02 V2 — RustDesk: chưa xong đã bị đá ra

## Lời đọc

Đang sửa máy cho bố mẹ bằng TeamViewer, chưa xong đã bị đá ra? Đây là lúc bạn nên biết RustDesk.

RustDesk cũng cho phép bạn nhìn và điều khiển máy tính từ xa. Khi cần, bạn có thể dùng máy chủ do mình quản lý, để bớt phụ thuộc vào giới hạn của dịch vụ khác.

Bố mẹ gọi vì máy tính lỗi? Nhập mã kết nối, nhìn thấy màn hình và xử lý ngay, không cần chạy qua tận nơi.

Hoặc file khách hàng nằm trong máy văn phòng: mở RustDesk, vào đúng máy và lấy file dù bạn đang ở ngoài.

Hai máy ưu tiên nối trực tiếp. Nếu mạng chặn, vẫn có đường dự phòng để phiên hỗ trợ tiếp tục.

Máy chủ riêng vẫn cần người cài đặt, cập nhật và trả chi phí máy chạy. Vì vậy, hãy thử RustDesk trước, rồi chỉ tự dựng khi thực sự cần.

Nếu bạn là người cả nhà gọi mỗi khi máy lỗi, hoặc thường xuyên cần vào máy văn phòng, lưu RustDesk lại. Khám phá thêm công cụ hữu dụng tại WindiStudio chấm app.

## Voice và timing

- Cartesia model: `sonic-3.6`
- Voice ID: `de943f91-2f7f-47ca-88db-4a8d1cfc5291`
- Speed: `1.15`
- Scene voice: `hook`, `solution`, `family`, `office`, `route`, `tradeoff`, `cta`
- Total composition: 47.68 giây ở 30 fps
- Caption timing: căn theo transcript Whisper của voice V2; tên riêng được sửa lại theo script

## Hướng dựng đã áp dụng

- Câu chuyện đi theo một trục: TeamViewer bị ngắt → RustDesk → sửa máy cho bố mẹ → lấy file văn phòng → đường dự phòng → giới hạn → CTA.
- Một sân khấu cố định, các thành phần liên quan trượt theo lời đọc; không rung hoặc xoay toàn scene.
- Không dùng vịt/chim pixel. Motion nền đến từ grid, gradient và hai accent nhỏ.
- Watermark giữ một hàng: `WindiStudio - Sử Dụng AI Hiệu Quả`.
- Nhạc nền dùng `public/musicbg.mp3` với volume Remotion `1`.

## Nguồn claim

- https://www.teamviewer.com/en/global/support/knowledge-base/teamviewer-classic/licensing/personal-use/commercial-use-suspected/
- https://rustdesk.com/docs/en/client/
- https://rustdesk.com/docs/en/self-host/rustdesk-server-oss/
- https://rustdesk.com/docs/en/self-host/
