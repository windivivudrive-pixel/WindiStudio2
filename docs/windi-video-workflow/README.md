# Windi Video Workflow V1

## Phạm vi V1

- Tiếng Việt, video dọc 1080 × 1920, 30fps.
- macOS Apple Silicon, một Chrome hoặc Cốc Cốc profile.
- Codex và Antigravity là hai môi trường được hỗ trợ chính thức.
- Ảnh và render chạy trên máy khách; website giữ account, payment, entitlement,
  private release và Windi Voice API.
- Quyền sử dụng theo tài khoản đã mua; không đăng ký phần cứng hoặc giới hạn một máy.
- Mỗi entitlement nhận một lần 20.000 Windi Voice credit không hết hạn.

## Cổng layout

Workflow bắt buộc đi qua `idea_review → layout_review → script_review`. Sau khi
duyệt idea, khách chọn `paper-editorial`, `dark-cinematic` hoặc đưa URL/file video
mẫu. Đường video mẫu dùng skill MIT
[`bradautomates/claude-video`](https://github.com/bradautomates/claude-video) ở
chế độ `balanced` để lấy frame theo cảnh và transcript có timestamp vào chính
project. Agent chuyển bằng chứng đó thành layout JSON; khách phải duyệt layout
trước khi hệ thống viết kịch bản và beat.

Mỗi layout định nghĩa palette, caption, pacing và tập scene ID. Mỗi beat chỉ được
dùng scene ID thuộc layout đã duyệt. Renderer hỗ trợ `full-bleed`, `framed`,
`split`, `text-led`, `quote`, `comparison` và `cta`; thay layout làm mất hiệu lực
của script cùng mọi asset/render phía sau.

## API và webhook

- Webhook SePay duy nhất: `/api/payment-webhook`.
- Voice order: `WINDI Vxxxxxxxx`.
- Video Workflow order: `WINDI Kxxxxxxxx`.
- Voice API: `/api/v1/voice/voices`, `/api/v1/voice/generations`, trạng thái,
  word timestamp và audio theo generation ID. Backend gọi Cartesia SSE với
  `add_timestamps: true`; đường Windi Voice không chạy Whisper lại.
- Mã kết nối `windi_kit_…` đồng thời xác thực Voice API, nên người mua
  Workflow chạy `windi login` một lần với mã này, không cần tạo token Voice riêng. Người chỉ mua gói
  Voice vẫn tạo token riêng tại `/api/v1/voice/tokens`.
- Token Voice và Workflow là hai purpose riêng, chỉ hiển thị secret một lần và
  chỉ lưu hash trong database.

## Phát hành

Artifact beta được tạo bằng `npm run package:installer` trong
`tools/windi-connect`. ZIP chỉ được upload vào bucket private `windi-releases`
sau khi qua toàn bộ cổng kiểm chứng. Sau upload, tạo row `product_releases` với
đúng version, SHA-256, byte size và `is_published=true`. Chỉ sau đó mới đổi
product metadata `release_ready=true` và `is_active=true`.

Không sửa hai cờ này trước. Landing page cố ý khóa CTA nếu release chưa đạt.
