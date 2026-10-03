# Hướng Dẫn Thiết Lập Dự Án (Project Setup) — Windi Connect

> **QUY TẮC CỐT LÕI:**
> Để bất kỳ thư mục dự án nào (project) có thể tạo ảnh, video hoặc chạy workflow qua Windi Connect, thư mục đó **BẮT BUỘC PHẢI ĐƯỢC KHỞI TẠO (INIT)** một lần.
> Nếu chưa khởi tạo, CLI sẽ báo lỗi:
> `{"error":"Chưa có Windi project ở folder này. Chạy windi project init trước."}`

---

## 1. Khởi Tạo Dự Án Mới (Chỉ làm 1 lần cho mỗi project)

Mở Terminal tại thư mục của dự án và chạy:

```bash
windi project init
```

*(Hoặc từ thư mục bất kỳ ngoài project, truyền cờ `--project`:)*
```bash
windi project init --project /duong-dan/toi/thu-muc-project
```

### Lệnh này tự động thực hiện:
- Tạo file cấu hình nhận diện: `.windi/project.json`
- Đăng ký project ID (UUID) vào cơ sở dữ liệu `state.sqlite` của Windi Connect.
- Thiết lập thư mục lưu ảnh mặc định: `assets/windi/` và provider mặc định: `flow`.

---

## 2. Cách Tạo Ảnh / Video Nhanh

### A. Tạo ảnh với Google Flow (Khuyên dùng)
```bash
windi images create \
  --provider flow \
  --prompt-file prompt.txt \
  --output assets/windi/scene-01 --wait
```

### B. Tạo ảnh có kèm ảnh tham chiếu (Reference image - tối đa 4 ảnh)
```bash
windi images create \
  --provider flow \
  --prompt-file prompt.txt \
  --ref character.png \
  --output assets/windi/scene-01 --wait
```

### C. Tạo ảnh với ChatGPT hoặc Grok
- **ChatGPT:** `--provider chatgpt`
- **Grok:** `--provider grok --aspect 16:9`

---

## 3. Các Lỗi Thường Gặp & Cách Khắc Phục

| Lỗi | Nguyên nhân | Cách khắc phục |
| :--- | :--- | :--- |
| `PROJECT_NOT_INITIALIZED` | Chưa chạy init cho project | Chạy `windi project init` tại thư mục dự án. |
| `PROJECT_ID_PATH_CONFLICT` | Dự án được copy từ nơi khác sang, file `.windi/project.json` giữ ID của project cũ | **Tạo bản độc lập mới:** `windi project init --fork`<br>**Nếu vừa đổi tên / dời folder:** `windi project init --relink` |
| `PATH_OUTSIDE_PROJECT` | File prompt hoặc ảnh ref nằm ngoài thư mục dự án | Di chuyển file prompt/ảnh ref vào bên trong thư mục dự án. |
| `EXTENSION_DISCONNECTED` | Trình duyệt chưa mở hoặc chưa nạp extension | Mở Cốc Cốc / Chrome, kiểm tra extension Windi Connect đang bật, mở sẵn tab `flow.google.com`. |

---

## 4. Các Lệnh Hữu Ích Khác

- **Kiểm tra sức khỏe hệ thống & kết nối:**
  ```bash
  windi doctor
  ```
- **Liên kết cố định project với 1 Workspace cụ thể trên Flow:**
  ```bash
  windi project link --provider flow --url https://flow.google.com/project/<workspace-id>
  ```
