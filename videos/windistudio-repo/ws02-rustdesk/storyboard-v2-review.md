# WS02 V2 — Storyboard dựng lại

Mục tiêu: một câu chuyện liên tục theo nhịp **bị ngắt → thấy giải pháp → thấy hai ứng dụng → hiểu máy chủ riêng → biết giới hạn → lưu lại**.

## Bố cục cố định

- Watermark một hàng ở trên: `WindiStudio - Sử Dụng AI Hiệu Quả`.
- Một sân khấu chính rộng khoảng 850 px, nằm giữa màn hình. Không rung hoặc xoay cả cụm nội dung.
- Progress bar mảnh ở trên. Bỏ dòng `01 / 07`, footer dài và các tiêu đề lớn lặp lại ở mỗi cảnh.
- Caption 1–2 dòng ở vùng dưới, nền tối gọn thay cho ô kem lớn.
- Grid và bóng gradient tiếp tục loop nhẹ. Chỉ icon, sticky note và chim pixel được lơ lửng 2–4 px.

## Nhịp cảnh dự kiến

| Thời gian | Lời/ý chính | Hình chính | Chuyển động theo lời |
|---|---|---|---|
| 0–5s | “TeamViewer… chưa xong đã bị đá ra?” | Một cửa sổ remote đang thao tác; cảnh báo `PHIÊN BỊ NGẮT` rơi xuống giữa màn hình | Cursor đang chạy thì dừng; cảnh báo nảy một lần. Không rung toàn màn hình |
| 5–11s | “Đây là lúc… RustDesk” | Thẻ đỏ `BỊ NGẮT GIỮA CHỪNG` thu gọn lên trên; thẻ RustDesk màu teal trượt lên ngay bên dưới | Dựng chồng hai thẻ để tạo so sánh trực tiếp như video mẫu |
| 11–22s | “Bố mẹ gọi vì máy lỗi…” | Bố/mẹ và bạn ở hai cửa sổ ngang hàng; giữa là ô nhập mã kết nối | Khi đọc “nhập mã”, số được gõ; khi đọc “nhìn thấy màn hình”, desktop bên kia mở ra |
| 22–30s | “File khách hàng nằm trong máy văn phòng” | Sân khấu trượt ngang sang máy văn phòng và laptop; một folder thật đi từ màn hình trái sang phải | Camera chỉ pan ngang; đường truyền thẳng, không dùng đường cong trang trí |
| 30–36s | “Máy chủ riêng… đường dự phòng” | Máy chủ nhỏ xuất hiện giữa hai máy; đường trực tiếp sáng trước, sau đó đường dự phòng vòng phía dưới | Chỉ đường đang được nhắc mới sáng; nhãn kỹ thuật `hbbs/hbbr` rất nhỏ |
| 36–43s | “Cần người cài đặt…” | Một sticky note duy nhất: `CÀI ĐẶT · CẬP NHẬT · CHI PHÍ MÁY CHẠY`; bên dưới là pill `DÙNG THỬ TRƯỚC → TỰ DỰNG SAU` | Ba từ hiện lần lượt, pill trượt vào để trả lời nỗi lo |
| 43–49s | “Lưu RustDesk lại…” | RustDesk ở giữa, hai use-case nhỏ và `windistudio.app`; chim pixel đáp xuống cạnh CTA | CTA scale nhẹ một lần rồi đứng yên đủ lâu để đọc |

## Quy tắc animation

- Mỗi chuyển cảnh dùng slide 8–10 frame cùng một hướng, không hard cut giữa bảy layout độc lập.
- Mọi animation bám từ khóa trong voice: `bị đá ra`, `RustDesk`, `nhập mã`, `lấy file`, `đường dự phòng`, `tự dựng sau`.
- Bỏ chuyển động `translate + rotate` áp lên toàn scene. Điều này là nguyên nhân làm text, khung và đường nối trông lệch.
- Mỗi thời điểm chỉ có một hành động chính. Các thành phần đã xuất hiện đứng yên để người xem kịp hiểu.
- SFX chỉ dùng cho cảnh báo, nhập mã, folder tới nơi và CTA. Không thêm pop cho mọi card.

## Thứ sẽ bỏ khỏi bản cũ

- Hook “file ở máy văn phòng” và sơ đồ đường cong `LẤY TỪ XA`.
- Cảnh ba ứng dụng xếp thành ba card giống danh sách tính năng.
- Tiêu đề 76 px lặp lại ở mọi cảnh.
- Footer `WINDISTUDIO / AI TOOLBOX`, bộ đếm `07 / 07` và nhiều lớp viền cạnh tranh nhau.
- Cảnh cài đặt ba bước quá sớm; phần này chỉ còn một lựa chọn `Dùng thử trước → tự dựng sau`.

