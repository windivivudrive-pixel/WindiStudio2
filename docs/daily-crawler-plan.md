# Kế hoạch crawler hằng ngày — WindiStudio

> Cập nhật 07/09/2026: `catalog:collect` và `catalog:verify` dùng bộ lọc nontech, xuất báo cáo ở `data/catalog/nontech/`. `catalog:enqueue` đọc toàn bộ identity đã có trong Supabase, loại cả repo từng `REJECTED`, chấm độ hữu dụng/hot/tăng stars/khoảng trống danh mục và chỉ thêm 5–10 repo mới ở trạng thái `REVIEW`. Automation của Codex project WindiStudio2 đang chạy mỗi 6 giờ; GitHub Actions được giữ làm nút chạy tay dự phòng. Xem [nguồn, tiêu chí và cách chạy mới](./nontech-repo-curation.md). Collector 200 mục bên dưới là lịch sử; chạy bằng `catalog:collect:legacy` / `catalog:verify:legacy`.

## Trạng thái chính xác

Cập nhật 2026-09-07: danh mục có **100 hồ sơ creator-first tiếng Việt** từ đợt rollout trước và pipeline khám phá nontech mới. Lịch Codex project đã hoạt động mỗi 6 giờ; GitHub workflow chỉ chạy tay để tránh trùng lịch. Importer 200 cũ vẫn bị chặn để không ghi đè nội dung biên tập. Các đoạn 200 bên dưới mô tả collector lịch sử, không phải bộ tuyển chọn hiện tại.

Kế hoạch tìm ảnh/video cộng đồng và coverage thực nằm ở [database-community-rollout.md](./database-community-rollout.md). Không coi research jobs là tool đã có media.

Daily refresh cho Creator 100 cần đọc danh sách canonical trong `data/catalog/creator-100.json`, chỉ append số liệu và đưa README đổi hash vào hàng chờ biên tập. Không chạy lại bộ lọc top-N để thay 100 mục, không ghi đè bài tiếng Việt, license note hay trạng thái đã duyệt. `scripts/research-creator-catalog.mjs` hiện tải nghiên cứu local; chưa là worker refresh production.

Trước lượt kiểm tra 2026-09-03: chỉ có adapter stub và bảng ingestion_jobs trong migration. **Chưa có crawler hay lịch chạy thật.**

Sau lượt import: collector chạy thủ công và sink đã nhập 200 ứng viên lên Supabase. **Chưa kích hoạt lịch, chưa tự publish.** Đây chưa phải toàn bộ production ingestion.

## Có thể chạy ngay

```sh
npm run catalog:collect
npm run catalog:verify
# Bỏ TTL cache, revalidate với nguồn; giữ cache cũ nếu nguồn lỗi:
npm run catalog:collect -- --fresh
```

Node.js 22+; collector dùng thư viện chuẩn, không cần cài CLI/plugin từ các repository thu thập. `GITHUB_TOKEN` chỉ đọc public repositories là tùy chọn cho máy local và nên có trong runner daily. Không đọc `.env.local`, không cần Supabase service role/payment secrets.

Đầu ra:

- `data/catalog/CATALOG.md`: bảng đọc được, chia theo nguồn.
- `data/catalog/candidates.json`: 200 candidate, nhiều-source provenance, metric timestamps, score null.
- `data/catalog/collection-report.json`: kết quả từng nguồn, counts, no-DB/no-publish.
- `data/ingestion/runs/<run-time>/`: report + pool cho từng lần chạy, kể cả thất bại (gitignored).
- `.cache/windi-ingestion/`: HTTP cache 24h, ETag, nội dung nguồn chỉ để phân tích (gitignored, không phát lại nguyên văn).

## Nguồn và giới hạn

| Thứ tự | Cách đang lấy | Giới hạn/điều kiện |
|---|---|---|
| 1. Skills.sh | Dữ liệu serialized của leaderboard public, không chạy script upstream | Chỉ source owner/repo nhận diện được; domain-hosted skill chờ resolver. Không lấy private API hoặc search bị robots disallow. API chính thức cần cơ chế auth riêng |
| 2. Awesome Agent Skills | README của `VoltAgent/awesome-agent-skills`, chỉ entry liên kết thẳng GitHub | Giữ path skill. Không suy ra repo từ link officialskills.sh; alias chưa xác minh không import |
| 3. Trendshift | Project links public ở trang daily/weekly; xác minh lại metadata GitHub | Không lấy sponsor strip, không phát lại Signal/ranking payload. Chỉ chọn repo công khai, không archived/fork, có license được GitHub nhận diện và tín hiệu liên quan AI/tooling |
| 4. Official MCP Registry | API v0.1 latest/active; tìm theo 17 nhóm nhu cầu | Đây là lựa chọn cho nhánh “Registry/Glama”. Chưa có Glama adapter. Không đồng nhất registry verified namespace với bảo mật/tool quality |
| 5. GitHub Search | 2 query public `topic:ai-agents` / `topic:mcp-server`, stars >500 | Loại unknown license, archived/fork và các tên học liệu/danh sách. Chỉ số là snapshot, không phải Windi Score |

Nguồn tham chiếu: [Skills API](https://skills.sh/docs/api), [Awesome Agent Skills](https://github.com/VoltAgent/awesome-agent-skills), [Trendshift Signal terms](https://trendshift.io/signal), [MCP API](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/api/official-registry-api.md), [GitHub Search](https://docs.github.com/en/rest/search/search#search-repositories).

## Những bảo vệ đã có trong collector

- Allowlist host fetch; HTTPS; không forward credential qua redirect khác host; chỉ gửi GitHub token đến api.github.com.
- Timeout 25s/request, tối đa 5MB/body, 3 lần thử với backoff; tôn trọng Retry-After/rate-limit reset. Nếu phải chờ >30s thì defer nguồn thay vì bỏ qua giới hạn.
- Giãn request GitHub 6,5s để không vượt 10 search request/phút khi chưa auth. Nguồn khác 750ms, cache để không fetch theo page view.
- Parse dữ liệu, không eval script, chạy SKILL.md, README, package, command hoặc MCP server.
- Dedupe repo (case/.git/tracking) và giữ skill sub-resource riêng. Alias đổi tên/mirror/fork vẫn cần editor. Metadata từ Registry không gồm environment defaults hay lời hướng dẫn thực thi.
- Lock local chống hai collector cùng chạy; file output JSON ghi atomic. Nếu crash để lại lock, người vận hành phải kiểm tra PID/run trước khi bỏ lock, không tự xóa mù.
- Nguồn lỗi hoặc không đủ 200: giữ catalog thành công gần nhất, ghi report thất bại và exit nonzero. Pool từ nguồn thành công vẫn nằm trong run artifact.
- Không nhập sponsorship/score/editorial state. Tất cả CANDIDATE, security NOT_REVIEWED. Không import vào public app.

## Lịch collector legacy

Chạy **07:20 hằng ngày, giờ Việt Nam** (00:20 UTC). Chọn phút 20 để tránh đầu giờ thường đông. Đây là lịch đề xuất, không phải cam kết đã có job đang hoạt động; [GitHub schedule có thể trễ](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

Luồng daily production:

1. Tạo run_id/idempotency theo ngày + adapter version; lấy lock phân tán.
2. Lấy nguồn theo thứ tự trên; cache/ETag/robots/terms, quota từng nguồn. Tách discovery mới khỏi refresh danh sách đã duyệt.
3. Normalize → resolve canonical/aliases → dedup → enrich license/metrics. Bổ sung changed-version/hash diff.
4. Upsert **staging candidate và resource_sources**, append metric snapshots. Chỉ nguồn thật có observed_at; không overwrite dữ liệu cũ bằng null khi nguồn lỗi.
5. Tính preliminary score chỉ cho component có đủ evidence. Thiếu evidence = chưa chấm, không suy ra security từ stars.
6. Editor review (new/version/security change). Public resource chỉ được cập nhật metric đã xác minh; score/badge/content/lifecycle cần quyền biên tập và audit reason.
7. Summary run: new/updated/duplicate/rejected/failed, số API requests, độ trễ, backlog. Cảnh báo khi fail/rate limit hoặc nguồn >48h không cập nhật; không gửi thông báo nếu không có thay đổi đáng chú ý.

## Trước khi bật production còn phải làm

- Sửa RLS và chứng minh candidate không bị anon/owner đọc hoặc tự publish. Sink phải transactional với unique source identity; rollback không chạm Auth/transaction history.
- Nối collector vào server worker và `lib/sources` (hiện app adapter vẫn stub). CLI hiện xuất local artifact, không giả báo job success trong DB.
- Incremental Registry `updated_since` + cursor bền vững; xử lý tombstone/deleted, lưu checkpoint **sau** commit thành công. Không coi không thấy ở một trang là đã bị xóa.
- Refresh toàn bộ published resources theo canonical/source IDs; discovery query top-N hiện tại không thay cho refresh tồn kho.
- Chống SSRF nếu mở fetch URL từ submission: resolve DNS/private IP, host policy và redirect từng hop. Collector hiện chỉ fetch endpoint có allowlist, không fetch URL tùy ý.
- Kiểm thử integration sink/lock/idempotency, partial failure/retry, changed license/removed repo, monitoring và recovery. Chạy ít nhất hai daily dry runs có đối chiếu.
- Lưu pool/run artifacts bền vững 30 ngày và metadata snapshot dài hơn theo policy. Cache raw source là nội bộ, tránh redistribution trái điều khoản.

Mẫu ở `ops/daily-crawl.workflow.yml.example` phản ánh nút chạy tay đang có trong `.github/workflows`: ghi lô 5–10 repo vào `REVIEW` và lưu artifact. Lịch mỗi 6 giờ do automation Codex project quản lý; không bật thêm schedule GitHub cùng lúc. Không có bước tự xuất bản.
