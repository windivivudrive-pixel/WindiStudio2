# WindiStudio — đối chiếu master prompt

Ngày kiểm tra: 2026-09-03. Phạm vi: checkout local, không phải xác nhận production.

**Cập nhật sau audit:** UI public/search/sitemap đã chuyển sang repository đọc Supabase, không dùng 6 fixture; đã có sink import 200 ứng viên và schema community evidence kiểm thử PostgreSQL local (28 tests). Migration additive và 200 candidate đã được áp/import live sau snapshot, vẫn chưa có resource/evidence nào public. Ma trận dưới đây là snapshot trước các thay đổi này; xem trạng thái mới và giới hạn tại [database-community-rollout.md](./database-community-rollout.md).

## Kết luận

**Chưa hoàn tất master prompt và chưa đủ điều kiện production.** Hiện có khung Next.js, UI retro, các route và bản nháp migration. Có route không đồng nghĩa có flow hoạt động. Build thành công không chứng minh OAuth, thanh toán, quyền truy cập hay dữ liệu thật hoạt động.

Link ChatGPT share không trả nội dung qua công cụ đọc web trong lượt này. Đối chiếu dựa trên hai bản master prompt / visual direction đã đính kèm, cùng kế hoạch người dùng phê duyệt. Visual direction Y2K mới thay thế hướng dark/Vercel cũ.

## Ma trận thực trạng

| Hạng mục | Thực trạng từ code | Việc còn thiếu |
|---|---|---|
| Next.js App Router | Có cấu hình Next, routes, layout | Chưa triển khai/xác minh runtime production |
| Visual system | Có retro windows, màu theo loại, theme control, CSS responsive | Chưa có đầy đủ bằng chứng 375/768/1024/1440px, contrast, focus, Light/Dark/System và no-flash |
| Dữ liệu discovery | `lib/windi-data.ts` chứa **6 fixture**; UI và API dùng trực tiếp | Repository layer đọc DB, trạng thái loading/error, không để sample score/star mang nghĩa thật |
| Search | Tìm substring trên fixture; có query/type cơ bản | Debounce, URL filters đầy đủ, phân trang, category/agent/license/editorial/status, search DB |
| Command palette | Có Cmd/Ctrl+K, autofocus, Escape | Focus trap/restore, điều hướng kết quả bằng bàn phím và kiểm thử screen reader |
| Resource / Stack detail | Có giao diện | Nội dung so sánh/ưu nhược/installation/security riêng cho từng tool, stack items thật, canonical đã kiểm tra |
| Personal / Community / Admin | Nhiều route dùng `SimplePage`; admin có kiểm tra user/role | CRUD library, following, settings, stacks, threads, moderation, editorial console; route guards nhất quán |
| Submit | Có gửi Supabase từ client | Schema chưa có bằng chứng triển khai; validation/rate limit; sửa form reset sau await; moderation không được owner tự duyệt |
| Auth | Browser/server client + Google callback được giữ | Session refresh proxy/middleware còn thiếu; xử lý lỗi exchange; kiểm thử user cũ; khóa redirect về cùng origin |
| DB | Migration additive local, nhiều bảng và RLS policy | Snapshot DB/Storage/schema, kiểm kê Edge Functions, baseline hiện hữu, sửa RLS, kiểm thử preview rồi mới apply |
| Payments | Không xóa code/webhook/transaction cũ trong lượt này | Chưa chứng minh return/cancel, idempotency và lịch sử đọc được trên stack mới; không bật gói thu tiền khi chưa kiểm thử |
| Windi Score | Hàm tổng đúng trọng số, 2 unit tests ban đầu | Ghi score/history thực, override reason bắt buộc, audit không sửa được, tách quyền sponsor/editor |
| SEO / i18n | Metadata chung, robots, sitemap; nội dung Việt | Metadata/OG theo resource, canonical cấu hình đúng domain, JSON-LD, breadcrumbs, pagination; dictionaries/English model |
| Ingestion trước lượt này | `lib/sources/adapters.ts` trả `[]`; bảng ingestion_jobs trong SQL | Không có fetch thật, worker, dedup chạy thật hoặc lịch daily |
| Ingestion sau lượt này | Collector CLI 5 nguồn, candidate JSON/Markdown, cache, retry, provenance và tests | Chưa nối `lib/sources` vào CLI/worker, chưa DB sink, chưa admin review UI, chưa chạy lịch production |

## Lỗi cần chặn trước production

1. **Quyền profile**: policy `Windi profile owner update` chỉ kiểm tra `id`, không hạn chế các cột role/credit. Nếu role được cấp UPDATE toàn bảng, người dùng có thể sửa cột phân quyền/tài chính. Phải audit cả grants và policies cũ, dùng column grants/RPC giới hạn; không chỉ thêm một policy mới.
2. **Quyền biên tập**: `Submission ownership` và `Stack ownership` là `FOR ALL`, không khóa `status`, `reviewed_by`, `is_official`, `is_premium`. Owner không được tự cấp duyệt/official/premium. Review/comment owner cũng không được khôi phục nội dung đã bị moderator gỡ.
3. **Visibility**: Stack policy cho đọc khi `is_official` mà không yêu cầu published/public; community content cần kiểm tra parent resource published. RLS enabled không đồng nghĩa policy đúng.
4. **OAuth callback**: `new URL(next, url.origin)` chấp nhận URL ngoài origin và bỏ qua lỗi exchange. Cần allowlist relative destination + xử lý lỗi trước redirect.
5. **Session**: server cookie writer là no-op với comment nói middleware xử lý, nhưng chưa có middleware/proxy đó. Cần triển khai session refresh theo tài liệu Supabase/Next hiện hành.
6. **Migration chưa độc lập**: ALTER `transactions`/`categories` giả định schema cũ có sẵn. Không chạy lên DB mới trống, không `db push` cả tập migration khi chưa so baseline và backup. Score audit mới là bảng, chưa được cưỡng chế bằng write path/trigger đã test.
7. **Tính trung thực nội dung**: các fixture có stars/saves/score và badge Security/Official/Editor, hai URL example.com. Không coi đây là sản phẩm đã biên tập. Sitemap hiện bao gồm fixture; cần tách trước launch.

Các kết luận RLS ở trên là review SQL local, không phải exploit hay kiểm tra quyền live. Lượt này chỉ báo cáo các lỗi đó, chưa sửa/apply migration và không đụng Auth, giao dịch, secret, webhook hay Storage.

Phân biệt quyền hàng/cột đối chiếu với [Supabase column-level security](https://supabase.com/docs/guides/database/postgres/column-level-security). Checklist Supabase giúp chỉ ra rằng enabled RLS và owner predicate chưa đủ bảo vệ các cột role/moderation.

## Ưu tiên thực hiện tiếp

1. Sửa P0 auth/RLS; snapshot và đối chiếu DB/functions/payment entrypoints bằng quyền quản trị hợp lệ.
2. Chạy migration trên preview cùng schema legacy; tests anon/owner/other-user/editor/admin, score audit và webhook idempotency.
3. Nối candidate pipeline → DB staging → hàng đợi editor. Chỉ published mới vào public repository/search/sitemap.
4. Hoàn thiện CRUD và guards, detail thật, SEO/i18n/a11y; thử Google và payment flow trên môi trường được phép.
5. Review bộ 200 ứng viên; viết nhận xét Việt và score có bằng chứng. Không bật badge chỉ vì nguồn tự nhận official.
6. Bật lịch daily sau khi có sink bền vững, kiểm thử failure/retry và cơ chế cảnh báo; xem `daily-crawler-plan.md`.

## Bằng chứng kiểm thử phải phân biệt

- Tests collector kiểm tra parser, cache, retry, URL boundary, dedup và publication boundary ở local.
- Kiểm tra catalog kiểm tra 200 identity khác nhau, provenance và metric timestamps; không chứng minh không còn alias cross-source chưa biết.
- Typecheck/build chỉ kiểm tra ứng dụng build được. Không thay cho screenshots/a11y/Google sign-in/DB RLS/payment delivery.
- Không có quyền admin DB/snapshot/advisor production mới được xác minh trong lượt này; không báo những phần đó là đã xong.

Kết quả local trong lượt này: `npm test` **22/22 passed** (20 ingestion + 2 score), `npx tsc --noEmit` passed, `npm run build` passed. Không sửa UI trong lượt audit/catalog này nên không thực hiện thêm screenshot-level visual verification. OAuth, payment, RLS live và scheduler chưa được kiểm thử end-to-end.
