# Hướng dẫn Biên tập Mô tả Tool & Easy Prompt (WindiStudio)

## 1. Triết lý chung cho Non-tech & FOMO
- **Mục tiêu**: Người dùng đọc vào là hiểu ngay giá trị trong 5 giây, thấy rõ tính hữu dụng vượt trội so với việc KHÔNG DÙNG, và có thôi thúc muốn dùng thử ngay.
- **Đối tượng**: Nhà sáng tạo nội dung, marketer, người làm video/audio, người dùng văn phòng không biết lập trình (non-tech).
- **Tránh**:
  - Không liệt kê thông số kỹ thuật khô khan (ví dụ: "chạy trên Python 3.10, kiến trúc Transformer...").
  - Không viết câu từ hành chính, rào đón ("Tôi không biết lập trình...").
  - Không bịa đặt số sao, giải thưởng hay cam kết view/tiền mà tác giả không công bố.

---

## 2. Quy chuẩn Mô tả Tool trên Website vs Mạng Xã Hội

| Thành phần | Hiển thị trên Website (`/tool/[slug]`) | Bài chia sẻ Facebook (`facebookPost`) |
|---|---|---|
| **Hook** | Ngắn gọn, in đậm, nêu ngay nỗi đau / giải pháp lớn nhất | Tương tự |
| **Summary** | Nêu rõ bài toán, tác giả/nguồn, social proof (stars/forks/uy tín) | Nêu rõ bài toán + social proof |
| **Điểm nổi bật** | 3-5 gạch đầu dòng tính năng gây FOMO (đặt tên tính năng kêu) | 3-5 gạch đầu dòng tính năng |
| **So sánh Dùng vs Không dùng** | Nhấn mạnh sự khác biệt vượt trội | Nhấn mạnh sự khác biệt |
| **Ví dụ / Bắt đầu** | Hiển thị trong khối `CreatorGuide` bên dưới | Kèm hướng dẫn thử ngay & cách bắt đầu |
| **CTA (Kêu gọi hành động)** | **KHÔNG CÓ CTA** (để người dùng trượt ngay xuống nút Copy Easy Prompt) | **CÓ CTA** (`Xem hướng dẫn và copy Easy Prompt... 👇` + Link + Hashtags) |

---

## 3. Quy chuẩn Easy Prompt Thực Chiến (Mới)

Easy Prompt được thiết kế để người dùng non-tech có thể **Copy và Dùng Ngay** vào bất kỳ mô hình AI nào (Gemini, Claude, Cursor, Codex, ChatGPT) mà không tạo cảm giác hoang mang, rườm rà hay lo sợ rủi ro bảo mật:

### Cấu trúc Prompt Tiếng Việt:
```text
${officialUrl}
Hãy đọc kỹ hướng dẫn từ README của repo trên và [Mục tiêu công việc cụ thể theo thể loại]:

1. [Tiêu chí chất lượng / Tối ưu trải nghiệm]: Thực hiện tự nhiên, dễ hiểu, không hàn lâm.
2. [Bảo toàn nội dung & số liệu]: Giữ nguyên 100% dữ kiện gốc, không tự ý bịa thêm.
3. [Hướng dẫn ngắn gọn / Tùy chỉnh phong cách]: Trình bày dễ làm lại, hỗ trợ giọng mẫu.
4. Bảo mật dữ liệu: Giữ bí mật và an toàn cho toàn bộ thông tin tôi cung cấp, không chia sẻ ra bên ngoài.

[Đoạn mẫu nếu có]
[Ô dán dữ liệu đầu vào của người dùng]
```

### 4 Điểm Cải Tiến Cốt Lõi:
1. **Dòng đầu tiên là URL Repo**: Sạch sẽ, không lặp lại 3 lần `Nguồn chính chủ... README...`.
2. **Loại bỏ cảnh báo rủi ro gây sợ hãi**: Bỏ các câu "phát sinh phí", "đăng nội dung", "tìm skill", "công cụ chỉ hỗ trợ biên tập không thay thế...".
3. **Cam kết bảo mật an tâm**: Đổi thành cam kết chủ động `Bảo mật dữ liệu: Giữ bí mật và an toàn cho toàn bộ thông tin tôi cung cấp, không chia sẻ ra bên ngoài`.
4. **Đúng mục tiêu công việc**: Phân hóa rõ theo từng nhóm nhu cầu (Viết lách, Video, Audio, Ảnh, UI/UX, SEO, Tự động hóa) với ô dán dữ liệu đầu vào chuyên biệt.

