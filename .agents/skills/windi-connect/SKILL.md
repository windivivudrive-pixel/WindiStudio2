---
name: windi-connect
description: "Generate images and videos using local Windi Connect bridge (Flow, ChatGPT, Grok). Always check and initialize project with 'windi project init' before creating assets."
---

# Windi Connect Skill

Sử dụng cầu nối Windi Connect trên máy để tạo ảnh/video chất lượng cao từ Google Flow, ChatGPT và Grok.

## QUY TẮC BẮT BUỘC: Khởi tạo Project trước khi tạo ảnh

Mỗi thư mục dự án (project) **BẮT BUỘC PHẢI CÓ** file `.windi/project.json`.
Nếu chưa có, agent phải chạy:

```bash
windi project init
```
hoặc:
```bash
windi project init --project <đường_dẫn_project>
```

### Nếu project được copy từ nơi khác sang:
Tránh lỗi `PROJECT_ID_PATH_CONFLICT` bằng cách chạy:
```bash
windi project init --fork
```

---

## Các lệnh tạo ảnh thông dụng

### 1. Tạo ảnh từ Google Flow (16:9 Widescreen)
```bash
windi images create \
  --provider flow \
  --aspect 16:9 --model standard \
  --prompt-file prompt.txt \
  --output assets/windi/scene-01 --wait
```

### 2. Tạo ảnh kèm ảnh mẫu (Reference image)
```bash
windi images create \
  --provider flow \
  --aspect 16:9 --model standard \
  --prompt-file prompt.txt \
  --ref character.png \
  --output assets/windi/scene-01 --wait
```

### 3. Tạo ảnh từ ChatGPT / Grok
```bash
windi images create --provider chatgpt --prompt-file prompt.txt --output assets/windi/scene-01 --wait
windi images create --provider grok --prompt-file prompt.txt --aspect 16:9 --output assets/windi/scene-01 --wait
```

---

## Kiểm tra trạng thái hệ thống
```bash
windi doctor
```
Đảm bảo các provider đều báo `connected: true` và `paired: true`.

## Flow 0.6.31

Luôn truyền `--aspect` theo layout đã duyệt: 9:16, 16:9, 1:1, 3:4 hoặc 4:3.
Chọn `--model standard|pro|lite`, `--count 1..4` khi cần biến thể. Tối đa 4 ref;
edit dùng `--input` và tối đa 3 ref bổ sung. `--count` tạo các job riêng với hậu tố
-01… và `--wait` chờ tất cả. Reuse request key để không tạo ảnh trùng.
Không dùng seed cho workflow thông thường; đường RPC có seed chưa nghiệm thu.
Khi kết quả chưa rõ, đối chiếu rồi dùng `windi jobs resume ID --confirm-result --wait`
để tải lại cùng kết quả; không đổi provider hay tự tạo lại.

Flow chạy trong cửa sổ riêng ở nền, tự thu nhỏ khi mở và không giành focus.
Giữ workspace để tái sử dụng; không đưa browser lên trước để chữa lỗi job.
