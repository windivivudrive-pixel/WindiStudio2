# Bản dựng v07 / layout TikTok safe v04

- Tái dùng đúng 13 ảnh người dùng cung cấp tại `assets/windi/1.png` đến `13.png`; không gọi lại Flow hoặc GPT.
- Vùng nội dung chính chừa 180 px bên phải cho các nút TikTok; caption chừa 220 px bên phải và 390 px đáy cho mô tả, hành động và âm thanh gốc.
- Card ảnh, sơ đồ và chú thích có tọa độ riêng; zoom sơ đồ giảm còn 25% để không che nội dung ngoài sơ đồ.
- Bỏ `loadingLag` ở khoảng 2.8 giây và mọi lần dùng hiệu ứng này. `@remotion/sfx` không có asset buzz riêng nên không thêm thay thế ngẫu nhiên.
- Giữ voice 1.15x, caption 3–7 từ bật từng từ và các SFX còn lại ở -8 dB.

