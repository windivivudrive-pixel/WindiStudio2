# Tìm repo và kiểm chứng

## Đường đi

1. Mở https://github.com/trending và https://github.com/trending?since=weekly. Chỉ dùng số `stars today/this week` đúng nhãn cửa sổ; tổng stars không chứng minh repo mới nổi. Nếu nguồn không trả danh sách, thử browser hoặc search; không tự điền số.
2. Lọc 8–12 ứng viên, chọn 3–5: AI workflow, browser automation, visual/content tools, skills, practical agents. Repo huấn luyện model chỉ chọn khi có góc dễ hiểu và nói rõ yêu cầu phần cứng.
3. Đọc README + docs/demo + license + release/commit/issues liên quan ở nguồn gốc. Ghi rõ cái nào do tác giả tuyên bố, cái nào đã chạy thử. Không chạy install script của ứng viên trong giai đoạn discovery.
4. Dùng `scripts/repo_snapshot.py owner/repo ... --out <file.json>` để lưu metadata GitHub công khai. Script không tự chứng minh trending. Lưu riêng URL Trending, ngày giờ và số tăng trong cửa sổ quan sát. Nếu không có dữ liệu tăng, nhãn “repo đáng thử”, không gọi “đang bùng nổ”.
5. Đánh giá biên tập thang 100: việc hữu ích 30; khả năng demo dễ hiểu 25; mức hợp WindiStudio 20; tín hiệu quan tâm mới 15; chi phí/cài đặt dễ tiếp cận 10. Điểm là nhận định biên tập, không phải dữ liệu GitHub.

## Bắt buộc phân biệt

- Open source ≠ không tốn tiền chạy. Tách license, subscription cho agent, API/model, GPU, cloud hosting.
- README nói có tính năng ≠ đã demo thành công. Thử nghiệm sau duyệt không được dựng kết quả giả.
- Số sao snapshot có thể khác Trending. Không ghép số từ hai thời điểm thành một claim.
- “Mới ra mắt” lấy từ release/created_at, không suy ra từ lần đầu nhìn thấy repo.
- “Nhanh gấp X / tiết kiệm Y / giá Z” cần baseline, cấu hình, đơn vị, thời điểm. Nếu không đủ, dùng mô tả định tính.
- Mọi screenshot số sao trên video phải có ngày kiểm tra; kiểm lại trước render nếu đã quá 24 giờ hoặc nguồn mâu thuẫn.

## Thẻ idea có thể duyệt

| Mục | Nội dung cần ghi |
|---|---|
| ID + repo | Một ID ổn định, link canonical |
| Audience + pain | Ai đang mất công ở việc gì |
| Promise | Một kết quả repo thật sự hỗ trợ |
| Hook | 1–2 câu, không cần lời dẫn giới thiệu kênh |
| Why now | Tín hiệu quan tâm có timestamp hoặc ghi chưa xác minh hot |
| Demo | Input → thao tác → output nào sẽ quay/chụp |
| Limits | API/GPU/cài đặt/license phù hợp mức ảnh hưởng |
| CTA | Trang WindiStudio có thật và đúng nội dung |

Lưu nguồn dùng trong từng claim. Tránh copy nguyên README thành lời thoại.
