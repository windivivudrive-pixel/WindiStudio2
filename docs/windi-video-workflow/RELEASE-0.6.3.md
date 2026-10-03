# Windi Video Workflow 0.6.3

Ngày phát hành: 18/09/2026.

Website production: `https://windistudio.app/video-kits` (Vercel deployment `dpl_6yPDCAAhmDjqBLm9zAWEQXo63TyK`).

## Gói khách tải

- File nguồn: `tools/windi-connect/dist/Windi-Video-Workflow-v0.6.3-universal.zip`.
- Storage private: `windi-releases/windi-video-workflow/0.6.3/Windi-Video-Workflow-v0.6.3-universal.zip`.
- Dung lượng: `643666` bytes.
- SHA-256: `11a8eb0d8c81e0677724cb16823210d8cac6940cea6accbc954ecd715598246a`.
- Release `0.6.3` đã published trong `product_releases`; product `windi-video-workflow-v1` vẫn active và `release_ready`.

Endpoint tải bộ cài luôn chọn bản published có semantic version cao nhất. Bộ cài được tạo riêng cho tài khoản sau khi server tải ZIP private, kiểm checksum/kích thước và thêm kết nối Windi của người mua.

## Windi Connect

- Giữ nguyên luồng tạo hình Flow và ChatGPT.
- Thêm Grok Imagine Web để tạo video với 1 hoặc 2 ảnh ref, giữ thứ tự `@image1` và `@image2`.
- Khi job Grok hoàn tất, extension giữ kết nối để nhận media, kiểm tra tỉ lệ/thời lượng và lưu MP4 vào đúng project.
- Người dùng đăng nhập Flow, ChatGPT hoặc Grok trong Chrome/Cốc Cốc đã nạp extension; mỗi provider dùng quota của tài khoản đó.
