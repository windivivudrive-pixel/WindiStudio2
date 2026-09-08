# Motion + editorial access — 2026-09-03

## UI

- Removed the `/admin` link from the public footer. Access is direct URL + authenticated editor membership, not hiding the link as a security measure.
- Added floating software labels and windows on Home and Video Kits. Follow-up: original arcade-style green-head pixel duck with two wing frames, click/keyboard hit, local score and falling animation; replaced the sailor sprite.
- Flight direction, altitude, duration and intervals vary client-side (11–15 second flights). Floating cycles are now 3.2–4.8 seconds with larger 10–16px movement. The flight uses the upper band; only the visible bird is clickable, the rest of the overlay passes through clicks. Soil-and-grass pixel footer retains its existing navigation, without an admin link.
- A motion toggle persists the preference. `prefers-reduced-motion` disables flight and CSS animations. Visibility changes cancel flights; navigating away clears timers/animations. Hero window motion pauses while its search field is focused.
- UI/UX Pro Max informed focus, reduced motion, static initial rendering and responsive limits; Windi's blue/cream retro tokens remain unchanged. Video Kits remains preview-only, with no provider calls/download.

## Live Supabase changes

- Verified the requested email exists, is confirmed, and corresponds to the existing legacy admin. Did not create users, change credentials or edit Auth records.
- Fresh pre-change legacy snapshot: `.backups/windi/pre-catalog-2026-09-03T14-21-43-833Z`. Contains legacy rows, schema metadata and bucket manifest, not a full Auth/Storage-object backup.
- Applied only `20260903131154_windi_editorial_review.sql`, then `ops/provision-editor.sql`, within one transaction through the authorized dashboard SQL Editor. No migration-history entry is claimed; do not run `db push` across historical drafts.
- Editorial membership is provisioned from the exact verified Auth identity, never copied from user-editable legacy profile role. The operation is repeatable for that resolved user ID.
- Read-back: requested account has editorial admin membership; 200 resources, 5 transactions remain. The service role cannot UPDATE audit rows, ordinary authenticated users cannot grant membership or execute review RPC.
- Live rolled-back verification passed: editor reads 200 candidates; a nonmember and anon read none; service-only review RPC updates revision and inserts audit atomically. Transaction rolled back, so no resource was published or test review retained.
- The entire end-user Google login and browser form submission have not been impersonated/tested. The user should visit `/admin`, select their provisioned Google account and use the queue normally.

## Verification

38 local tests and Next production build passed. These cover parser/import, local PostgreSQL/RLS/editorial permissions including default-grant behavior, auth redirect boundaries, deterministic initial motion UI and flight limits. No generated secret or browser session is exported into the repo.

Security Advisor after refresh: 0 errors, 13 warnings and 2 suggestions. Visible warnings concern legacy promo functions, permissive policies on legacy tables (including profiles/transactions/library_images) and public bucket listing. No warning shown for the new editorial objects. These existing warnings are not fixed by granting editorial membership and remain production-hardening work; no unrelated legacy permissions were changed here.

Database SQL editor note: Monaco's visible textarea can contain only part of a long query. Select all and clear the editor before filling a replacement query; read back results independently through the Data API where possible.
