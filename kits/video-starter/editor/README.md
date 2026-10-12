# Windi Timeline — editor cơ bản

Chạy từ thư mục WindiStudio2:

```bash
npm run video:editor -- --project videos/windistudio-repo/ws25-esp32-adblock
```

Mở http://127.0.0.1:4318. Đây là editor local React/Vite, dùng Remotion Player và cùng composition khi xuất; không mua hoặc sao chép Remotion Editor Starter, không thêm thư viện kéo thả. Pointer Events xử lý các gesture.

Giao diện xám than / blue dịu dùng bố cục quen thuộc của trình dựng phim: thư viện bên trái, trình phát ở giữa, thuộc tính bên phải và timeline phía dưới. Thư viện có bốn tab Media, Âm thanh, Phụ đề và Bố cục. Chọn phụ đề để tua đến đoạn cần sửa; chọn file âm thanh để dùng làm nhạc nền. Màu giao diện không đổi nhận diện trong video. Chế độ Vừa khung căn theo cả chiều rộng và chiều cao của vùng preview.

- **Layout:** chọn khối bên trái hoặc trên hình; kéo để di chuyển, kéo góc để resize. Khối cửa sổ giữ tỷ lệ nội dung. Nhập số bên phải để chỉnh chính xác. Phím mũi tên dịch 1 px, Shift dịch 10 px. Áp dụng riêng một cảnh hoặc layout chung; layout riêng được ưu tiên.
- **Cảnh:** chỉnh chữ/màu, ảnh/clip và crop, điểm bắt đầu/kết thúc, hiệu ứng vào cảnh. Kéo biên cảnh trên timeline để đổi điểm cắt; voice và tổng thời lượng cố định.
- **Chọn nhiều trên timeline:** quét chuột từ khoảng trống của track, Shift/⌘/Ctrl-click chọn thêm; kéo phần tử đã chọn để dời cả nhóm. Có nút Chọn tất cả sub và nhập số giây cần dời. Mũi tên dịch 1 frame, Shift dịch 1 giây; Escape bỏ chọn. Giữ khoảng cách, thời lượng và các mốc karaoke; dừng tại phần tử chưa chọn để tránh chồng clip.
- **Phụ đề:** sửa chữ và xem karaoke theo timestamps có sẵn. Nút Vị trí sub trên hình mở layout chung để dời vị trí cả track trên hình. Dời sub trên timeline đổi thời điểm xuất hiện, không đổi lời đọc. Sub vượt mốc Hết video bị cắt/loại khỏi SRT khi xuất; tổng thời lượng video vẫn theo voice.
- **Media cửa sổ:** kéo video/ảnh từ thư viện vào timeline tại thời điểm cần chèn, hoặc thả file từ máy để nhập và đặt clip. Clip có timing riêng, di chuyển/cắt hai đầu/xóa, thay nguồn hình, contain/cover, trim nguồn và âm lượng. Clip video mặc định tắt tiếng để giữ voice. Track chỉ có một clip tại mỗi thời điểm; khi hết clip, preview quay về nội dung cảnh gốc.
- **Căn nội dung:** bật nút Căn nội dung rồi kéo hình bên trong cửa sổ; chỉnh tọa độ % và zoom ở tab Nội dung. Áp dụng riêng cảnh hoặc toàn video, giữ nguyên khung retro. Nội dung gốc và media thay thế dùng cùng phép biến đổi. Mũi tên dịch 1%, Shift dịch 5%; đặt lại để về bố cục ban đầu.
- **Âm thanh:** chọn/nhập nhạc MP3/WAV/M4A/AAC/OGG, cắt đầu file, đặt thời điểm bắt đầu, fade vào/ra, âm lượng voice/nhạc/SFX. Nhạc lặp tới cuối video. Kiểm tra nhạc cần ffprobe.
- **Preview:** Space phát/dừng, mũi tên tiến/lùi từng frame. Zoom preview, kéo thanh ngăn để đổi chiều cao hoặc thu gọn timeline để căn kỹ trên laptop.
- **Lưu:** ⌘/Ctrl+S; ⌘/Ctrl+Z hoàn tác, Shift+⌘/Ctrl+Z làm lại. Draft có revision và lịch sử trên máy; chưa autosave.
- **Xuất:** chỉ nút Xuất video mới khởi động MP4. Kết quả nằm riêng trong `windi/editor-exports`, có snapshot JSON/SRT/cover/QA; cần xem/nghe MP4 để duyệt thành phẩm.

WS25 đã nối sáu khối: thương hiệu, nhãn, tiêu đề, dòng nhấn, cửa sổ nội dung, phụ đề. Adapter hiện giữ clip liên tục từ composition đang dùng, background grid, chuyển động và chữ tự điều chỉnh theo độ dài. Source dựng gốc không bị thay đổi.

Nối tập khác bằng `editor:attach` cho cấu trúc nhận diện được hoặc tạo adapter theo [contract](../../windistudio-repo-video/references/timeline-editor.md). Composition tự do chưa tự biến thành các layer có thể kéo. Bản này chưa có thêm layer tùy ý, keyframe, nhiều video chồng track, reorder narration, undo qua lần tải lại hoặc quản lý nhiều project. Chuyển cảnh là hiệu ứng phủ qua nền tối/quét, chưa phải crossfade chồng clip.

```bash
npm --prefix kits/video-starter run editor:typecheck
npm --prefix kits/video-starter run editor:test
```

Đây là prototype nội bộ, chưa đóng gói thành sản phẩm bán. Trước khi phát hành cần kiểm tra license Remotion/dependencies, installer trên máy sạch, khả năng phục hồi draft và QA MP4 thực tế.
