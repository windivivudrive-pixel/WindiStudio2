# Windi Local Dubbing — đặc tả ứng dụng

Ngày: 09/10/2026. Trạng thái: thiết kế triển khai, chưa phải app hoặc bộ cài đã kiểm thử.

## Phạm vi đã thống nhất

- UI tiếng Việt dành cho người non-tech, mở ở địa chỉ loopback do launcher cung cấp, ví dụ `http://127.0.0.1:8787`. Chỉ phục vụ trên máy đang chạy; không cần IP LAN.
- Xử lý video, nhận diện lời thoại, tạo giọng, phụ đề và render trên máy khách.
- Bước dịch và viết lại câu dùng subscription đăng nhập trong hệ sinh thái Codex hoặc Antigravity. Không yêu cầu Gemini/OpenAI API key, không cần model dịch local.
- Dịch bằng subscription cần internet, có giới hạn sử dụng theo tài khoản. Không quảng cáo là hoàn toàn offline hay quota vô hạn.
- Mỗi bước có nút chạy, trạng thái, tiến độ thật, hủy và thử lại. Lưu dự án để tiếp tục sau khi đóng app.
- Có chọn giọng, nghe thử, sửa câu, chọn style phụ đề và xem video preview.
- Giá 169.000đ áp dụng cho sản phẩm đang được giới thiệu trên website; không bao gồm hay cấp subscription LLM cho khách.

## Kết nối subscription

### Codex

Bridge trên máy khách chạy một Codex App Server được hỗ trợ, giao tiếp qua stdio và tạo phiên dịch riêng cho dự án dub.

1. Khởi tạo kết nối, kiểm tra phiên bản giao thức.
2. Đọc trạng thái tài khoản qua `account/read`; xác nhận chế độ ChatGPT, không lấy API-key mode làm subscription.
3. Nếu chưa đăng nhập: sử dụng luồng đăng nhập ChatGPT do App Server quản lý. Không đọc, trích xuất hay gửi token cho frontend.
4. Tạo thread riêng, gửi turn dịch với dữ liệu từng câu và định dạng kết quả đã quy định.
5. Nhận event tiến độ/kết quả, chỉ đánh dấu thành công khi turn hoàn tất và kết quả qua kiểm tra.
6. Hủy qua giao thức được hỗ trợ; khi hết quota, giữ kết quả đang có và báo thời điểm thử lại nếu provider cung cấp.

Đăng nhập trong app desktop không tự nó chứng minh runner đọc được cùng trạng thái xác thực. Setup phải xác minh đúng runtime và auth store; có thể cần đăng nhập lại cùng tài khoản qua luồng chính thức. Không hứa gửi vào chat desktop đang mở.

### Antigravity

Bridge chạy Antigravity CLI `agy`, không dùng Gemini API hoặc thay bằng Gemini CLI.

1. Phát hiện CLI/phiên bản và phương thức xác thực được hỗ trợ.
2. Dùng luồng đăng nhập chính thức nếu chưa có credential được CLI nhận diện.
3. Gọi tác vụ headless, có JSON schema cho bản dịch; nhận `structured_output` và trạng thái kết thúc.
4. Có thể dùng chế độ stdin/stdout stream-json giữ một phiên liên tục cho việc dịch và viết lại câu. Phải kiểm tra khả năng kết hợp stream với schema trên phiên bản đóng gói; không suy ra chỉ từ hỗ trợ riêng từng flag.
5. Phân biệt hết quota, chưa đăng nhập, timeout và lỗi kết quả. Không tự chuyển sang API trả phí.

Tài liệu Google mô tả xác thực thống nhất giữa CLI và desktop/IDE, nhưng bản phát hành vẫn cần kiểm tra trên cài đặt thật. MCP là phần mở rộng tùy chọn để gọi workflow từ chat; MCP đơn thuần không tự đẩy prompt vào một agent đang rảnh.

### Hợp đồng dịch chung

Mỗi câu gồm `segment_id`, thời điểm bắt đầu/kết thúc, văn bản gốc, ngôn ngữ và giới hạn thời lượng. Gửi ngữ cảnh lân cận, bảng tên riêng và cách xưng hô cùng từng nhóm câu. Kết quả phải có một bản dịch cho từng ID; từ chối ID lặp, ID thiếu/thừa, nội dung rỗng hoặc timestamp bị thay đổi.

App giữ ID/thời gian chuẩn. LLM chỉ dịch và viết lại; không điều khiển FFmpeg, TTS hoặc cài môi trường. Transcript là dữ liệu, không phải chỉ dẫn cho agent. Runner cần giới hạn công cụ và phạm vi dữ liệu theo cơ chế của provider; không bật bỏ qua bảo vệ toàn hệ thống.

## Bước 0 — kiểm tra môi trường

Đây là màn hình đầu tiên trước khi tạo dự án.

- OS, kiến trúc CPU, RAM khả dụng, dung lượng trống và quyền ghi thư mục dự án.
- Runtime đi kèm gói: Python, Node, trình render và font phụ đề. Không chỉ tìm command trong PATH vì package có thể chứa runtime riêng.
- FFmpeg/ffprobe, yt-dlp nếu dùng URL, Whisper/model đã chọn, VieNeu/model và danh sách giọng thực tế.
- Codex/Antigravity runner, đăng nhập, model được chọn và khả năng nhận kết quả hợp lệ.
- Cổng loopback khả dụng, kết nối UI/bridge và quyền truy cập chỉ dành cho phiên local.

Hiển thị từng dòng **Sẵn sàng / Cần chuẩn bị / Không hỗ trợ**. Khi thiếu thành phần, nêu dung lượng tải và có nút **Chuẩn bị môi trường**. Cài runtime riêng trong thư mục ứng dụng, không sửa Python hệ thống. Mạng cần cho tải model/công cụ và bước dịch.

Kiểm tra chức năng sau setup:

1. Tách và đọc một đoạn âm thanh ngắn bằng FFmpeg.
2. Nhận diện đoạn mẫu bằng Whisper.
3. Tạo giọng thử và kiểm tra file WAV có âm thanh, độ dài hợp lệ.
4. Render đoạn preview có font/sub, kiểm tra video đầu ra bằng ffprobe.
5. Test dịch chỉ sau thao tác kết nối/test của người dùng; ghi rõ lần test dùng quota subscription.

Chỉ báo sẵn sàng toàn pipeline sau khi kiểm tra các bước bắt buộc. Cho phép đánh dấu thành phần tùy chọn không cần, ví dụ yt-dlp khi chỉ dùng file.

## Luồng UI

0. Kiểm tra môi trường và kết nối tài khoản.
1. Chọn file hoặc URL, xem metadata và video gốc.
2. Nhận diện lời thoại; bảng câu có timestamp, sửa câu và gộp/tách câu.
3. Dịch; chọn Codex/Antigravity, xưng hô, văn phong và bảng tên riêng. So sánh gốc/dịch.
4. Giọng đọc; danh sách lấy từ model đã cài, nghe thử, tạo lại riêng từng câu. Không tự áp tên giọng của phiên bản khác.
5. Căn tiếng và phụ đề; preset, font, cỡ chữ, màu/viền, vị trí, số dòng, sub đơn ngữ/song ngữ. Word highlight chỉ hiện nếu đã có alignment cấp từ cho audio cuối cùng.
6. Preview và xuất; MP4, SRT và tùy chọn file WAV. Hiển thị thời lượng dự kiến, thư mục lưu và tiến độ thật.

Preview nằm cạnh khu vực thao tác trên desktop, xếp dọc trên màn hình hẹp. Log kỹ thuật nằm trong mục Chi tiết; lỗi chính dùng ngôn ngữ dễ hiểu.

## Căn thời lượng

Giữ quy tắc từ skill: đo `T_tts / T_orig`, ưu tiên viết lại khi câu dài/ngắn vượt ngưỡng; chênh lệch nghiêm trọng phải được xử lý trước khi ghép. Giới hạn số lần viết lại, sau đó đánh dấu câu cần sửa thủ công.

Có hai chế độ cần phân biệt rõ:

- Giữ nhịp video gốc: ưu tiên sửa bản dịch để vừa slot, giới hạn biến đổi tốc độ tiếng.
- Cân tốc độ hình và tiếng theo skill: cross time-stretch thay đổi cả độ dài cảnh. Tính lại timeline tích lũy, cue phụ đề và mọi điểm ghép từ artifact cuối.

Không tuyên bố lip-sync. Âm nền là tính năng riêng: giảm tiếng gốc không đồng nghĩa tách được nhạc khỏi lời nói.

## Chạy lại và khôi phục

- Lưu fingerprint của input và cấu hình từng bước cùng artifact.
- Đổi màu/font sub chỉ vô hiệu hóa preview/render.
- Đổi giọng vô hiệu hóa TTS, căn thời lượng và render, giữ transcript/bản dịch.
- Sửa một câu chỉ làm lại artifact liên quan rồi cập nhật timeline.
- Khi mất mạng/hết quota: giữ bản dịch đã hoàn thành, tiếp tục nhóm chưa chạy sau khi kết nối lại.
- Job ID và segment ID cố định, retry không tạo bản ghi hoàn tất trùng.
- Tác vụ nặng chạy tuần tự mặc định để tiết kiệm RAM; giải phóng model nhận diện trước khi tải TTS nếu máy yếu.

## Cấu hình đề xuất ban đầu

Các mức dưới đây là ngưỡng thiết kế để bắt đầu kiểm thử video 1080p, một dự án/tác vụ nặng tại một thời điểm, dịch qua subscription. Chưa phải cấu hình tối thiểu đã benchmark hoặc cam kết tốc độ.

| Hệ điều hành | Mức đề xuất tối thiểu để thử nghiệm | Khuyến nghị |
| --- | --- | --- |
| Windows | Windows 11 x64; Core i5 thế hệ 10 hoặc Ryzen 5 tương đương, từ 4 nhân/8 luồng; RAM 16GB; SSD trống 25GB | CPU 6–8 nhân gần đây; RAM 32GB; SSD trống 50GB; NVIDIA VRAM 6–8GB tùy chọn nếu backend tương thích |
| macOS | Apple Silicon M1; RAM 16GB; macOS 14 hoặc mới hơn; SSD trống 25GB | M2/M3/M4 hoặc mới hơn; RAM 24–32GB; SSD trống 50GB |

- GPU rời không bắt buộc với backend CPU đã xác minh. Mac dùng backend arm64 tương thích; không giả định model nào cũng được tăng tốc Metal.
- Máy 8GB: chỉ thử chế độ tiết kiệm với model nhận diện nhỏ, preview 720p và xử lý tuần tự. Chưa đưa vào mức hỗ trợ chính thức.
- Chưa cam kết Mac Intel hoặc Windows ARM; cần bộ cài và kiểm thử tương thích riêng.
- Dung lượng cần có còn phụ thuộc file gốc, thời lượng, cache và các bản render; kiểm tra lại theo dự án, không chỉ lúc cài app.
- Chốt/pin phiên bản Whisper, VieNeu, model và giọng trước khi benchmark. VieNeu v3 Turbo bỏ qua tham số `style`; không tạo điều khiển giả. Không tự thay model local bằng engine cloud.

Ma trận QA trước phát hành: Windows CPU 16GB, Windows NVIDIA, Mac M1 16GB, Mac đời mới; kiểm tra cài sạch, login subscription, video 1/5/15 phút, hết quota, mất mạng, tắt/mở lại, đường dẫn có dấu/khoảng trắng, sửa một câu, font/sub và MP4 bằng player ngoài app. Đo RAM đỉnh, ổ đĩa, thời gian từng bước và chất lượng.

## Nguồn chính thức đã đọc

- Codex App Server: https://learn.chatgpt.com/docs/app-server
- Codex authentication: https://learn.chatgpt.com/docs/auth
- Antigravity headless: https://antigravity.google/docs/cli/headless
- Antigravity installation/auth: https://www.antigravity.google/docs/cli/install/
- Antigravity IDE integrations/auth: https://www.antigravity.google/docs/ide/extensions/
- Antigravity MCP: https://antigravity.google/docs/mcp
- VieNeu: https://github.com/pnnbao97/VieNeu-TTS

## Kiểm tra sơ bộ máy phát triển 09/10/2026

macOS arm64. Có Python, Node, FFmpeg/ffprobe, yt-dlp và Codex trong PATH. Không tìm thấy `whisper` hoặc `agy` trong PATH; chưa kiểm tra runtime nằm trong virtualenv/gói app nên không kết luận chúng chưa cài. RAM/CPU bị sandbox chặn truy vấn. SSD báo còn khoảng 22GiB tại thời điểm kiểm tra. Chưa chạy model, dịch bằng subscription hay render kiểm chứng.
