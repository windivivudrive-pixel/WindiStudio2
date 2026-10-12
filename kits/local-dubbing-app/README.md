# Windi Dubbing Kit — 0.1.0 beta 4

Bộ ứng dụng local và skill dành cho LLM: nhập video/file/link, nhận diện lời thoại, dịch qua subscription, tạo giọng Việt, chọn phụ đề, xuất MP4/SRT/WAV. Nhận diện dùng **Windi Decode**, tạo giọng local dùng **Windi TTS**. Đây là bản beta để dùng thử, chưa phải bản phát hành thương mại đã QA đa nền tảng.

## Dùng nhanh trong dự án khác

1. Giải nén toàn bộ thư mục kit vào dự án. Giữ nguyên các file bên trong.
2. Nói với LLM: **“Đọc SKILL.md trong thư mục Windi Dubbing Kit, cài skill vào dự án này, kiểm tra môi trường có sẵn và mở ứng dụng để tôi dub video.”**
3. LLM chạy `node setup.mjs --project <đường-dẫn-dự-án>` tại thư mục kit để đăng ký `.agents/skills/windi-dubbing/SKILL.md`, rồi `node server.mjs`.
4. Hoặc mở `Start Windi Dubbing.command` (macOS) / `Start Windi Dubbing.bat` (Windows). Terminal cần tiếp tục chạy trong lúc dùng app. Trên Mac, nếu file mất quyền chạy sau khi giải nén, dùng `chmod +x "Start Windi Dubbing.command"`.
5. Mở http://127.0.0.1:8787/. Nếu cổng đang dùng, đặt `LOCAL_DUBBING_PORT` sang cổng khác; không dừng ứng dụng khác để chiếm cổng.

Kit không cần `npm install`; backend chỉ dùng module có sẵn của Node. Cần **Node.js 20+**, **Python 3.10+ (khuyến nghị 3.12)**, **FFmpeg/ffprobe** trong PATH. `yt-dlp` chỉ cần cho link YouTube/TikTok/X. Kiểm tra công cụ trong màn đầu tiên; một công cụ được phát hiện chưa có nghĩa model/GPU của nó đã chạy tốt.

## Liên kết môi trường đã có

Mở **Đã cài ở project khác?**, dán đường dẫn và chọn **Kiểm tra & liên kết**:

- Project: tìm Python trong `.venv`, `venv`, `env`.
- Venv/Conda: chọn thư mục môi trường hoặc Python trực tiếp.
- macOS: `/Users/ban/project-cu/.venv/bin/python`.
- Windows: `C:\DuAn\project-cu\.venv\Scripts\python.exe`.

Hai engine có thể dùng hai môi trường khác nhau. App chạy interpreter tương ứng bằng subprocess, không chép dependency hay sửa project cũ. Nếu code nằm trong layout `src/`, cài package vào môi trường đó trước. Phụ đề ảnh cần Pillow trong môi trường Windi TTS. Có thể dùng lại model cache Hugging Face của cùng tài khoản hệ điều hành; lần đầu thiếu model vẫn cần internet để tải. Môi trường venv không được đóng vào ZIP hoặc chuyển nguyên từ Mac sang Windows.

Nếu chưa có engine: `node setup.mjs --engines` tạo **hai venv riêng trong kit** và cài bộ nhận diện và bộ giọng local cùng công cụ phụ đề. Lệnh này tải dependency lớn, không cài Node/FFmpeg cấp hệ điều hành. Python/FFmpeg thiếu: cài từ nguồn chính thức theo OS rồi kiểm tra lại. Có thể chỉ cài engine thiếu bằng `node setup.mjs --engines --engine decode` hoặc `--engine voice`; cấu hình engine kia được giữ lại. Chọn Python gốc bằng biến `WINDI_PYTHON` nếu cần. Không cần chạy lệnh này nếu đã liên kết được môi trường cũ. Model nhận diện được cache riêng trong dữ liệu kit; model TTS dùng cache mặc định của SDK.

## Các bước dùng

1. Kiểm tra máy và chọn môi trường.
2. Chọn video hoặc dán đường dẫn file. Có thể tải link HTTPS YouTube/TikTok/X bằng yt-dlp; video yêu cầu login/DRM chưa được hỗ trợ. File tối đa 4GB và cần đủ dung lượng trống.
3. Chạy Windi Decode, hoặc nhập JSON timestamp sẵn có (mảng `{id,start,end,text}` hoặc JSON transcript có `segments`). Sửa lời thoại/thời gian rồi lưu.
4. Chọn cách dịch và bấm Dịch. Nội dung gửi sang LLM gồm lời thoại, thời lượng, ngữ cảnh của nhóm câu; không gửi video/audio. Xem/sửa bản dịch và lưu trước khi tạo tiếng.
5. Chọn **1 giọng** hoặc **2 giọng — MC + khách mời**, rồi chọn **Local — chạy trên máy** hoặc **API — tài khoản của bạn**. Local tự hiện giọng có trong bộ giọng local đã cài theo model; API cần lưu key rồi tải danh sách. Chọn tên giọng cho mỗi vai, dùng **Câu nghe thử** và nút nghe thử tương ứng để so sánh trước khi tạo toàn bộ tiếng. Mở mục Phụ đề để chỉnh style, màu và cỡ chữ.
6. Kiểm tra tỷ lệ `thời lượng TTS / slot gốc`. Ngoài 0.8–1.2, app yêu cầu sửa/viết lại và tạo tiếng lại. Không tự dịch lặp vô hạn. Trong khoảng cho phép, dùng cross time-stretch cân bằng audio/video; thời lượng thành phẩm có thể thay đổi nhẹ.
7. Chọn 720p/1080p, xuất MP4. Bản beta dùng FFmpeg và phụ đề PNG trong suốt, không cần Remotion hay bộ lọc ASS. SRT khớp timeline sau time-stretch. WAV là toàn bộ audio thành phẩm. Giữ âm thanh gốc giữ cả lời nói gốc ở mức nhỏ, chưa phải tách nhạc nền.

## Talkshow / phỏng vấn nhiều người

Trong **Giọng đọc & phụ đề**, chọn **2 giọng — MC + khách mời** để hiện hai vai và chọn tên giọng riêng cho mỗi vai. Trong **Lời thoại**, gán vai cho từng câu, dùng **Nghe gốc** để nghe đoạn tương ứng rồi **Lưu lời thoại & bản dịch**. Dùng cùng **Câu nghe thử** cho hai vai trước khi tạo toàn bộ tiếng; câu mẫu được lưu trong dự án. Audio nghe thử có player để phát lại, không phải tạo lại mỗi lần nghe.

Chọn **1 giọng** để toàn bộ câu dùng giọng của người đọc đầu tiên. Việc này giữ lời thoại, bản dịch và thời gian, gộp các nhãn người nói và yêu cầu tạo lại tiếng/video. Nếu chuyển lại 2 giọng, cần chọn lại giọng khách mời và gán lại các câu của khách mời. Transcript nhập sẵn vẫn nhận tối đa 20 vai; giao diện giữ nguyên dự án đó cho đến khi bạn chủ động chọn 1 hoặc 2 giọng.

Giọng local lấy từ môi trường bộ giọng local đang liên kết, không hardcode danh sách hay tự đoán giới tính. Với Local Voice Pro/Lite, kit đọc preset đi kèm SDK mà chưa nạp model; bấm **Tải lại giọng bộ giọng local** nếu vừa thay môi trường/cài SDK. Local Voice Standard hoặc SDK cũ có thể cần nạp model để gọi danh sách của SDK. Nút nghe thử chỉ bật sau khi chọn giọng. Local Voice Pro không có tham số style đọc tùy ý; mô tả/style theo preset. Giao diện mặc định dark mode, cùng bảng màu web Windi.

Có thể nhập transcript mang nhãn sẵn:

```json
[
  {"id":"1","start":0,"end":2,"text":"Hello","translation":"Xin chào","speaker":"host"},
  {"id":"2","start":2,"end":4,"text":"Nice to meet you","translation":"Rất vui được gặp bạn","speaker":"guest"}
]
```

`host` / `guest` được tạo thành vai để bạn đặt tên và chọn giọng. `speaker_id` cũng được nhận. Nhãn phải gồm chữ Latin, số, `_` hoặc `-`, dài tối đa 64 ký tự. **Windi Decode chưa tự tách người nói**; cần gán thủ công hoặc nhập nhãn từ công cụ ngoài. Chưa hỗ trợ hai người nói chồng nhau trên timeline. Nhãn được giữ qua dịch, tạo tiếng và lưu/mở lại.

## Windi Voice API (tùy chọn)

Chọn **API — tài khoản của bạn**, nhà cung cấp **Windi Voice API** trong Giọng đọc & phụ đề, mở **Cấu hình Windi Voice**, dán key `windi_voice_…` hoặc `windi_kit_…` đã tạo trong tài khoản Windi rồi bấm **Lưu API**. Cần gói Voice trả phí hoặc giấy phép Workflow hợp lệ. Base URL mặc định là `https://windistudio.app`, **không thêm `/v1`**. Không nhập model ID; Windi quản lý model Windi Clone Pro 2.1.

Bấm **Tải danh sách giọng API** để lấy thư viện và giọng clone được tài khoản cho phép dùng. Ở mỗi vai MC/Khách mời, chọn giọng theo tên trong danh sách (ID tự điền), rồi lưu. Câu nghe thử chung giúp so sánh hai giọng; nghe lại audio đã lưu không gọi tạo mới. Kit dùng giọng clone đã có, chưa tạo clone mới từ file audio.

Tạo tiếng dùng giao thức riêng `/api/v1/voice/generations`, Bearer key và `Idempotency-Key`. Kit lưu key chống tạo trùng trước khi gửi, mã lượt tạo, WAV và timestamp từ cùng lượt tạo; không nhận diện lại audio bằng bộ nhận diện. Phụ đề bản beta vẫn theo câu và timeline đã cân chỉnh. Khi mất mạng hoặc link tải hết hạn, chạy lại tiếp tục lượt đã lưu. Trạng thái chờ đối soát không tự tạo lượt khác; chỉ cho tạo lượt mới sau khi Windi xác nhận lượt trước thất bại. Token Windi không gửi sang URL lưu trữ audio.

Lưu key/tải danh sách chưa tạo tiếng. Nghe thử và tạo tiếng dùng credit Windi, riêng với subscription dịch. Không xóa file `.windi-job.json` để chữa lỗi vì file này giữ mã lượt tạo giúp tránh tạo trùng.

## API voice khác (tùy chọn)

Chọn nguồn **API**, rồi nhà cung cấp **ElevenLabs API** hoặc **OpenAI / API tương thích OpenAI**, mở **Cấu hình API voice**, nhập key và lưu. Lưu cấu hình không gọi tạo tiếng. Base URL mặc định gồm `/v1`; model ID và voice ID phải có quyền sử dụng trong tài khoản của bạn. Mở **Nhập voice ID thủ công** khi dịch vụ không trả danh sách giọng.

- **ElevenLabs:** mặc định model `eleven_v3`; tải giọng từ API tài khoản (có phân trang), hoặc nhập voice ID. Tạo tiếng qua `/v1/text-to-speech/{voice_id}`, nhận MP3 rồi chuẩn hóa WAV bằng FFmpeg. Chọn model có tiếng Việt và quyền truy cập phù hợp tài khoản.
- **OpenAI:** mặc định `gpt-4o-mini-tts`; danh sách preset theo tài liệu (không phải phép thử key/quota). Key và quyền model được xác minh khi nghe thử/tạo tiếng. Một số voice chỉ dùng được với một số model.
- **API tương thích:** thay Base URL, model ID và nhập voice ID của dịch vụ đó. Giao thức cần `POST /audio/speech` với Bearer key và JSON `{model,input,voice,response_format:"mp3"}`, trả audio trực tiếp. Không giả định mọi API voice đều tương thích; dịch vụ trả JSON/link, async job hoặc dùng schema khác cần adapter riêng. Có thể nối máy chủ local qua `http://127.0.0.1:PORT/v1`; dịch vụ remote cần HTTPS.

Nghe thử/tạo tiếng gửi **bản dịch** ra dịch vụ và có thể tính phí riêng, không thuộc ChatGPT/Antigravity subscription. Video/audio gốc không gửi ra API TTS. Không tự fallback sang API khi model local lỗi. Khi đổi nguồn/model, chọn lại voice để tránh ID không tương thích.

Dùng API voice không cần cài model bộ giọng local. FFmpeg vẫn cần cho audio/video; nếu gắn sub vào hình, Python trong môi trường Windi TTS cần Pillow và font Arial/DejaVu Sans. Có thể chọn Không gắn sub để xuất MP4 và SRT rời.

Key lưu riêng tại `.windi-dubbing/voice-api.json` (quyền 0600 trên POSIX), không mã hóa bằng keychain. API frontend chỉ trả trạng thái đã cấu hình; file key không được tải qua web hay đóng vào ZIP. Để trống giữ key cũ; đổi Base URL phải nhập lại key; nút **Xóa key đã lưu** loại key của nhà cung cấp đang chọn. Không chia sẻ cả thư mục dữ liệu. API lỗi không ghi body lỗi của nhà cung cấp vào log/project. Cache từng câu xét nguồn, endpoint, tài khoản, model, voice và bản dịch. Đổi vai/giọng vô hiệu hóa tiếng/video cũ; đổi cấu hình API yêu cầu tạo lại tiếng trước khi xuất.

## Dịch bằng subscription

**Codex CLI**: cài CLI chính thức và chạy `codex login` bằng ChatGPT. App xác minh `codex login status` báo ChatGPT, dùng `codex exec` với JSON schema, workspace riêng và sandbox read-only. Không nhận API-key mode. Không gửi vào chat desktop đang mở. Đã kiểm thử với CLI `0.162.0-alpha.17.2`; bản CLI khác cần có các flag được dùng trong providers.mjs. CLI cài qua npm trên Windows được gọi qua Node entrypoint để tránh shell quoting.

**Antigravity CLI**: cần `agy` hỗ trợ `-p`, `--output-format json`, `--json-schema`. Đăng nhập tương tác bằng tài khoản của bạn trước; app dùng cached credential của CLI. Không thay thế bằng Gemini API hoặc Gemini CLI. Adapter theo tài liệu chính thức, chưa chạy thật trên máy này vì chưa có `agy` trong PATH. Nếu bản cài của bạn chưa có CLI tương thích, dùng chế độ chat dưới đây.

**LLM trong chat hiện tại**: chọn chế độ này, bấm Tạo yêu cầu dịch, rồi nói với LLM **“Dùng skill Windi Dubbing dịch tiếp dự án này.”** Skill đọc `node agent.mjs pending PROJECT_ID` và nhập kết quả bằng `node agent.mjs submit PROJECT_ID FILE`. Có thể tải/nhập JSON thủ công trên UI. JSON kết quả là `{ "revision": <revision yêu cầu>, "segments": [{"id":"...","translation":"..."}] }`. Không đổi ID/timestamp; yêu cầu cũ bị từ chối. Chế độ này cần người dùng báo lại trong chat khi có yêu cầu mới, không tự đánh thức LLM ở chat đang rảnh.

Dịch cần internet, dùng quota của subscription và có thể hết quota. Gói ZIP không chứa tài khoản, token, API key hoặc subscription. Không tự chuyển sang API trả phí. Nhóm dịch đã thành công được cache theo nội dung/provider để lần retry sau lỗi dùng lại; voice từng câu cũng có cache. App không tự đăng nhập hoặc tải token ra frontend.

## Lưu, hủy và tiếp tục

Dữ liệu nằm trong `.windi-dubbing/` cạnh server.mjs: cấu hình môi trường, các project, video gốc đã copy, key API voice nếu bạn cấu hình, transcript, request/bản dịch, audio từng câu và thành phẩm. Đóng app không xóa dữ liệu. Mở lại chọn dự án đã lưu. Mỗi lần một tác vụ nặng; nút Hủy dừng cây tiến trình. Tác vụ bị ngắt được đánh dấu để chạy lại. Sửa lời thoại/giọng/sub sẽ vô hiệu hóa kết quả phụ thuộc; không dùng nhầm render cũ. Xóa thư mục project chỉ khi không cần dữ liệu; không xóa cả kit khi chưa sao lưu thành phẩm.

## Cấu hình đề xuất để thử

Chưa phải cấu hình tối thiểu đã benchmark. Một video 1080p, một tác vụ nặng mỗi lần, dịch qua subscription.

| Máy | Mức đề xuất để bắt đầu thử | Khuyến nghị |
|---|---|---|
| Windows | Windows 11 x64; i5 gen 10/Ryzen 5, 4 nhân/8 luồng; RAM 16GB; SSD trống 25GB | RAM 32GB; SSD trống 50GB; GPU NVIDIA tùy backend |
| Mac | Apple Silicon M1; macOS 14+; RAM 16GB; SSD trống 25GB | RAM 24–32GB; SSD trống 50GB |

8GB chỉ nên thử Local Decode Quick/Base, 720p, xử lý tuần tự; chưa cam kết hỗ trợ. Mac Intel/Windows ARM chưa QA. Dung lượng cần thêm phụ thuộc video, model và các bản xuất. CPU hoạt động được với engine tương thích; không hứa mọi model chạy Metal/CUDA. Local Decode Quick nhẹ nhưng nhận diện tiếng Việt có thể sai nhiều; kiểm tra lời thoại trước khi dịch, thử Local Decode Balanced nếu máy đủ RAM.

## Kiểm thử và phát hành

Xem QA.md để biết lớp nào đã kiểm chứng. Chạy `npm test` cho hợp đồng dữ liệu, persistence, invalidation, hủy tiến trình. `node pack.mjs` tạo ZIP sạch và SHA-256 trong `dist/`, loại dữ liệu/model/cache, cấu hình máy và artifact thử. Gói hiện tại không phải bộ cài desktop, không bundle Node/Python/FFmpeg/model. Chưa tự public website; sau dùng thử cần QA Windows, Antigravity, video dài và giao diện trong browser trước phát hành rộng.

## Thành phần và giấy phép

Thông tin tác giả, engine và giấy phép được giữ trong THIRD_PARTY.md. Các tên Local Voice/Local Decode là nhãn lựa chọn trong Windi; không phải tuyên bố sở hữu các model bên dưới. ZIP mã nguồn local không có chức năng bảo mật danh tính engine trước người xem mã.
