# Windi Dubbing Kit — thiết lập giọng và xử lý trong chat

Giao diện local dành cho **chọn giọng, nghe thử, ngữ điệu, phong cách dịch và phụ đề**. Bấm **Lưu thiết lập** một lần; tiếp tục nhận diện, dịch và xử lý video trong chat Gemini hoặc agent đang dùng skill Windi Dubbing. Kit vẫn ở beta, chưa QA model thật và đa nền tảng cho giao diện mới.

## Bắt đầu

1. Giải nén kit vào dự án. Không cần `npm install`; backend dùng module có sẵn của Node.
2. Nhờ agent đọc `SKILL.md`, kiểm tra môi trường và chạy `node setup.mjs --project <đường-dẫn-dự-án>` để đăng ký skill.
3. Chạy `node server.mjs` hoặc mở `Start Windi Dubbing.command` / `Start Windi Dubbing.bat`. Giữ terminal đang chạy.
4. Mở địa chỉ loopback được in (mặc định `http://127.0.0.1:8787`). Nếu cổng đã dùng, chọn `LOCAL_DUBBING_PORT` khác, không dừng dịch vụ khác.
5. Chọn giọng, nghe thử nếu cần; chọn cách dịch, ngữ điệu và phụ đề. Bấm **Lưu thiết lập** rồi **Sao chép lời nhắn cho chat**, dán vào chat cùng video.

Cần Node.js 20+, Python (khuyến nghị 3.12), FFmpeg/ffprobe. `yt-dlp` chỉ cần khi tải video từ link. **Kết nối máy** cho phép liên kết project, venv/Conda hoặc Python đã có; nhận diện local dự phòng nằm trong phần mở rộng. Kiểm tra thấy thư viện không chứng minh model/GPU đã chạy thành công. Nếu cần cài model, dùng `node setup.mjs --engines` sau khi kiểm tra và giải thích dung lượng tải. Máy 16GB RAM/SSD trống 25GB là điểm bắt đầu thử, chưa phải benchmark. Windows, Mac Intel/ARM cần QA riêng.

## Giao diện chỉ dành cho thiết lập

- **Giọng đọc:** một người hoặc MC + khách mời; chọn Local/API, tên từng vai, tên giọng và câu nghe thử chung. Catalog local lấy từ môi trường/model thật, không đoán giới tính. Local Voice Pro/Lite đọc preset đã cài trước khi nạp model; Standard hoặc SDK cũ có thể nạp model khi tải catalog.
- **Cách dịch & ngữ điệu:** tự nhiên/sát nghĩa/ngắn gọn/kể chuyện; gần gũi/điềm tĩnh/năng lượng/chuyên nghiệp; ghi chú xưng hô, thuật ngữ. Các lựa chọn đi vào prompt dịch và sửa độ dài. Ngữ điệu hướng dẫn lời viết, ngắt câu; preset local không có điều khiển cảm xúc tùy ý.
- **Giao diện & phụ đề:** sáng/tối, chữ viền/nền hộp/SRT rời, font có sẵn trên máy, màu chữ, cỡ chữ, màu nền và độ mờ nền 0–100%, độ phân giải, âm lượng gốc. Nền hộp bật màu/độ mờ nền; 0% trong suốt, 100% nền đặc. Font và nền được áp dụng vào PNG phụ đề khi xuất; SRT rời không lưu kiểu chữ. Mẫu bên phải minh họa kiểu chữ, chưa phải bản xuất.

Một nút **Lưu thiết lập** lưu toàn bộ lựa chọn và kết nối API đang sửa, áp dụng cho dự án hiện tại và mặc định dự án mới. Mặc định không chứa video, transcript, audio hay API key. Đổi tab giữ bản nháp. Nghe thử/tải catalog dùng bản nháp, không ghi đè lựa chọn đã lưu. Nếu vừa sửa kết nối API, lưu trước khi tải giọng/nghe thử. Nghe lại audio đã tạo không gọi tạo mới. Chuyển về một giọng gộp nhãn người nói; chuyển lại hai giọng cần gán lại các câu của khách mời trong chat.

## Nhận diện và dịch trong chat Gemini / agent

Kit **không tự gửi sang chat Gemini, không tự đánh thức chat, không lấy token**. Chat có quyền gọi công cụ local và đọc skill sẽ thực hiện workflow trong chính cuộc trò chuyện đó. Gemini web không có công cụ truy cập máy thì có thể trả JSON để agent nhập. Nút sao chép cung cấp lời nhắn và ID dự án; nội dung dựa trên thiết lập đã lưu.

Chạy các lệnh tại thư mục kit. Nếu bridge ở cổng khác, đặt `WINDI_DUBBING_URL=http://127.0.0.1:PORT`.

```sh
node agent.mjs projects
node agent.mjs context PROJECT_ID
node agent.mjs import-video PROJECT_ID /absolute/video.mp4
node agent.mjs import-transcript PROJECT_ID transcript.json
node agent.mjs inspect PROJECT_ID
```

`context` trả cấu hình, vai, transcript và prompt theo thiết lập đã lưu, không chứa key. Dùng phụ đề/transcript timestamp hoặc khả năng đọc video có sẵn trong chat. Không bịa thời gian/người nói. Khi cần local decode:

```sh
node agent.mjs job PROJECT_ID transcribe
node agent.mjs wait PROJECT_ID
node agent.mjs inspect PROJECT_ID
```

`wait` chờ tối đa 45 giây rồi trả trạng thái; chạy lại nếu tác vụ chưa xong. Windi Decode chưa tự diarization và chưa hỗ trợ câu chồng nhau. Chat gán `speaker` theo bằng chứng và các vai đã lưu.

File transcript nhập là mảng hoặc `{ "segments": [...] }`:

```json
[
  {"id":"1","start":0,"end":2,"text":"Hello","translation":"Xin chào","speaker":"speaker_1"},
  {"id":"2","start":2,"end":4,"text":"Nice to meet you","translation":"Rất vui được gặp bạn","speaker":"guest"}
]
```

Nhãn mới được giữ và cần chọn giọng trước khi tạo tiếng. Để sửa giọng, cấu hình hoặc gán lại vai trong chat, `node agent.mjs configure PROJECT_ID file.json` nhận cùng PATCH contract dự án (`config`, `speakers`, `segments`, `speakerCount`). Lệnh này không thay mặc định cá nhân.

Dịch theo cơ chế request/revision để tránh nộp nhầm bản cũ:

```sh
node agent.mjs job PROJECT_ID translate
node agent.mjs wait PROJECT_ID
node agent.mjs pending PROJECT_ID
node agent.mjs submit PROJECT_ID translated.json
```

Dự án mới và nút Lưu thiết lập dùng `provider: "chat"`. Với dự án cũ, agent đặt provider chat bằng `configure` trước. Kết quả dịch là `{ "revision": <revision yêu cầu>, "segments": [{"id":"1","translation":"Xin chào"}] }`. Giữ đủ ID; timestamp/speaker giữ nguyên. Đổi phong cách/ngữ điệu/ghi chú làm request cũ hết hiệu lực, giữ transcript/bản dịch hiện tại. `rewrite` tạo request sửa độ dài theo ratio và cùng phong cách. Không cần bấm tạo request trong UI.

Các adapter CLI cũ vẫn giữ cho tác vụ được yêu cầu riêng: Codex cần ChatGPT auth (`codex login`, không API-key mode); Antigravity cần `agy` hỗ trợ headless/schema, đã đăng nhập. Desktop app mở không chứng minh CLI đăng nhập. Không tự chuyển sang API trả phí. Subscription của LLM không nằm trong giá kit.

## Voice local và API

Mặc định Local Voice Pro; có Lite và Standard. Mỗi vai cần giọng riêng; không tự đoán giọng phù hợp. Nếu chưa có runtime, dùng Kết nối máy hoặc chọn API khi người dùng yêu cầu. Không fallback API khi local lỗi.

Kết nối API trong mục mở rộng **Kết nối API** được lưu bằng nút Lưu thiết lập chung. Để trống key giữ key cũ; đổi Base URL cần nhập lại key. Chọn xóa key chỉ áp dụng khi lưu. Key chỉ nằm tại `.windi-dubbing/voice-api.json` (0600 POSIX), không mã hóa keychain, không đưa vào project/defaults/prompt/log/ZIP, không trả lại frontend.

- **Windi Voice API:** URL gốc `https://windistudio.app`, không `/v1`; key `windi_voice_…` / `windi_kit_…`, cần gói Voice hoặc giấy phép Workflow hợp lệ. Không nhập model ID. Tải thư viện và clone được tài khoản cho phép; kit dùng clone có sẵn, chưa tạo clone mới. Dùng giao thức riêng `/api/v1/voice/generations`, Bearer + Idempotency-Key. Key chống tạo trùng được lưu trước POST; WAV/timestamp/mã lượt tạo từ cùng lượt, không decode lại audio sinh ra. Retry tiếp tục lượt cũ khi pending/unknown/lỗi tải; chỉ tạo lượt mới sau khi server xác nhận failed. Không xóa `.windi-job.json` để chữa lỗi. Không chuyển token sang storage.
- **ElevenLabs:** Base URL có `/v1`; model mặc định `eleven_v3`. Catalog theo tài khoản; có nhập voice ID thủ công. Adapter nhận audio rồi chuẩn hóa WAV. Chọn model hỗ trợ tiếng Việt và quyền tài khoản.
- **OpenAI / API tương thích:** Base URL có `/v1`; mặc định `gpt-4o-mini-tts`, có model/voice ID thủ công. Cần POST `/audio/speech` với Bearer, JSON `{model,input,voice,response_format:"mp3"}`, trả audio trực tiếp. Dịch vụ trả JSON/link/async cần adapter riêng. Remote cần HTTPS; loopback HTTP được phép. Preset không chứng minh key/model/quota hoạt động.

Tải danh sách/lưu key chưa tạo tiếng. **Nghe thử** API gửi câu mẫu và có thể dùng credit, tạo toàn bộ tiếng gửi bản dịch. Đây là chi phí riêng với subscription dịch. Không tự thử quota thật khi sửa code. Thay key/model/voice vô hiệu hóa kết quả phụ thuộc; retry giữ các bảo vệ chống tạo trùng.

## Tạo tiếng và xuất qua chat

Chỉ chạy khi được yêu cầu:

```sh
node agent.mjs job PROJECT_ID tts
node agent.mjs wait PROJECT_ID
node agent.mjs inspect PROJECT_ID
```

Ratio ngoài 0.8–1.2 cần viết lại/tạo tiếng lại; không ép tốc độ mạnh để bỏ qua. Khi người dùng yêu cầu xuất, `node agent.mjs job PROJECT_ID render`, rồi `wait`/`inspect`. Render beta dùng FFmpeg, phụ đề PNG trong suốt và SRT, không phụ thuộc Remotion. MP4/SRT/WAV nằm trong thư mục dự án; agent báo đường dẫn sau khi kiểm tra. Giữ âm thanh gốc giữ cả lời nói gốc, chưa tách nhạc. Xuất có thể đổi nhẹ độ dài do cross time-stretch. API TTS không cần model local; gắn sub cần Python/Pillow và font tương thích.

Mỗi lần một tác vụ nặng. `node agent.mjs cancel PROJECT_ID` hủy; retry trong chat, không xóa dữ liệu để chữa lỗi. `.windi-dubbing/` giữ cấu hình, defaults, dự án và media; đóng app không xóa. Không chia sẻ toàn bộ thư mục vì có key nếu đã cấu hình.

## Kiểm tra và đóng gói

`npm test` kiểm tra contract, lưu/revision, defaults, preview và các adapter bằng fixture. Kết quả fixture không thay kiểm thử model thật hay quota dịch vụ. `node pack.mjs` tạo ZIP sạch và SHA-256 trong `dist/`, loại dữ liệu/model/key/cache. Gói không bundle Node/Python/FFmpeg/model. Public website là tác vụ riêng. Xem QA.md và THIRD_PARTY.md để biết phạm vi kiểm chứng và attribution.

### Popup / karaoke và máy yếu

Trong **Giao diện & phụ đề**, bật **Chữ popup / karaoke**, chọn chỉ tô từ đang đọc (giữ nguyên cỡ chữ), tô từ kèm phóng chữ trong cụm 5 từ, hoặc popup từng từ; đặt màu nhấn và cỡ popup 100–150%. Dùng chung font, màu chữ, viền, màu nền và độ mờ nền. Hiệu ứng được ghép vào MP4; SRT rời vẫn chứa câu đầy đủ. Nhịp từng từ hiện được chia đều theo thời lượng câu sau khi khớp giọng, chưa phải forced alignment. Tối đa 300 từ mỗi câu karaoke; nên chia câu ngắn.

Model giọng hiện trực tiếp ở tab Giọng đọc; model nhận diện dự phòng ở mục mở rộng của tab Cách dịch. **Kết nối máy → Áp dụng model đề xuất** chỉ đổi bản nháp; chọn lại giọng nếu model thay đổi rồi bấm **Lưu thiết lập**. Không tự đổi model dự án cũ.

Chạy `node setup.mjs --check` trước khi cài: chỉ kiểm tra CPU, RAM, kiến trúc, dung lượng và NVIDIA nếu có, không tải model. `--engines` kiểm tra trước pip/venv, yêu cầu dự phòng 4 GB RAM và 6 GB ổ đĩa; chỉ cài thư viện. Model được tải khi dùng lần đầu và mỗi tác vụ kiểm tra lại dung lượng trên ổ cache thực tế (Decode trong dữ liệu kit; giọng theo HF_HOME/XDG_CACHE_HOME hoặc cache mặc định Hugging Face). Catalog v3 đọc file SDK, không tải model; thiếu preset yêu cầu cập nhật SDK.

Đề xuất cho CPU: RAM dưới 12 GB hoặc ≤4 luồng dùng Lite; máy còn lại dùng Pro. Decode: RAM dưới 8 GB dùng Quick, dưới 20 GB dùng Base, cao hơn dùng Balanced. Ngưỡng chặn bảo thủ trước nạp/tải: Decode Quick/Base/Balanced/Accurate lần lượt 4/6/8/16 GB RAM; Voice Lite/Pro/Standard 4/8/16 GB. Cần dung lượng dự phòng model 1/1/2/4 GB (Decode) hoặc 1/3/4 GB (Voice), cộng 1 GB. Đây là chính sách dự phòng của kit, không phải yêu cầu tối thiểu nhà cung cấp hay benchmark; không đảm bảo tốc độ/chất lượng. Không tự bật CUDA hoặc int8 khi chưa kiểm chứng runtime/CPU.

Căn cứ lựa chọn Lite và hạn chế tiếng Anh: [tài liệu VieNeu](https://github.com/pnnbao97/VieNeu-TTS#v3-nano-preview--for-edge-devices--weak-cpus-only-). Các mức VRAM tham khảo của nhận diện tại [OpenAI Whisper](https://github.com/openai/whisper#available-models-and-languages); không đồng nhất VRAM với RAM hệ thống. Chưa kiểm thử cài sạch hoặc tải/chạy model mới trên máy yếu trong lần sửa này.
