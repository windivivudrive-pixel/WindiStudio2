# Catalog + community evidence — 2026-09-03

## Trạng thái triển khai — 2026-09-03

Cập nhật editorial: schema `20260903131154_windi_editorial_review.sql` và quyền admin cho tài khoản đã chỉ định đã triển khai live. Truy cập trực tiếp `/admin`; không có link ở footer. Kiểm chứng RLS/review RPC/audit live đã đạt trong giao dịch rollback, không public tool thử. Xem [motion-editorial-rollout.md](./motion-editorial-rollout.md). Security Advisor vẫn có 13 cảnh báo liên quan legacy cần xử lý riêng trước production.

- MCP Supabase đã xác thực OAuth với quyền đọc project và đọc/ghi database, scope chặt vào `zpjphixcttehkkgxlmsn`.
- Đã snapshot local schema metadata, toàn bộ 9 bảng public và manifest 2 bucket Storage vào `.backups/windi/` (permission riêng, gitignored). Gói Free không có scheduled backup/PITR; Auth rows và file object Storage không được xuất, không có dữ liệu nào bị xóa.
- Đã áp `20260903084313_windi_catalog_media_import.sql` qua SQL Editor: chỉ cộng bảng catalog/evidence, RLS/grants và RPC import. Auth, profiles, transactions, generation, image legacy và Storage không bị đổi.
- Đã nhập đúng **200 resources** ở `CANDIDATE`, 229 nguồn, 172 metric snapshots, 200 công việc nghiên cứu và 2 evidence `REVIEW`. Read-back xác nhận đủ 200 identity. Anon REST nhìn thấy 0 candidate. Legacy transactions vẫn 5 bản ghi như snapshot.
- Dashboard Edge Functions không liệt kê function đã deploy tại thời điểm kiểm kê. Các source function trong repository không bị sửa/deploy trong rollout này; vì vậy webhook production không bị thay đổi.
- Mới có **2 bài nguồn cho 1/200 tool**, đang REVIEW, còn **199 tool chưa có nghiên cứu minh họa**. Một bài xác nhận repo skill; một bài chỉ minh họa Remotion liên quan và được gắn nhãn riêng. Chưa có quyền rehost ảnh hoặc xác minh khả năng embed video, nên importer chỉ lưu LINK_ONLY.

## Các phần đã chạy cục bộ

- `supabase/migrations/20260903084313_windi_catalog_media_import.sql`: migration cộng thêm, giao dịch nguyên khối, RLS/grants công khai chỉ đọc published; quyền import chỉ service role. Không thay đổi các bảng cũ.
- `scripts/import-catalog.mjs`: tạo payload, kiểm tra đúng project, yêu cầu schema có sẵn, backup các bảng catalog trước import, gọi RPC retry-safe và đọc lại đủ 200 identity trước khi ghi báo cáo thành công.
- `lib/catalog-repository.ts`: Home/Discover/resource detail/search/sitemap đọc Supabase bằng anon key server-side. Không dùng fixture làm fallback; DB lỗi hiển thị lỗi, candidate chưa duyệt không hiện public. Các fixture cũ vẫn nằm trong module nhưng không được các flow này đọc.
- UI `Trải nghiệm từ cộng đồng`: nguồn/tác giả/quan hệ với tool, tóm tắt Việt, điểm hữu ích và giới hạn, nhãn liên quan; ảnh có phép/video embed đã xác minh chỉ tải khi người xem bấm. Dùng UI/UX Pro Max cho focus, trạng thái trống và khung media responsive; giữ token retro hiện có.
- Tests PostgreSQL nhúng: import 200 + evidence, giữ sentinel legacy, retry/hash mismatch, anon/owner không tự publish, candidate/raw metadata/job không public, media không lọt qua parent chưa publish. Đây không phải test Supabase production hay Google/payment end-to-end.

## Quy trình đã thực hiện và việc tiếp theo

1. Đã xác nhận project, chụp snapshot và đối chiếu baseline. **Không chạy `supabase db push` cả thư mục.** Bản `20260903074711_windi_core_foundation.sql` vẫn là draft không tương thích, không phải prerequisite.
2. Đã chạy `npm run catalog:import -- --apply --project-ref zpjphixcttehkkgxlmsn`; report chỉ được tạo sau read-back thành công. Backup trong importer bổ sung cho snapshot pre-migration, không thay thế backup đầy đủ ở gói có PITR.
3. Biên tập mô tả/cách dùng/license/security từng tool; chỉ sau review mới chuyển từng resource sang published. Không tạo score/badge để lấp chỗ trống. Duyệt nguồn minh họa, quan hệ tác giả và quyền sử dụng trước khi publish evidence.
4. Kiểm thử UI với dữ liệu published thật và anon/authenticated, ảnh lỗi/video bị gỡ; Google login và payment chưa được coi là đã đạt.

## Bổ sung crawler media hằng ngày

Lịch discovery đề xuất 07:20 Việt Nam vẫn **chưa bật**. Không có job tự chạy được xác nhận. Xem `daily-crawler-plan.md`.

Sau khi có runner/server credential: lấy tối đa 20 job NEEDS_RESEARCH/ngày theo tuổi backlog; tìm theo tên + canonical repo + use-case trên nguồn public được phép. Mục tiêu 2–3 minh họa hữu ích/tool, không ép quota nếu không có nguồn. Ưu tiên bài người dùng có ảnh/video và mô tả việc đã làm; phân biệt quảng cáo/maintainer/affiliate. Exact identity và phiên bản cần đối chiếu, bài chung về một framework chỉ là RELATED_PROJECT.

Mỗi nguồn: lưu URL, tác giả, thời điểm đối chiếu, summary tự viết, ưu/nhược, link media, trạng thái quyền, lý do ghép tool. Không crawl private forum, vượt robots/rate limits, tải lại media hoặc thực thi nội dung nguồn. Chỉ đưa REVIEW; không auto-publish. Nếu chưa có API/quyền nền tảng thì dùng nghiên cứu biên tập/link-only, không coi collector hiện tại đã có Reddit/YouTube crawler.

Refresh link/media đã công khai theo tuần, ưu tiên báo broken link/gỡ bài; cho phép report/takedown và không dùng lượt xem/sponsor để suy ra chất lượng. Cần distributed lease, quota/retry/checkpoints và cảnh báo lỗi trước khi bật production.

## Kiểm chứng hiện tại

28/28 tests, typecheck và build đạt. Đã kiểm tra DOM trang chủ hiển thị trạng thái chưa kết nối, không còn card mẫu. Chưa kiểm tra đầy đủ screenshot nhiều kích thước hoặc gallery có dữ liệu thật; chưa đủ điều kiện tuyên bố hoàn tất master prompt.
