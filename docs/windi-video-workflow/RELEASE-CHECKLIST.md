# Release checklist

## Cổng ảnh

- [ ] Flow create, reference, edit và original download trên Chrome.
- [ ] Flow create, reference, edit và original download trên Cốc Cốc.
- [ ] ChatGPT create, reference, edit và original download trên Chrome.
- [ ] ChatGPT create, reference, edit và original download trên Cốc Cốc.
- [ ] Output gắn đúng job, đúng project, đúng checksum; không dùng thumbnail.

## Workflow thật

- [ ] Video sáu cảnh `paper-editorial` dùng Windi Voice được xem và nghe hết.
- [ ] Video sáu cảnh `dark-cinematic` dùng audio nhập được xem và nghe hết.
- [ ] Sau duyệt idea, workflow bắt buộc dừng ở `layout_review`; cả hai layout có
      sẵn đều được chọn và duyệt riêng trước khi viết script.
- [ ] Một video mẫu được phân tích bằng bản `bradautomates/claude-video` đã ghim;
      frame/transcript nằm trong project, layout JSON được duyệt và beat chỉ dùng
      scene ID hợp lệ.
- [ ] Render reference layout kiểm tra đủ `full-bleed`, `framed`, `split`,
      `text-led`, `quote`, `comparison`, `cta` và caption top/center/bottom.
- [ ] Script sửa sau duyệt vô hiệu hóa toàn bộ downstream artifact.
- [ ] Cùng project tiếp tục giữa Codex và Antigravity không tạo lại asset.

## Khôi phục và bảo mật

- [ ] Restart helper, reload extension, sleep/wake và mất mạng sau submit.
- [ ] Login hết hạn, CAPTCHA, quota hết và UI provider đổi đều cần user action.
- [ ] RLS, revoked token, path traversal, symlink và checksum sai bị chặn.
- [ ] Chuyển máy làm máy cũ mất quyền dùng.
- [ ] Không có service role key, Cartesia key hoặc token thật trong client/log.

## Commerce và clean install

- [ ] Migration được review và áp dụng trên môi trường staging.
- [ ] Webhook đúng, thiếu, thừa, trễ và replay được kiểm chứng bằng event thật.
- [ ] Đơn thứ 100 và 101 đồng thời có giá đúng; reservation hết sau 10 phút.
- [ ] Signed URL hết hạn và chỉ cấp cho entitlement active.
- [ ] Cài ZIP trên máy macOS Apple Silicon sạch, không cần Node hệ thống; bước
      thiết lập Python, ffmpeg và yt-dlp cho analyzer được hướng dẫn và kiểm tra.
- [ ] Xem/nghe trọn vẹn hai demo public 60 đến 90 giây.

Chỉ khi mọi mục trên hoàn tất mới publish release và mở CTA mua.

## Dung lượng và source bàn giao

- [ ] Hai project video dùng cùng runtime, không có node_modules riêng từng tập.
- [ ] Gói source giữ .windi/workflow.json, media gốc, voice, manifest, source và QA; không có secrets/cache/runtime nhân bản.
- [ ] Có phiên bản Windi và lệnh khôi phục; giải nén sang thư mục mới, kiểm tra asset và preview/render thành công.
- [ ] Bộ cài giữ dependency runtime cần thiết một lần; skill storage-and-handoff.md được đóng gói cùng adapter.
