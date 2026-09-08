# Kịch bản: hook → bằng chứng → giá trị → hành động

## Giọng kênh

Người bạn biết chọn tool, nói có kiểm chứng. Tiếng Việt gần gũi, câu ngắn, chủ động. Mặc định viết cho người non-tech: bắt đầu từ việc họ đang làm và kết quả họ muốn, không bắt đầu từ kiến trúc hoặc cách cài đặt. Giải thích “repo” là bộ mã/công cụ mở khi cần; chỉ nói tên kỹ thuật nếu nó làm rõ cách dùng. Không đọc một danh sách tính năng hoặc số sao thay cho câu chuyện.

## Bộ lọc non-tech trước khi chốt lời đọc

1. Gạch dưới mọi acronym, tên tiến trình, protocol, port, flag và câu lệnh. Bỏ khỏi lời đọc nếu chi tiết đó không thay đổi quyết định dùng công cụ.
2. Chuyển chi tiết cần giữ sang ngôn ngữ công việc. Ví dụ: “relay fallback” → “đường dự phòng khi hai máy không nối thẳng được”; “self-host” → “dùng máy chủ do bạn kiểm soát”.
3. Đưa spelling kỹ thuật lên hình nhỏ hoặc caption bài đăng. Không bắt voice đọc liên tiếp nhiều từ tiếng Anh.
4. Thay mô tả cơ chế bằng một tình huống nhìn thấy được: hỗ trợ máy người thân, lấy file từ máy văn phòng, truy cập máy dựng, hỗ trợ một nhóm nhỏ.
5. Sau khi đọc xong, trả lời được bằng một câu: “Công cụ giúp ai làm việc gì?” Nếu câu trả lời vẫn là mô tả kiến trúc, viết lại.

Giữ tối đa một đoạn giải thích cơ chế trong video 45–55 giây, thường không quá 8–10 giây. Phần còn lại dành cho ứng dụng, kết quả, giới hạn và cách bắt đầu. Chi tiết kỹ thuật có thể xuất hiện trực quan trong sơ đồ nhưng phải dùng nhãn phổ thông nổi bật hơn tên chính thức.

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

Không cần đủ bảy cảnh nếu chủ đề đơn giản. Tránh 3 giây end card không có nội dung. Có thay đổi ý nghĩa/hình sau khoảng 2–4 giây: reveal kết quả, chuyển vùng demo, tô bước đang nói; không đổi cảnh chỉ để gây nhiễu.

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
