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
| Motion | Cửa sổ lơ lửng nhẹ, grid dịch theo frame, glow teal/vàng chạy sine và cursor chọn ô; không dùng mascot mặc định |

Chuyển sắc thái web sang video, không quay nguyên trang rồi thu nhỏ. Viền cứng 3–4px, bóng lệch 6–10px ở canvas 1080. Mỗi cảnh có một tiêu điểm. Có thể dùng cửa sổ xếp lớp, nhưng không lồng nhiều card. Dark theme dùng navy/mint; cho phép glow/neon cục bộ vừa đủ như WS20 V1. Tránh glow phủ toàn cảnh, nền đen/cam và font sans đại trà giống video mẫu.

## Mốc visual đã chọn

Mặc định kế thừa hướng **WS20 V1: retro + 3D vừa đủ**, theo [visual-ws20-v1.md](visual-ws20-v1.md). Phần này là hướng thẩm mỹ mới hơn: cho phép chiều sâu, ánh kim và viền neon cục bộ như V1; giữ nền grid phẳng và tránh tăng độ phức tạp chỉ để phô diễn thư viện. HUD, caption, âm thanh và quyền duyệt vẫn theo quy chuẩn riêng bên dưới.

## Canvas và typography

- 1080×1920, 30fps; MP4 H.264/AAC, pixel format yuv420p. Dự kiến 45–55s, duration theo voice + đoạn kết.
- Safe zone đề xuất: x=80..900, y=160..1600 cho nội dung quan trọng; chừa phải và đáy cho UI Shorts/TikTok. Kiểm tra bằng overlay mục tiêu, không coi safe zone là bảo đảm mọi nền tảng.
- Headline 84–112px, tối đa 2–3 dòng; supporting text 44–54px. Caption 48–58px, 3–7 từ mỗi cụm, tối đa 2 dòng quanh y=1360..1510. Nhấn 1–2 từ, không tô cả câu.
- Watermark **WindiStudio - Sử Dụng AI Hiệu Quả** xuất hiện từ frame đầu tới cuối. Đề xuất ô kem cố định x=80..900, y=162..264, text 34–38px; cho phép ngắt dòng sau dấu gạch nhưng giữ nguyên chữ/dấu/casing. Đo độ rộng và kiểm ở preview 360×640. Không nhét watermark sát đáy.
- Không dùng chim/vịt pixel hay mascot mặc định. Chỉ thêm khi người dùng yêu cầu rõ cho tập; khi đó vẫn không được che caption, headline, proof hoặc watermark.

## Voice và nguồn hình

1. Chỉ sau `APPROVED`, chọn provider tiếng Việt đã cấu hình trong môi trường hoặc dùng voice người dùng cung cấp. Chưa có provider thì kiểm tra khả năng local; nếu không tạo được voice dùng được, hỏi đúng thông tin còn thiếu và tiếp tục phần độc lập.
2. **Cấu hình Voice Cartesia chuẩn (Tốc độ 1.1x & Tự động sinh Timestamps):**
   - **Bắt buộc bật cờ Timestamp:** Gửi request đến `https://api.cartesia.ai/tts/sse` với payload `add_timestamps: true` và `output_format: {container: "raw", encoding: "pcm_s16le", sample_rate: 44100}` để nhận dữ liệu word timestamps trực tiếp từ API.
   - **Tốc độ đọc chuẩn 1.1x:** Luôn đặt `generation_config: { speed: 1.1 }` để voiceover có nhịp nhanh, cuốn hút, dứt khoát, không bị chậm hay lê thê.
   - **Tên thương hiệu & Domain:** Viết `WindiStudio.app` hoặc `WindiStudio chấm app` để bộ đọc phát âm tự nhiên.
   - **Xử lý Audio:** Nối các raw PCM chunk và convert sang MP3 với ffmpeg `loudnorm=I=-14:TP=-1.0:LRA=11`.
3. Transcribe/align voice cuối cùng, sửa tên riêng bằng đối chiếu script; mốc `start/end` xuất phát từ audio, không từ độ dài chữ. Tạo SRT và cue JSON. Render duration = ceil(audioDuration × fps) + tail có chủ đích.
4. **Quy chuẩn Hình minh họa 16:9 từ Flow & Xử lý Watermark:**
   - Mọi hình ảnh trong khung Window retro bắt buộc tạo ở tỉ lệ **Landscape 16:9** (`1376×768`). Tuyệt đối **không dùng tỉ lệ 1:1** vì sẽ bị crop cụt hai bên và chật chội.
   - Hình ảnh phải được tạo mới độc bản cho từng beat của tập, bám sát các ẩn dụ và thông số của kịch bản. Không tái sử dụng hình minh họa từ tập cũ.
   - Không bắt AI nhồi nhét chữ nhỏ li ti trong ảnh.
   - Xóa sạch dấu ấn watermark (sao 4 cánh của Google Flow / AI provider ở góc dưới phải `cx = w - 97, cy = h - 97, r = 55`) bằng Telea Inpainting OpenCV trước khi đưa vào `public/`.
5. **Nhạc nền & SFX (Âm lượng BGM tối ưu & Cấm tiếng Buzz đầu video):**
   - **Tăng âm lượng nhạc nền tối ưu:** Trong Remotion `Composition.tsx`, cấu hình BGM với `volume={0.95}` (thay vì 0.3) để nền nhạc sôi động, giữ nhiệt cho video mà không lấn át voiceover.
   - **Tuyệt đối KHÔNG chèn SFX tại frame 0:** Cấm dùng `recordScratch` hoặc âm thanh chói tai ở đầu video. Mở đầu bằng voiceover và BGM tự nhiên; các SFX chuyển cảnh (`whoosh`, `mouseClick`, `pageTurn`) chỉ bắt đầu từ phân cảnh tiếp theo (`index >= 1`).
   - Voiceover chuẩn hóa `-14 LUFS` đảm bảo nổi bật rõ ràng trên nền nhạc. SFX click ở thao tác, pop ở reveal, chime ở payoff.

## Remotion: Chuẩn Layout WS04 (Thoáng, Gọn, Chuẩn Thumbnail & Subtitle Karaoke)

Scaffold standalone theo skill Remotion hiện có; đưa font/ảnh/audio vào public của dự án video và tham chiếu bằng `staticFile()`.

**Thông số Bố cục WS04 (Kích thước 1080×1920):**
- **1. Watermark Header Box (Cố định):** `top: 150px, left: 80px, width: 920px, height: 72px`, viền `3px solid #5da57c`, nền `rgba(16, 43, 58, 0.75)`, text `WindiStudio - Sử Dụng AI Hiệu Quả` (font Calling bold 30px).
- **2. Subtitle Category:** `top: 255px, left: 80px`, text `WINDISTUDIO / AI TOOLBOX` (26px Calling bold, màu `#7f9eb5`).
- **3. Big Headline:** `top: 300px, left: 80px, width: 920px`, cỡ chữ 46–52px uppercase bold `#ffffff`, ngắn gọn 1–2 dòng.
- **4. Khung Retro Terminal Window:** `top: 410px, left: 80px, width: 920px, height: 660px`, viền `3px solid #6482a6`, bóng `boxShadow: 9px 10px 0 rgba(0, 0, 0, 0.55)`:
  - Header bar: `height: 56px`, 3 nút tròn `● ● ●` + tên cửa sổ / windowTitle (ví dụ: `CODEX BENCHMARK // $5 DƯ HƠN 99%`).
  - Vùng chứa ảnh 16:9: `width: 100%, height: 490px`, chứa ảnh 16:9 với hiệu ứng zoom nhẹ (`scale 1.0 -> 1.035`) hoặc component tương tác (Decision Matrix).
  - Thanh Equalizer động: `height: 52px` nằm dưới ảnh, 46 cột sóng nhấp nhô theo frame sin.
- **5. Green Spoken Anchor Pill:** `top: 1120px, left: 80px`, viền `#5da57c`, nền `rgba(93, 165, 124, 0.2)`, chữ màu `#86efac` (28px Calling bold).
- **6. Khung Phụ đề Karaoke Động (Dynamic Word-Level Karaoke Bar):** `top: 1350px, left: 80px, width: 920px`, căn giữa màn hình, viền bo retro `#5da57c`, nền mờ tối, chữ chạy từng từ đồng bộ với audio, từ đang đọc được phóng to nhẹ và đổi màu xanh mint `#86efac`. Giúp lấp đầy khoảng trống ở nửa dưới màn hình và tăng độ tập trung theo dõi.
- **7. Thanh Tiến trình & Bộ đếm:** `top: 1640px` (thanh bar mỏng viền xanh, fill theo % frame), `top: 1682px` (text `01 / 05` và category).

**Lưu ý:** Khung cảnh đầu tiên (Scene 01) được thiết kế theo đúng bố cục trên sẽ lập tức sẵn sàng làm ảnh Thumbnail (`cover.png`) tại frame 40–50 mà không cần xuất thêm asset riêng.

Cue tối thiểu: `id`, `start`, `end`, `spokenAnchor`, `headline`, `captionChunks`, `asset`, `action`, `claimSource`. Ví dụ hành vi: từ “kết quả” → reveal output, tên repo → title, số đã đọc → highlight số, “lưu ý” → sticky note. Đừng chia bảy slide rồi chỉ crossfade; mỗi cảnh cần có hành vi theo lời đọc.

Chuyển cảnh 6–10 frame, reveal khoảng 5–8 frame, stagger nhẹ nếu nhiều phần. Không biến các con số thật thành counter hư cấu chạy qua số khác quá lâu. Screenshot trong frame lớn, zoom/crop vùng quan trọng; đừng bắt người xem đọc cả README. Giữ toàn bộ output không bị cắt mất phần chứng minh lời hứa.

## QA và export

1. Đọc script đối chiếu claim sources + kiểm CTA thật. Nguồn mâu thuẫn thì nói rõ điều kiện hoặc bỏ claim.
2. Render still đầu, hook, proof, demo, cảnh nhiều chữ, CTA. Xem ở 1080 và 360px rộng: dấu, overflow, độ đọc, caption và watermark không đè nhau.
3. Render preview, xem/nghe đầy đủ. Đối chiếu từng spoken anchor với cue; mục tiêu lệch caption ≤120ms, không cắt mất âm cuối, không đen giữa cảnh. Không khẳng định nghe nếu mới chỉ xem ảnh.
4. Render final; `ffprobe` xác minh kích thước, fps, duration, audio/video stream. FFmpeg kiểm clipping/silence đầu-cuối; đo loudness, mục tiêu thường khoảng -14..-16 LUFS, true peak ≤-1dBTP; ưu tiên giọng rõ và điều chỉnh khi cần.
5. Mở MP4 xuất thật và chạy watch/khung hình toàn timeline lần cuối, đặc biệt frame đầu/cuối. Lưu QA record và file size. Có thể tạo cover ở một frame đã QA, không lấy frame chuyển cảnh trắng/đen.

Đầu ra: `final.mp4`, `cover.png`, `captions.srt`, `script.md`, `episode.json`, `qa.md`, dự án Remotion và asset manifest. Các file này chỉ sinh cho tập đã duyệt; tài liệu skill không phải bằng chứng renderer đã chạy.
