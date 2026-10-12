# QA — 0.1.0-beta.5

Ngày cập nhật: 2026-10-11. Máy kiểm tra: macOS arm64. Beta 4 đã chạy lại phần danh sách và nghe thử bộ giọng local thật như mục dưới; các kiểm chứng ASR/dịch/render cũ giữ ngày thực hiện riêng. Báo cáo này phân biệt chạy thật, kiểm thử hợp đồng và phần chưa xác minh; không phải chứng nhận production.

## Bổ sung beta 5 — nhãn model local — 2026-10-11

- Giao diện và hướng dẫn dùng Local Voice Pro/Lite/Standard, Local Decode Quick/Base/Balanced/Accurate; giữ cấu hình và cache cũ tương thích.
- Lỗi engine không trả traceback/package/model nội bộ ra UI; vẫn giữ thông báo chọn sai giọng và thiếu môi trường để người dùng sửa được.
- 21/21 kiểm thử tự động qua, gồm fixture engine lỗi có tên package/model/path nội bộ: UI chỉ nhận hướng dẫn sửa môi trường. Browser xác minh cả màn nhận diện và giọng đọc không có hai tên engine, giữ 25 giọng và hai audio mẫu đã lưu. Ảnh: `/private/tmp/windi-dubbing-local-models-beta5.png`.
- Lệnh cài hỗ trợ `--engine decode` / `--engine voice`; thông tin nguồn và giấy phép tách trong THIRD_PARTY.md. Mã nguồn local vẫn chứa dependency/import thật, không phải cơ chế bảo mật engine.

## Bổ sung beta 4 — chọn 1/2 giọng, Local/API, nghe thử và dark mode — 2026-10-11

- 20/20 kiểm thử tự động qua. Bổ sung hợp đồng chọn 1 hoặc 2 người nói, giữ nội dung/timeline/voice đầu tiên, chuyển các câu về vai hợp lệ và vô hiệu hóa kết quả đúng phạm vi. Câu nghe thử lưu theo dự án; sửa câu chỉ xóa audio mẫu, giữ TTS/render đầy đủ. Không cho chạy mẫu khi chưa chọn giọng.
- Worker kiểm tra danh sách V3 từ metadata SDK bằng fixture không cho import model. Turbo/Nano lấy đúng catalog riêng và thứ tự featured; replay cache trả audio mà không import SDK hoặc nạp model.
- Chạy runtime bộ giọng local 3.8.1 đang cài trên máy: danh sách thật Turbo 25 giọng và Nano 11 giọng, nhãn tên/giới tính/vùng/phong cách từ SDK. Số lượng phụ thuộc phiên bản SDK; Standard vẫn dùng API SDK và có thể cần tải model.
- Tạo hai WAV thật cho cùng câu mẫu: Anh Khôi (MC) 2.800 giây và Trúc Ly (Khách mời) 2.320 giây, 48 kHz. Browser nạp cả hai player thành công, không có lỗi audio; phát lại cùng cấu hình giữ nguyên mtime của WAV cache. Dùng model/cache có sẵn và chế độ offline cho lần QA này; chưa chấm chất lượng tự nhiên bằng người nghe.
- Browser thật: chọn 1/2 giọng, Local/API, chuyển Turbo/Nano, gán hai preset, lưu lựa chọn và câu mẫu, nghe riêng từng vai. Sửa lỗi đổi nhanh số giọng rồi model làm mất lựa chọn; kiểm tra lại vẫn giữ đủ hai vai. Windi API tải catalog qua HTTP fixture, ElevenLabs/OpenAI hiện model phù hợp; không gọi cloud TTS trả phí.
- Dark mode dùng palette Windi web. Phone 375×844, landscape 844×390, tablet 820×1180 và desktop 1366×900 không tràn ngang. Không có lỗi JavaScript trong phiên QA. Ảnh thử: `/private/tmp/windi-dubbing-dark-settings-beta4.png`, `/private/tmp/windi-dubbing-dark-voices-beta4.png`, `/private/tmp/windi-dubbing-dark-phone-beta4.png`.
- Chưa tự phân vai từ audio, chưa xử lý hai người nói chồng lời; vẫn cần gán MC/Khách mời cho từng câu ở bước Lời thoại. Chưa kiểm tra credit/quyền hoặc chất lượng Windi production, chưa QA Windows native cho giao diện mới.

## Bổ sung beta 3 — Windi Voice API — 2026-10-11

- 17/17 kiểm thử tự động qua. Đối chiếu adapter với các route Windi Voice trong repo: Bearer key Windi, URL gốc, phân trang giọng, voice ID UUID, tạo generation có Idempotency-Key và tải audio qua redirect riêng.
- HTTP fixture xác minh hai giọng riêng, thư viện/clone, timestamp cùng generation, cache, lưu key chống tạo trùng trước POST, mất phản hồi POST, pending, unknown/chờ đối soát, chỉ retry lượt mới sau failed, lỗi tải link audio và thiếu timing. Máy chủ storage không nhận Authorization của Windi.
- Pipeline Windi thật với HTTP fixture và FFmpeg: tải danh sách, tạo tiếng hai vai không cần runtime bộ giọng local, xuất clip tổng hợp 2 giây H.264/AAC + SRT. Không dùng token hoặc credit Windi thật; chưa chấm chất lượng voice thực tế.
- Browser thật dùng API giả lập: chọn Windi Voice, mặc định URL gốc không /v1, không có ô model ID, lưu/xóa key thử và cập nhật trạng thái ngay; tải danh sách, chọn tên giọng riêng MC/Khách mời, ID tự điền, lưu/mở lại giữ lựa chọn. Desktop 1366×900, tablet 820×1180, phone 375×844 không tràn ngang. Ảnh thử: `/private/tmp/windi-dubbing-windi-api-beta3.png`.
- Không tạo clone mới trong kit; chỉ dùng clone sẵn có được API tài khoản trả về. Chưa kiểm tra credit/quyền tài khoản hoặc chất lượng giọng trên Windi production. Chưa QA Windows native cho adapter mới.

## Bổ sung beta 2 — 2026-10-11

- 13 kiểm thử tự động qua: migration dự án một giọng; giữ speaker/speaker_id qua nhập và dịch; hai vai chọn hai voice ID độc lập; không xóa vai còn dùng; đổi vai/voice/model/provider vô hiệu hóa kết quả; API key riêng, mode 0600 trên POSIX, frontend/project không chứa key, chặn tải file private.
- Worker local được chạy bằng Python với module bộ giọng local stub: định tuyến/caching đúng giọng từng câu, từ chối voice ID sai trước infer, xóa marker cache cloud khi ghi lại local. Không phải chạy model nhiều giọng thật.
- API được thử qua HTTP fixture loopback: OpenAI-compatible Bearer + /audio/speech, ElevenLabs xi-api-key + /text-to-speech và /v2/voices, voice ID riêng từng câu, chuẩn hóa WAV bằng FFmpeg, cache đổi theo giọng, chặn batch thiếu voice trước gọi API, lỗi 401/429 và hủy.
- Pipeline job thật dùng video tổng hợp 2 giây và audio WAV fixture: hai câu/two voices có ratio xấp xỉ 1, render FFmpeg H.264/AAC MP4 + SRT/WAV thành công. Đây là kiểm tra điều phối và định dạng, không phải chấm chất lượng giọng cloud.
- Browser thật: tạo MC/Khách mời, lưu onyx/nova riêng, đổi nguồn sang ElevenLabs/OpenAI, mở cấu hình Base URL/key/model. Kiểm tra responsive và chụp ảnh trên desktop 1366×900 và phone 375×844; không tràn ngang ở màn chọn giọng. Không gọi API voice trả phí trong browser.
- Còn cần key/quota thật để kiểm tra chất lượng tiếng Việt từng voice/model trên OpenAI/ElevenLabs và API tương thích cụ thể. Chưa tự diarization, tạo voice clone mới, hoặc trộn lời thoại chồng nhau. Chưa QA Windows native cho phần mới.

## Đã chạy thật

- bộ giọng local 3.8.1, môi trường Python 3.12 có sẵn từ project voice: tải danh sách preset voices; tạo WAV tiếng Việt bằng model V3 Turbo local có cache.
- Clip tổng hợp 8 giây: FFmpeg ghép đoạn, áp dụng cross time-stretch, rasterize phụ đề tiếng Việt bằng Pillow/Arial, xuất MP4 H.264/AAC, SRT và WAV. ffprobe đọc được video/audio; thời lượng MP4 thử 8.101333 giây. Đã xem frame đầu ra có đúng chữ tiếng Việt và viền. Chưa chấm điểm tự nhiên của giọng hay chất lượng một video dài.
- Codex CLI 0.162.0-alpha.17.2: `login status` xác minh ChatGPT auth; dịch một câu tiếng Anh qua `exec` và output schema, nhận đúng ID/nội dung. Không dùng API key hoặc local translation model.
- bộ nhận diện local 20250625 + Tiny CPU: nhận diện clip giọng Việt thật ở trên, xuất transcript và timestamp theo từ. Timestamp thử 0.74–2.94 giây; Tiny nhận sai một số từ. Đây là kiểm chứng engine chạy, không phải benchmark độ chính xác. Môi trường kiểm thử riêng tái sử dụng dependency của project cũ bằng liên kết đọc; không cài thêm vào venv của project cũ.

## Kiểm thử tự động

`node --test tests/*.test.mjs`:

- Từ chối bản dịch thiếu/thừa/trùng ID và nội dung rỗng; giữ thứ tự timeline chuẩn.
- Từ chối timeline chồng nhau, thời gian sai và ID có đường dẫn.
- Lưu/đọc lại dự án, vô hiệu hóa voice/render khi sửa lời thoại.
- Từ chối bản dịch từ revision cũ; nhập thành công kết quả từ chat.
- Sinh SRT tiếng Việt và loại mã điều khiển ASS khỏi sidecar.
- Hủy subprocess.
- Đọc đủ cả hai module của Python runtime; từ chối đường dẫn tương đối.
- HTTP API chạy trên localhost: origin/Host guard, ẩn source server, tạo yêu cầu dịch và nhận kết quả qua file/chat.

Skill được kiểm tra bằng quick_validate.py: hợp lệ. ZIP dùng whitelist source, không chứa `.windi-dubbing`, venv, cache, media, `.env`, auth hoặc cấu hình của máy phát triển. Kiểm tra giải nén sang đường dẫn có khoảng trắng, chạy tests và cài skill vào project tạm.

## Chưa xác minh trước khi public rộng

- Browser beta 4 đã kiểm tra màn chọn giọng như mục trên. Toàn bộ workflow với video dài và chất lượng nghe thực tế còn cần dùng thử.
- Windows native, launcher Windows, Windows ARM, Mac Intel; mới kiểm tra cấu trúc đường dẫn môi trường Windows bằng fixture trong quá trình phát triển.
- Antigravity CLI thực tế và đăng nhập/quota, vì máy này chưa có `agy` trong PATH. Có adapter theo tài liệu và fallback dùng LLM trong chat hiện tại.
- Cài sạch toàn bộ engine bằng setup.mjs --engines trên máy mới; đã kiểm thử môi trường hiện có và môi trường Decode riêng. FFmpeg/Node/Python cấp hệ điều hành không được bundle.
- GPU CUDA/Metal, nhiều giọng/model, video 1/5/15 phút, quota/mất mạng giữa các nhóm dịch, chất lượng lip-sync và audio cuối bằng người nghe.
- Tải URL của từng nền tảng thực tế. Beta chỉ hỗ trợ URL HTTPS YouTube/TikTok/X; không nhập credential/cookie vào kit.

Chưa triển khai hoặc public website. ZIP là bản beta để người dùng thử trước.

## UI thiết lập và chat workflow — 2026-10-12

- UI thay 6 bước bằng Giọng đọc / Cách dịch & ngữ điệu / Giao diện & phụ đề; một nút Lưu thiết lập. Browser kiểm tra hai vai, đổi phong cách/ngữ điệu, ghi chú, sáng/tối, phụ đề và giữ bản nháp qua tab. Lưu rồi tải lại giữ đủ lựa chọn.
- Kiểm tra viewport 320×740, 390×844, 768×1024, 844×390, desktop 1280px: không tràn ngang; nút lưu cao 48px ở desktop. Không thấy console error/warning trên trang local thật.
- Suite 25/25 qua trên macOS: HTTP lưu một lần cùng kết nối API, mặc định dự án mới, context/prompt không chứa key, revision theo phong cách dịch, validation bản nháp. Preview API bằng server fixture thành công với giọng/model khác và giữ nguyên cấu hình, người nói, revision, render đã lưu.
- Skill đăng ký và SKILL.md trong kit dùng agent.mjs để import video/transcript, tạo request và submit trong chat; không yêu cầu nút decode/dịch trong UI. Không có kết nối tự động tới Gemini web.
- Lần sửa UI này không gọi model/TTS/LLM hoặc quota thật, không xuất video người dùng. Fixture API/audio không thay QA nghe giọng, khả năng đọc video/timestamp của Gemini, Windows hay workflow video dài.

### Font và nền phụ đề — 2026-10-12

- Thêm catalog font hệ thống (không tải font), chọn font, màu chữ/nền và opacity 0–100%. Nền hộp bật điều khiển nền; preview Georgia + #345678/35% đọc được CSS rgba(52,86,120,0.35). Viewport 390px không tràn ngang.
- 27/27 test kit qua, không skip: PNG Pillow thật kiểm tra màu/alpha tại 0%, 35%, 100% và hình khác khi đổi font; contract lưu/migrate/defaults/invalidation render. Không xuất MP4 hoặc dùng quota TTS trong lần sửa này.
- Có chạy suite chung của repo: 206/208 qua; tests/news.test.ts và tests/workflow-default-access.test.ts thất bại ở mã ngoài phần phụ đề, không sửa trong tác vụ này. Chưa xác định baseline của hai lỗi đó.
- Giữ tab người dùng có bản nháp giọng chưa lưu; mở giao diện mới trong tab khác, không lưu đè bản nháp.

### Karaoke và kiểm tra phần cứng — 2026-10-12

- 29/29 test kit qua, không skip. Hai kiểu highlight/popup qua pipeline thật với audio/video tổng hợp, Pillow và FFmpeg: manifest nhiều frame, hai khung hình trong cùng câu khác nhau, thời lượng MP4 và SRT giữ đúng. Không dùng quota/model thật hoặc xuất video người dùng.
- Bật/tắt karaoke, chọn kiểu, nền hộp và preview đã kiểm tra trên browser; không tràn ngang ở 320×740, 390×844, 844×390 và desktop. Screenshot `/private/tmp/windi-dubbing-karaoke-settings.png`. Bản nháp demo chưa lưu.
- `node setup.mjs --check` chạy thật trên M1 Pro / 16 GB / 10 luồng, đề xuất Pro + Decode Base + 720p; không tải model. Pure tests mô phỏng RAM thấp, ít CPU, thiếu ổ đĩa và không đo được ổ đĩa. Cài engine kiểm tra trước pip/venv; tác vụ model kiểm tra lại ổ cache thực tế. Ngưỡng là chính sách dự phòng CPU, chưa benchmark hay kiểm thử cài sạch máy yếu/Windows/CUDA.
- Chưa forced alignment: karaoke chia nhịp đều theo câu sau cross time-stretch, tối đa 300 từ mỗi câu; SRT rời không mang hiệu ứng. Các file voice WindiStudio ngoài kit đang có thay đổi từ trước, không chỉnh trong tác vụ này.

### Sửa chữ dính và thêm chỉ tô màu — 2026-10-12

- Preview đặt khoảng trắng thành text node giữa các inline-block, tránh mất khoảng trắng ở cuối từng khối. Browser đo khoảng cách giữa các từ >6 px ở cỡ 22 px, toàn bộ từ cùng cỡ khi chọn chế độ chỉ tô màu.
- Thêm `karaokeStyle: color`, chỉ đổi màu từ đang đọc và không áp dụng độ phóng; preview ẩn thanh độ phóng cho kiểu này. MP4 dùng cùng hành vi. Suite 29/29 qua với cả ba kiểu qua pipeline/FFmpeg; bổ sung kiểm tra alpha mask hai frame giống hệt nhau và RGB khác nhau ngay cả khi lưu độ phóng 150%, xác minh không đổi hình dạng/bố cục.
