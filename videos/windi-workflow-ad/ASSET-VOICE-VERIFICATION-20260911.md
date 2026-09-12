# Kết quả asset và voice — 2026-09-11

- Đủ **13/13 ảnh gốc** tại `assets/windi/scene-01.jpg` đến `scene-13.jpg`.
- Đã tạo thêm scene 05, 08–13 bằng Flow; giữ nguyên request key của manifest.
  Scene 05 được tạo lại sau khi người dùng cho phép rõ ràng.
- Kiểm tra giải mã kích thước và SHA-256 của cả 13 file: khớp kết quả job.
- Bằng chứng: `windi/manifests/assets-verified-20260911.json`.
- Workflow nhận đủ manifest và chuyển sang `voice`; không phát sinh job ảnh mới.
- Windi Connect: 35/35 test pass, typecheck pass.

## Kiểm tra hình

Đã xem trực tiếp bảy ảnh mới. Một số ảnh có dấu Gemini và chữ tiếng Anh hoặc
chữ giả do model tự sinh dù prompt yêu cầu không có chữ. Scene 11–13 có nhiều
chữ trong ảnh; đặc biệt scene 13 tự thêm “v3.0 LAUNCH”, không thuộc kịch bản.
Giữ nguyên ảnh gốc; bộ asset đủ file nhưng chưa coi là visual QA passed hay
đã sẵn sàng đăng. Cần xử lý lựa chọn hình/chữ khi duyệt bản dựng.

## Voice thử trước đó chưa thành công

Đã thử toàn bộ script v01 với tốc độ 1:

| Giọng | Voice ID | Kết quả |
| --- | --- | --- |
| Minh | 0e58d60a-2f1a-4252-81bd-3db6af45fb41 | Lỗi timestamp, API báo hoàn credit |
| Linh | 935a9060-373c-49e4-b078-f4ea6326987a | Lỗi timestamp, API báo hoàn credit |

Thông báo chính xác: “Phản hồi timestamp từ nhà cung cấp không hợp lệ. Credit
đã được hoàn lại.” Chưa có MP3 hoặc captions được trả về. Chưa đối chiếu số dư
độc lập. Chưa xác định nhánh validation nào gây lỗi vì thiếu phản hồi provider.

Bước còn vướng khi đó là chẩn đoán đường timestamp trong Windi Voice API rồi tạo
lại bản nghe thử. Chưa render video, không đánh dấu workflow complete.

## Thử lại với voice ID người dùng cung cấp

Người dùng yêu cầu dùng `4499b44b-5180-4d65-9d76-e24405138493`.
Đã gọi `windi voice generate` với đúng ID này, script đã duyệt và tốc độ 1.01 để
tạo request key mới sau job lỗi trước. Cartesia trả audio thành công; lỗi còn lại
là một caption bị làm tròn thành `startMs == endMs`, nên đã sửa đúng caption đó
thành khoảng tối thiểu 20 ms trước khi đăng ký artifact.

## Voice thử đã tạo thành công

- Voice ID: `4499b44b-5180-4d65-9d76-e24405138493`
- Job: `8db096e8-df30-441d-8d13-85e9a81231f4`
- Audio: `windi/voice/8db096e8-df30-441d-8d13-85e9a81231f4.mp3`
- Captions: `windi/timing/captions-8db096e8-df30-441d-8d13-85e9a81231f4.json`
- Kiểm tra file: MP3 mono 44.1 kHz, 128 kbps, thời lượng khoảng 81.95 giây.
- Đối chiếu Supabase: job `ready`, `admin_funded: true`, 1.319 ký tự; chu kỳ
  hiện tại vẫn `used_credits: 0`.
- Workflow đã nhận voice + captions và chuyển sang `render` (`nextAction`:
  `render_video`).

## Render hoàn chỉnh

- MP4: `windi/renders/final.mp4` (44.0 MB).
- Cover: `windi/renders/cover.png` (1080×1920).
- Captions SRT: `windi/timing/captions.srt`.
- QA: `windi/qa/qa-script-v01.json`, `passed: true`, 13 scene, 276 caption,
  audio có mặt.
- Workflow đã chuyển sang `complete`.
