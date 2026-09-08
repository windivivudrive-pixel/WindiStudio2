# WindiStudio — checklist mở beta

Kiểm tra 2026-09-03: checkout local và đọc Data API dự án `zpjphixcttehkkgxlmsn`. Chưa xác nhận runtime production.

## Phạm vi đã chốt

- Video Kits: mục nổi bật trên Home, trang riêng `/video-kits`, 7 chặng minh họa có thể chọn. **Chỉ demo**; chưa phát hành ZIP, chưa chạy provider. Quy trình đầy đủ do chủ dự án cung cấp sau.
- Footer: **Ủng hộ Windi** → `/support`, ghi rõ chưa nhận thanh toán. Không QR, không thanh toán giả, không phát sinh phí.
- Đề xuất mở beta **khám phá tool + biên tập nội dung** trước; không cần đợi Video Kits hoặc Pro hoàn chỉnh.

## Hiện trạng đã xác minh

| Hạng mục | Hiện tại |
| --- | --- |
| Catalog | Supabase có 200 resources, tất cả CANDIDATE, chưa có tool public. |
| Duyệt tool | Migration `20260903131154_windi_editorial_review.sql` đã áp live. Email được chỉ định đã được cấp quyền admin theo Auth user ID đã xác minh. Truy cập trực tiếp `/admin`, không có link public/footer. |
| Submit | Form đang gọi `submissions` nhưng bảng chưa có trong schema live. |
| Cá nhân | Library, My Stacks, Following, Settings, Profile còn placeholder. |
| Crawler | Chạy thủ công + import được; lịch trong `ops/` vẫn là example, chưa tự chạy. |
| Media cộng đồng | Báo cáo import có 2 nguồn REVIEW cho 1/200 tool; chưa có gallery đầy đủ. |
| DB cũ | `library_images` vẫn tồn tại. Không xóa/di chuyển bảng trong lượt làm demo. |
| Kiểm thử | 38 tests và production build đạt. RLS admin/user/anon, review RPC và audit đã kiểm tra live bằng giao dịch rollback; Google login end-to-end và payment vẫn cần thử thực tế. |

## Bắt buộc trước khi mở beta

1. **Thử biên tập trên giao diện:** schema, quyền và RPC đã kích hoạt/kiểm chứng live. Còn kiểm thử Google login và flow lưu/xuất bản bằng phiên đăng nhập thực của admin. Không push toàn bộ migrations: bản core foundation trước đó vẫn là draft không an toàn.
2. **Nội dung đủ dùng:** đề xuất duyệt 20–30 tool tốt trước, không cần public đủ 200. Có mô tả Việt, cách bắt đầu, yêu cầu, giới hạn, license và nguồn. Không tạo score/badge khi thiếu bằng chứng.
3. **Luồng discovery:** thử tìm → lọc → detail → nguồn với tool published thật. Detail đã hiển thị hướng dẫn biên tập từ `long_description`. Hoàn thiện loading/error, phân trang và lọc cần thiết.
4. **Auth và an toàn:** thử Google login/logout/session refresh, user cũ, admin/user/anon; audit grants/RLS cả bảng legacy, đặc biệt role/credit. Callback đã có xử lý lỗi/chặn redirect ngoài site trong code, chưa xác minh end-to-end.
5. **Thu gọn phạm vi:** hoàn thiện hoặc khóa Submit; ẩn CTA lưu tool, tạo stack, community CRUD và Pro chưa hoạt động. Giữ Video Kits dưới nhãn preview, donation chưa thu tiền.
6. **Deploy:** chốt domain, deploy Next.js, cấu hình secrets server-only và Google redirect; giữ callback/payment cũ. Đồng nhất metadata/canonical/robots/sitemap, thêm OG, kiểm tra 404, mobile, keyboard.
7. **Vận hành:** backup có khả năng phục hồi, error monitoring, rate limits cho thao tác ghi, Privacy/Terms, liên hệ và quy trình gỡ nội dung/media. Build local không đủ để tuyên bố production-ready.

## Sau beta

- Bookmark/collections, stacks, following, đóng góp cộng đồng có kiểm soát ownership và moderation.
- Crawler production có runner, secrets, retry/checkpoint và cảnh báo; nhập chờ duyệt, không auto-publish. Không dùng một file lịch mẫu làm bằng chứng đã tự chạy.
- Ảnh/video thực tế có nguồn và quyền sử dụng; link-only nếu chưa xác minh được quyền embed/rehost; hỗ trợ report/takedown.
- Score history/override reason, so sánh tool, bộ lọc chuyên sâu, English i18n.
- Hoàn thiện Video Kits sau khi nhận quy trình chính thức.

## Donation

Nên để liên kết nhỏ **Ủng hộ Windi** ở footer, không popup, không cạnh tranh với tìm kiếm. Không gọi là quỹ từ thiện hoặc hứa quyền lợi chưa có.

Chỉ bật nhận tiền khi đã chốt phương thức/bên nhận; thử thành công/hủy, xác thực callback, webhook trùng và đối soát số tiền. Dùng ledger giao dịch hiện hữu với purpose donation, không tạo lịch sử cạnh tranh hoặc xóa giao dịch cũ. Ủng hộ không mua score, huy hiệu hay ưu tiên xuất bản. Luồng này hiện chưa được xác minh đầy đủ.

## Dọn DB

Không phải điều kiện bắt buộc để mở beta. Chỉ archive/xóa bảng image-only sau backup và audit ứng dụng, Edge Functions, worker, webhook đang triển khai. `library_images` là ứng viên archive theo audit trước, **chưa có lệnh di chuyển được chạy**. Snapshot hiện có là rows/schema metadata/bucket manifest, chưa gồm đầy đủ Auth/Storage blobs. Giữ người dùng, hồ sơ, phân quyền và lịch sử giao dịch; không xóa rộng schema public.
