# Dựng video WindiStudio

## Nhận diện

Nguồn kiểm tra trong workspace WindiStudio2: `app/globals.css`, `windi/home.css`, `windi/calling-code-font.css`, `windi/ambient-motion.tsx`, `windi/ambient-motion.css`, `public/SVN-Calling Code Regular.otf` và bản Bold. Lấy lại giá trị từ web nếu được cập nhật; không sửa web chỉ để dựng video.

| Thành phần | Mặc định đã đối chiếu 2026-09-06 |
|---|---|
| Nền | Dark retro navy `#081a2a`, lưới teal mờ chạy loop |
| Cửa sổ / bề mặt | Deep blue `#102b3a`; proof HTML giữ nền gốc để chứng minh output |
| Chữ / viền | Warm white `#f3f0df` / mint `#9bc8c3` |
| Nhấn | Hồng `#ff6f9d`, vàng đồng `#b8892d`, cyan `#62bfd0` |
| Xanh lá | Teal `#267d73` |
| Font | SVN-Calling Code Regular/Bold, giữ dấu tiếng Việt |
| Motion | Cửa sổ lơ lửng nhẹ, grid dịch theo frame, glow teal/vàng chạy sine, cursor chọn ô, chim pixel xuất hiện có chủ đích |

Chuyển sắc thái web sang video, không quay nguyên trang rồi thu nhỏ. Viền cứng 3–4px, bóng lệch 6–10px ở canvas 1080. Mỗi cảnh có một tiêu điểm. Có thể dùng cửa sổ xếp lớp, nhưng không lồng nhiều card. Dark theme dùng navy/mint và highlight rất nhẹ; tránh glow sci-fi, nền đen/cam, font sans đại trà giống video mẫu.

## Canvas và typography

- 1080×1920, 30fps; MP4 H.264/AAC, pixel format yuv420p. Dự kiến 45–55s, duration theo voice + đoạn kết.
- Safe zone đề xuất: x=80..900, y=160..1600 cho nội dung quan trọng; chừa phải và đáy cho UI Shorts/TikTok. Kiểm tra bằng overlay mục tiêu, không coi safe zone là bảo đảm mọi nền tảng.
- Headline 84–112px, tối đa 2–3 dòng; supporting text 44–54px. Caption 48–58px, 3–7 từ mỗi cụm, tối đa 2 dòng quanh y=1360..1510. Nhấn 1–2 từ, không tô cả câu.
- Watermark **WindiStudio - Sử Dụng AI Hiệu Quả** xuất hiện từ frame đầu tới cuối. Đề xuất ô kem cố định x=80..900, y=162..264, text 34–38px; cho phép ngắt dòng sau dấu gạch nhưng giữ nguyên chữ/dấu/casing. Đo độ rộng và kiểm ở preview 360×640. Không nhét watermark sát đáy.
- Chim pixel không che caption, headline, proof hay watermark. Đưa vào mở/kết hoặc đường đi ngắn có chủ đích, không bay liên tục qua nội dung.

## Voice và nguồn hình

1. Chỉ sau `APPROVED`, chọn provider tiếng Việt đã cấu hình trong môi trường hoặc dùng voice người dùng cung cấp. Chưa có provider thì kiểm tra khả năng local; nếu không tạo được voice dùng được, hỏi đúng thông tin còn thiếu và tiếp tục phần độc lập. Không đọc/chép secret vào script, log hay brief.
2. Giọng rõ, gần gũi, nhịp nhanh vừa phải, ngắt sau hook và trước giới hạn. Không clone giọng người làm video mẫu. Tạo voice toàn đoạn hoặc từng beat có khoảng nghỉ được quản lý.
3. Transcribe/align voice cuối cùng, sửa tên riêng bằng đối chiếu script; mốc `start/end` xuất phát từ audio, không từ độ dài chữ. Tạo SRT và cue JSON. Render duration = ceil(audioDuration × fps) + tail có chủ đích.
4. Screenshot/demo lấy từ repo/trang chính thức hoặc chạy thử trong thư mục riêng sau duyệt; UI thông tin có thể vẽ lại nhưng không giả làm output đã chạy. Không dùng dữ liệu tài khoản riêng để demo. Ghi asset provenance vào manifest.
5. Nhạc/SFX tự tạo hoặc có quyền dùng. Click ở thao tác click, pop ở reveal, chime ở payoff. Duck nhạc khoảng 18–24dB dưới voice; đo mix, không suy ra từ một giá trị volume cố định. Không tái dùng soundtrack của video tham khảo.

## Remotion

Scaffold standalone theo skill Remotion hiện có; dùng đúng package/docs của version cài đặt. Pin các package `remotion` và `@remotion/*` tương thích. Đưa font/ảnh/audio vào public của dự án video và tham chiếu bằng `staticFile()`.

Tách `RetroWindow`, `BrandWatermark`, `PixelBird`, `RepoProof`, `InputOutputDemo`, `TimedCaptions` và từng scene. Mọi chuyển động dựa trên frame (`useCurrentFrame`, `interpolate`/spring đúng phiên bản), gồm grid `backgroundPosition` modulo kích thước ô, glow theo sine và floating translate/tilt; không `setTimeout`, CSS animation hay random không seed.

Cue tối thiểu: `id`, `start`, `end`, `spokenAnchor`, `headline`, `captionChunks`, `asset`, `action`, `claimSource`. Ví dụ hành vi: từ “kết quả” → reveal output, tên repo → title, số đã đọc → highlight số, “lưu ý” → sticky note. Đừng chia bảy slide rồi chỉ crossfade; mỗi cảnh cần có hành vi theo lời đọc.

Chuyển cảnh 6–10 frame, reveal khoảng 5–8 frame, stagger nhẹ nếu nhiều phần. Không biến các con số thật thành counter hư cấu chạy qua số khác quá lâu. Screenshot trong frame lớn, zoom/crop vùng quan trọng; đừng bắt người xem đọc cả README. Giữ toàn bộ output không bị cắt mất phần chứng minh lời hứa.

## QA và export

1. Đọc script đối chiếu claim sources + kiểm CTA thật. Nguồn mâu thuẫn thì nói rõ điều kiện hoặc bỏ claim.
2. Render still đầu, hook, proof, demo, cảnh nhiều chữ, CTA. Xem ở 1080 và 360px rộng: dấu, overflow, độ đọc, caption và watermark không đè nhau.
3. Render preview, xem/nghe đầy đủ. Đối chiếu từng spoken anchor với cue; mục tiêu lệch caption ≤120ms, không cắt mất âm cuối, không đen giữa cảnh. Không khẳng định nghe nếu mới chỉ xem ảnh.
4. Render final; `ffprobe` xác minh kích thước, fps, duration, audio/video stream. FFmpeg kiểm clipping/silence đầu-cuối; đo loudness, mục tiêu thường khoảng -14..-16 LUFS, true peak ≤-1dBTP; ưu tiên giọng rõ và điều chỉnh khi cần.
5. Mở MP4 xuất thật và chạy watch/khung hình toàn timeline lần cuối, đặc biệt frame đầu/cuối. Lưu QA record và file size. Có thể tạo cover ở một frame đã QA, không lấy frame chuyển cảnh trắng/đen.

Đầu ra: `final.mp4`, `cover.png`, `captions.srt`, `script.md`, `episode.json`, `qa.md`, dự án Remotion và asset manifest. Các file này chỉ sinh cho tập đã duyệt; tài liệu skill không phải bằng chứng renderer đã chạy.
