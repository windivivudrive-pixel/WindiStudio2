# Windi / Cut — local OpenCut prototype

Desktop editor tại http://127.0.0.1:4320/windi. Đây là bản thử độc lập,
không thay web WindiStudio, editor Remotion cũ hoặc workflow bán trên web.

## Khởi động trên workspace đã cài

```sh
npm run video:cut:prepare
npm run video:cut
```

Giao diện dùng dark mode xanh navy pha xám với điểm nhấn xanh Windi. Chuẩn bị chỉ
sao chép media/font và tạo manifest đối tượng; không render.
Chọn **Mở WS25 nhiều layer** để mở bản dựng native, hoặc **Mẫu QA 3 giây**
để thử ngắn. Những lần mở tiếp dùng draft đã lưu trong trình duyệt, không
import đè. Đổi source rồi chạy prepare không tự sửa draft cũ.

Chọn layer ở cột trái hoặc clip trên timeline → dùng inspector bên phải
để chỉnh nội dung, font, màu, position, scale, rotation, opacity, keyframe.
Có thể thêm chữ/khung/media và import asset bằng chức năng native OpenCut.
`+ Media` thêm media có sẵn đầu tiên; dùng Import trước nếu bản dựng trống.
Font size hiện dùng đơn vị native OpenCut, không phải pixel canvas.

Draft tự lưu vào IndexedDB/OPFS của origin này. **Lưu + backup** tải JSON
cấu trúc, không chứa media/font và chưa có UI import/restore JSON. Không xóa
dữ liệu trình duyệt nếu chưa giữ media gốc. Đây chưa phải bundle backup đầy đủ.

**Xuất video** mở cài đặt; nút **Export** trong hộp thoại mới bắt đầu render
MP4. Preview không render MP4. Đừng coi lần export đầu là benchmark hiệu năng.

Preset mặc định **TikTok · MacBook M1** xuất 1080×1920, 30 fps, MP4 H.264
High Level 4, VBR mục tiêu 6 Mbps, keyframe mỗi 2 giây và AAC 128 kbps ở
48 kHz. Đây là bitrate lựa chọn của Windi cho video có caption, không phải
bitrate bắt buộc của TikTok. Mẫu thực tế có thể thấp hơn do VBR.

Preset kiểm tra `prefer-hardware` trước; nếu không được hỗ trợ, kiểm tra
`no-preference` để trình duyệt chọn. Preference được chấp nhận không chứng
minh encoder phần cứng thực sự đang dùng. Playback/preview tạm dừng khi xuất,
frame dùng cùng compositor được tuần tự hóa; hàng đợi encoder vẫn dùng giới
hạn native Mediabunny. Có yield ngắn cho UI/cancel, giải phóng audio context
sau khi mix và không cho chạy hai lượt xuất cùng lúc. Profile này cần canvas
1080×1920; bỏ chọn preset để dùng kích thước/quality tùy chỉnh.

Chưa có cảm biến nhiệt hoặc kiểm soát CPU theo nhiệt độ. Không hứa máy dưới
100°C hay nhanh hơn Remotion trên mọi timeline. Thời gian, CPU và nhiệt cần
đo cùng một video, cùng trình duyệt và điều kiện máy. Mở Chrome/Safari ngoài
app nếu trình duyệt đang dùng báo không hỗ trợ H.264/AAC.

`npm run video:cut:test:export` kiểm tra chọn encoder, fallback, lỗi codec
và bảo vệ kích thước (cần clone/dependencies đã cài; Node 24 hỗ trợ TS).

## Cài lại môi trường độc lập

Yêu cầu Node.js, git, ffprobe và runtime Remotion của `kits/video-starter`.
Clone/dependencies khá lớn (khoảng 2 GB sau dev build trên máy test).

```sh
git clone https://github.com/OpenCut-app/opencut-classic.git .local/opencut-classic
git -C .local/opencut-classic checkout cf5e79e919144200294fb9fed22a222592a0aeea
cd .local/opencut-classic
npm exec --yes --package=bun -- bun install --frozen-lockfile
cd ../..
npm run video:cut:patch
npm run video:cut:prepare
npm run video:cut
```

Upstream được pin ở SHA trên; `upstream.patch` lưu mọi thay đổi giao diện và
compatibility fix của prototype. Trình apply kiểm tra SHA/conflict và không
ghi đè thay đổi khác. Không thêm dependency OpenCut vào web chính. Launcher
chỉ bind localhost và không truyền credentials production sang OpenCut.
Các dịch vụ cloud upstream không cấu hình ở bản thử này; không dùng tab
Sounds/CMS như một tính năng dịch vụ đã tích hợp.

## Phạm vi đã chuyển và giới hạn

WS25 có 18 track native gồm caption, watermark, headline, dòng nhấn, nhãn,
chrome, khung, đường nền, video và voice/music riêng. Các cảnh/chữ/khung là
đối tượng chỉnh được, không phải video MP4 đã flatten. Main Track trống là
track native dự phòng. Grid gồm nhiều graphic trong cùng track; khi chúng
chồng thời gian, timeline native chỉ hiển thị clip phía trên. Danh sách
“Đối tượng trong layer” vẫn cho chọn riêng từng đường để chỉnh.

Đây là dựng lại bố cục bằng OpenCut, **chưa phải chuyển đổi Remotion 1:1**.
3D, custom animation, motion design, karaoke từng từ và outro riêng chưa
chuyển tự động. Media được giới hạn bởi độ dài source, không loop/stretch;
cảnh dài hơn source có thể thiếu hình ở phần cuối và cần chỉnh biên tập.
Nguồn/source/final gốc giữ nguyên. Chưa xuất full WS25 bằng OpenCut.

Chỉ đưa vào skill/video workflow thương mại sau khi kiểm thử adapter layout,
audio/caption đồng bộ, draft migration/backup/restore, hiệu năng export,
quyền asset/font và UX thực tế. Không có deployment ở phase này.

## Nguồn và kiểm tra

- [OpenCut](https://github.com/opencut-app/opencut): main đang rewrite.
- [OpenCut Classic](https://github.com/OpenCut-app/opencut-classic): bản editor
  chính thức dùng cho thử nghiệm này, MIT; giữ LICENSE upstream trong clone.
- `npm run video:cut:test`: manifest/timing/object regression tests.
- [QA.md](./QA.md): bằng chứng và giới hạn kiểm tra hiện tại.
