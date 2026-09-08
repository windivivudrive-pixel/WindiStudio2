# Kiểm chứng — 2026-09-06

- `npm test`: 16 files, 92 tests passed; gồm 22 tests mới cho Voice Studio.
- `npm run build`: thành công, TypeScript thành công; trang `/voice-studio` và 7 nhóm API có trong route manifest.
- Supabase project `zpjphixcttehkkgxlmsn`: migration áp dụng thành công; truy vấn xác nhận đúng giá/hạn mức 69.000/30.000/1, 269.000/150.000/5, 999.000/600.000/20.
- 6 bảng Voice Studio bật RLS; tài khoản `authenticated` không có quyền chạy hàm cấp gói `windi_voice_pay`; storage `windi-voice-audio` private.
- Security advisor: không có cảnh báo gắn với các bảng/hàm Voice Studio mới. Các cảnh báo cũ về `redeem_promo_code`, cấu hình Auth và bảng editorial nằm ngoài phạm vi thay đổi.
- API trực tiếp trên bản build: thư viện trả 200 với 5 giọng đã được tài liệu Cartesia công bố và `available=false`; account/audio trả 401 khi chưa đăng nhập.
- Trình duyệt: mở bảng giá và xác nhận cả ba gói; tìm Daniel được đúng 1 kết quả, chọn giọng đưa về editor; bấm mẫu Kể chuyện điền 193 ký tự và hiển thị 193 credit.
- Mobile 390×844: kiểm tra ảnh chụp phần editor/clone, input tải file và consent; document width = scroll width = 390. Các tab cuộn ngang bên trong vùng tab, không làm toàn trang tràn ngang. Đã trả viewport về kích thước mặc định.
- Kiểm tra lịch sử chưa có bản ghi, thông báo chưa kết nối, nút tạo giọng bị khóa khi chưa đăng nhập/chưa có provider.

Chưa kiểm thử trực tiếp TTS/clone/thu tiền vì môi trường chưa có khóa Cartesia và cấu hình thanh toán Voice Studio. Test provider/storage/payment là mock trong tests; kiểm tra SQL chạy trên PGlite. Không tạo đơn khách, không chuyển tiền, không sử dụng credit Cartesia thật. Frontend chưa deploy production; preview cục bộ tại http://127.0.0.1:3020/voice-studio.
