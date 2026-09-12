# Flow Agent Portable cho macOS

Thư mục này dành riêng cho macOS. Các file `.command` có thể nhấp đúp trong
Finder; không dùng các file `.bat` của Windows.

## Cài lần đầu

1. Nhấp phải `SETUP.command` → **Open**. macOS có thể hỏi xác nhận vì script
   chưa được ký; chỉ mở file nằm trong bộ ZIP này.
2. Dán URL project dạng `https://flow.google.com/project/...`.
3. Chrome mở trang Extensions. Bật **Developer mode**, chọn **Load unpacked**
   và chọn thư mục `flow-extension` ở thư mục cha của `macOS`.
4. Đăng nhập Google Flow, rồi chạy `STATUS.command`.

Setup kiểm tra macOS, Python 3.10+ và Google Chrome; tạo `.venv-portable`, cài
dependency, lưu project ID cục bộ và cài LaunchAgent để bridge tự chạy khi đăng
nhập. Gói không chứa tài khoản, cookie hoặc token.

## Dùng hằng ngày

- `TAO-ANH.command`: hỏi prompt, output, tỷ lệ và tối đa 10 ảnh ref local.
- Kéo job JSON thả lên `RUN-JOB.command`, hoặc chạy nó rồi dán đường dẫn job.
- `START-BRIDGE.command`: dùng lại bridge hiện có hoặc tự bật nếu đang tắt.
- `STATUS.command`: kiểm tra backend, extension, đăng nhập và project.

Đường dẫn output/ref tương đối được tính từ file job. File cũ không bị ghi đè.
Nếu Google hiện CAPTCHA, xác minh trong Chrome rồi chạy lại chính job đó.

