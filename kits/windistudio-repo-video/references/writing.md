# Kịch bản: hook → bằng chứng → giá trị → hành động

## Giọng kênh

Người bạn biết chọn tool, nói có kiểm chứng. Tiếng Việt gần gũi, câu ngắn, chủ động. Giải thích “repo” là bộ mã/công cụ mở khi cần; chỉ nói tên kỹ thuật nếu nó làm rõ cách dùng. Không đọc một danh sách tính năng hoặc số sao thay cho câu chuyện.

Trong lời đọc, ưu tiên gọi repo là “dự án” và gọi context là “token” khi đang nói về chi phí/độ dài prompt; giữ thuật ngữ gốc trên hình hoặc caption nếu người xem cần tra cứu.

## Nhịp mặc định 45–55 giây

| Khoảng | Vai trò | Hình cần có |
|---|---|---|
| 0–3s | Nỗi đau + kết quả bất ngờ, chưa chào kênh | Một headline 4–8 từ và kết quả nhìn thấy được |
| 3–8s | Gọi tên repo, giải thích bằng một câu | Tên repo trong cửa sổ retro; hé lộ input/output |
| 8–15s | Trả một phần lời hứa bằng proof | Screenshot thật hoặc demo có nhãn nguồn |
| 15–28s | Hai bước/cơ chế đáng giá nhất | Input → thao tác → output; highlight đúng lời đọc |
| 28–36s | Điểm khiến người xem muốn thử + giới hạn | Kết quả cụ thể; một lưu ý ảnh hưởng quyết định |
| 36–45s | Cách bắt đầu + trả lời open loop | Bước đầu rõ ràng, không đọc lệnh dài |
| 45–50s | CTA có lợi ích, nối về WindiStudio | URL thực tế + watermark; giữ đủ lâu để đọc |

Không cần đủ bảy ý nội dung nếu chủ đề đơn giản. Chọn số minh họa kỹ thuật theo độ dài thoại, số ý và proof cần thiết; có thể thêm source capture khi cần chứng minh claim. Giữ từng visual 3–5 giây; nếu một ý dài hơn, tách thành các reveal có nghĩa và asset khác nhau. Không zoom/pan một ảnh để giả beat mới. Mỗi thay đổi hình phải khớp đúng câu thoại hoặc từ khóa đang nói; không đổi cảnh chỉ để gây nhiễu.

Hình repo không cần lúc nào cũng có người. Ưu tiên minh họa code, sơ đồ, UI, luồng dữ liệu và kết quả; xen kẽ cảnh có người khi sự hiện diện của người giúp hiểu tình huống. Mỗi kịch bản hoàn chỉnh bắt buộc có `image-prompts.md`, mapping từng beat tới prompt/capture. Mỗi prompt phải tự chứa ratio đã chốt, style lock, framing, hành động cụ thể và negative constraints; không tham chiếu rút gọn tới một prefix nằm ở chỗ khác. Nếu người dùng chỉ định video/tập chuẩn, tách palette, medium, composition, character scope, typography/caption policy và nhịp để làm style lock trước khi viết prompt. Source capture là proof và không thay thế prompt cho beat minh họa khác.

## Chọn hook

Soạn nội bộ 3 biến thể, tự chọn câu vừa mạnh vừa được nguồn hỗ trợ:

- Công việc quen thuộc: “Mỗi lần đổi quy trình lại phải vẽ lại sơ đồ? Repo này có một cách khác.”
- Curiosity có payoff: “Một file tài liệu có thể thành lớp học AI. Nhưng bạn cần biết khoản này trước.”
- FOMO cơ hội: “Nếu tuần này phải giải thích một workflow, lưu repo này trước khi ngồi vẽ từng ô.”

Phải cho thấy kết quả mà hook hứa. Không dùng “ai cũng dùng”, “99% chưa biết”, “miễn phí hoàn toàn”, “thay thế chuyên gia”, “chắc chắn viral” hoặc con số tăng trưởng không có bằng chứng. Không lấy “nhỏ hơn GPT-3” để hàm ý mạnh ngang GPT-3.

## Từ ngữ và giữ chân

- Một câu chứa một ý. Đọc thử để bỏ chỗ khó thở, câu nhiều acronym.
- Dùng “nhưng có một điều…” chỉ khi ngay sau đó có giới hạn quan trọng thật.
- Bằng chứng trước hoặc trong nửa đầu; không giữ toàn bộ lợi ích đến cuối.
- Không lặp số sao ở mở, giữa và kết. Proof xã hội là phụ; demo mới là chính.
- Khoảng 160–200 tiếng là ngân sách sơ bộ; dùng thời lượng voice thật để quyết định. Rút câu thay vì tăng tốc voice đến mức khó nghe.
- Chuẩn hóa cách phát âm tên repo/model trong bản TTS riêng; trên màn hình giữ chính tả chính thức.

## CTA quảng bá web

Mặc định dẫn `windistudio.app`, đã thấy trong cấu hình website ngày 2026-09-06; xác nhận trang mở được và có nội dung tương ứng trước sản xuất. Chỉ nói “mình để link/hướng dẫn/checklist trên WindiStudio” nếu đã xác minh item/trang ấy tồn tại. Nếu chưa có, dùng lời mời chung chính xác như “Khám phá thêm công cụ AI tại WindiStudio chấm app”; kèm URL repo trong caption bài đăng. Không tự đăng bài web để làm cho lời quảng cáo đúng.

CTA chính là truy cập web; lời mời follow có thể nằm ở caption bài đăng, tránh đọc hai ba yêu cầu liên tiếp. Caption bài đăng 2–4 câu, một lợi ích, một giới hạn nếu quan trọng, link nguồn, tối đa 3–5 hashtag liên quan.
