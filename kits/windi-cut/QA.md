# Local QA — 2026-10-08

Upstream: `cf5e79e919144200294fb9fed22a222592a0aeea`. Test localhost:4320,
Chromium in-app desktop viewport 1440×960. Không deploy hoặc mutation DB.
Dark mode đã xác nhận trong editor và bảng chỉnh layer; nền navy pha xám,
chữ sáng, đường biên dịu, giữ canvas preview nguyên màu nội dung.

## Đã xác minh

- Browser mở mẫu QA native 3 giây với 17 track; full WS25 với 18 track,
  5 clip nguồn + voice + music, project duration 00:01:11:28.
- Headline sửa thành `WINDI · TEST NHIỀU LAYER`, position X=100/Y=-600,
  scale X/Y=1.1; thay đổi hiện trong preview và frame MP4 export.
- Thêm chữ tăng 17→18; undo→17; redo→18; undo→17. Dùng placement native
  auto thay vì tạo empty track bị OpenCut prune.
- Nút Xuất video mở dialog cấu hình, không render ngay. Click Export rõ ràng
  mới xuất bản QA. MP4 thật: H264/AAC, 1080×1920, 30fps, 3.088254 giây,
  1,553,168 bytes. `visual-checks/windi-cut/qa-export.mp4` và frame ở 1 giây.
- Full WS25 lưu JSON qua UI: `WS25 · Windi nhiều layer.windicut.json`.
  Đây là metadata/scene structure, không phải media backup/import restore.
- Reload browser khôi phục đúng project WS25, 18 track và media đã lưu.
- Calling font tải từ local, giao diện Windi retro giữ palette/viền vuông.
- Chọn riêng `Grid ngang 900` trong dropdown đối tượng, inspector đúng
  position Y=-60; các graphic chồng thời gian vẫn truy cập để chỉnh riêng.
- Node manifest tests: 3 passed. Patch reverse-check xác nhận các thay đổi
  upstream có thể lưu/áp dụng lại ở pinned revision.

## Preset TikTok / M1 — 2026-10-08

- UI mặc định chọn TikTok · MacBook M1; H.264 1080×1920/30 fps, VBR 6 Mbps,
  AAC 128 kbps/48 kHz. Tắt preset vẫn truy cập format/quality native.
- Hai lần xuất mẫu 3 giây thành công. Browser log: preference
  `prefer-hardware` được hỗ trợ; từ log chọn encoder tới complete khoảng
  1.643 và 1.758 giây. Không lấy thời gian tool/download transport làm thời
  gian render; không so sánh với QA cũ vì môi trường/chưa có baseline giống nhau.
- File thực tế `visual-checks/windi-cut/m1-qa-export.mp4`: H.264 High,
  yuv420p, 1080×1920, 30 fps, 90 frames; AAC LC stereo 48 kHz; duration
  3.072 giây (có AAC padding), 1,540,225 bytes. Video thực ~3.993 Mbps,
  audio ~106 kbps; thấp hơn mục tiêu là bình thường với VBR.
- Frame 1 giây kiểm tra đủ layout/text/media/caption. Đây là QA kỹ thuật.
- 4 regression tests chọn preferred encoder/fallback/unsupported/dimensions
  passed. Typecheck không còn lỗi ở file export/renderer mới; toàn upstream
  vẫn còn nhóm lỗi legacy đã ghi bên dưới.
## Chưa chứng minh / cần tiếp tục

- Chưa đo nhiệt độ/CPU trên một full export; chưa xác nhận hardware encoder
  thực dùng vì WebCodecs preference chỉ là hint, không có bằng chứng trực tiếp.

- Chưa export full WS25, chưa nghe/duyệt editorial toàn video; không đánh
  đồng mẫu QA kỹ thuật với video final được duyệt.
- Export browser đầu tiên có khoảng chờ dài (~150s trong thao tác kiểm tra),
  chưa profile GPU/WASM/codec và chưa chứng minh tốc độ xuất tốt hơn Remotion.
- Chưa test keyframe animation end-to-end, canvas drag đa lựa chọn, tất cả
  filter/transition upstream hay mọi scene/layout Remotion.
- Generic typecheck toàn upstream còn lỗi legacy content-collections,
  constructor IndexedDB migration v1-to-v2 và branded-time assertions ở test.
  Không có lỗi mới ở các file Windi trong lần typecheck đã chạy; không tuyên
  bố toàn upstream typecheck/build đã pass. Runtime browser flows trên đã pass.
- Bản prototype dành cho desktop. Chưa tối ưu editor mobile.
- Nguồn MIT cho editor không cấp quyền thương mại cho mọi asset/font.
