# WindiStudio dark-mode visual audit

## Nguồn đã đối chiếu

- `app/globals.css`: token dark mode, lưới nền, retro window, title bar, border, shadow và badge.
- `windi/home.css`: Calling Code, spacing, hierarchy headline/card và chuyển động vào cảnh.
- `visual-checks/video-kits-layout-gate-1440.png`: ảnh chụp trang Video Workflow ở dark mode.
- `reference-video-kits-dark.png`: bản sao bằng chứng đặt cùng project quảng cáo.

## Token chính

| Vai trò | Giá trị |
| --- | --- |
| Background | `#25272b` |
| Grid | `rgba(255,255,255,.045)` |
| Surface | `#313338` |
| Surface 2 | `#393b40` |
| Text | `#eeeae0` |
| Muted | `#b6b5af` |
| Border | `#161719` |
| Orange | `#c7815f` |
| Green | `#56986e` |
| Pink | `#c86a88` |
| Yellow | `#c6a760` |
| Blue | `#738eba` |

## Quy tắc chuyển sang video 9:16

- Giữ một ý chính trên mỗi frame, không bê nguyên mật độ của landing page vào video.
- Dùng cửa sổ/card để diễn tả trạng thái workflow, không dùng chúng như trang dashboard thu nhỏ.
- Headline tối đa 2–3 dòng; caption tách khỏi headline và nằm trong boxed surface.
- Chuyển động ưu tiên slide/fade ngắn, progress, status đổi màu và camera push nhẹ.
- Không dùng mascot mặc định; watermark chỉ là `WINDI STUDIO` ở vùng an toàn.
