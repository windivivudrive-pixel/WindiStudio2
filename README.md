# WindiStudio

WindiStudio is the curated toolbox for AI power users: Skills, MCPs, open-source projects, workflows and stacks that have enough context to make a decision quickly.

> **Status 2026-09-04: partial implementation, not production-ready.** Supabase now contains **100 creator-first Vietnamese dossiers awaiting review**, plus 195 archived legacy candidates; none published. Copy đã được rà lại theo [blader/humanizer](https://github.com/blader/humanizer), còn Hot/Trending chỉ hiển thị theo tín hiệu có ngày ghi nhận. Video Kits is preview-only. Editorial schema and the requested admin membership are live; personal/community flows still need work. See [Creator 100 rollout](docs/creator-100-rollout.md) and the [launch checklist](docs/launch-readiness.md).

## Candidate catalog and daily crawling

The active [Creator 100 dossiers](data/catalog/CREATOR-100.md) contain Vietnamese summaries, distinct features, use-case suggestions, setup, limitations, license notes and dated GitHub stars/forks. Only four entries are pure tech/security. `/admin` defaults to this selection, offers purpose/star filters and copies the current editable social draft. Publication still requires an editor decision.

The [old 200-candidate catalog](data/catalog/CATALOG.md) is retained as historical discovery data, not the active shortlist. Its importer now refuses to overwrite Creator 100. `catalog:creator:research` refreshes public source documents locally; `catalog:creator:build` assembles manually authored profiles and **does not write to the database**. The active Codex project automation runs nontech discovery every six hours. It excludes every repo already present, including rejected ones, then adds only the best 5–10 new repos as `REVIEW`; it never publishes them. GitHub Actions remains a manual fallback to avoid duplicate schedules. See the [crawler plan](docs/daily-crawler-plan.md).

## Architecture

- **Web:** Next.js App Router, static/SEO-ready public surfaces, Vietnamese-first UI.
- **Identity:** Existing Supabase Google OAuth and `auth.users` are retained.
- **Data:** Supabase/Postgres with deployed catalog migration `20260903084313_windi_catalog_media_import.sql`. The earlier core foundation remains an unapplied draft: do not push all migration history.
- **Payments:** Existing transaction history and webhook endpoints are preserved; the new schema extends the transaction ledger rather than deleting it.
- **Curation:** The collector, transactional DB sink and editorial schema are live. Open `/admin` directly and sign in with the provisioned Google account. Candidate visibility, review RPC and audit were checked on the live DB in a rolled-back transaction; no resources were published by these tests.

## Run locally

```bash
npm install
npm run dev
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` using `.env.example` as a reference; do not overwrite an existing `.env.local`. Existing `VITE_SUPABASE_*` public names continue to work temporarily. Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code.

## Database rollout

1. Take a schema, database and Storage snapshot.
2. Confirm existing Google login and webhook callbacks.
3. Review the foundation migration; it is additive and does not delete Auth, profiles or transaction history.
4. Apply it through the project’s authorized Supabase workflow.
5. Retire old image-generation tables only after code, functions, storage and payment dependencies are proven unused.

### Windi data model

The draft foundation migration defines Resources, Sources, metric snapshots, score components/history, categories/compatibility, bookmarks, collections, stacks, community feedback, submissions, audit, sponsors, jobs, subscriptions and entitlements. RLS is enabled, but ownership policies do not sufficiently restrict privileged columns or moderation transitions. Do not apply this draft unchanged; see the audit.

### Windi Score

The implemented score calculator uses utility (20), maintenance (15), adoption (15), security (15), documentation (10), originality (10), agent compatibility (10), and setup (5). Persistent score history and enforced override reasons are still to be implemented and tested.

### Source adapters

`lib/sources` defines placeholder app interfaces. `scripts/ingestion` implements discovery for Skills.sh, Awesome Agent Skills, Trendshift, Official MCP Registry and GitHub Search, with attribution and no Windi Score. The DB sink is implemented; editorial rollout remains required. Imported content is data, never executable instructions.

### Routes

Public discovery uses `/discover`, `/skills`, `/mcp`, `/open-source`, `/workflows`, `/stacks`, `/tool/[slug]`, `/stack/[slug]`, `/categories`, `/community`, `/submit`, `/pricing`, and `/support`. `/video-kits` is preview-only. Personal routes remain incomplete. `/admin` validates the authenticated Auth user and separate editorial membership on the server; it is intentionally absent from public navigation.

## Verification

```bash
npm test
npm run build
```

Before production, validate RLS policies, Google login, payment webhook idempotency, mobile layouts, accessibility, and the migration against a backup/preview database.
# Cập nhật database / community evidence

Catalog **200 tool đã nằm trên Supabase ở CANDIDATE**, chưa public. Không chạy toàn bộ migration history. Xem [rollout database](docs/database-community-rollout.md) và [checklist mở beta](docs/launch-readiness.md). UI đọc database, không dùng fixture thay dữ liệu thật. Video Kits chỉ là demo, chưa có gói tải.
