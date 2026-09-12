# Voice admin — 2026-09-11

## Current live access

`quochungdn151@gmail.com` / `4f018bf9-b2c6-4075-8a21-9018efcb003f`
was verified against Supabase Auth (confirmed email) and provisioned in
`public.windi_voice_admins`. Existing editorial membership was already admin.
The dedicated table is the authorization source; browser metadata and email
strings are not authorization checks. Membership is checked on each request.

Migration `20260911024124_windi_voice_admin_access` is applied and recorded in
remote migration history. Admin jobs/clones carry `admin_funded=true`, do not
consume retail periods or workflow bonus, and retain normal job idempotency,
provider limits, history and storage ownership. Clients cannot write membership
or call reservation RPCs. Provider charges still apply to the connected Cartesia
account. Removing membership stops new privileged requests.

## Application change

The source adds a private Voice Studio admin panel with provider voice lookup
by ID and a paginated provider library. Browser and automation
generation resolve admin voices against Cartesia directly. Other users keep
their existing curated-library and owned-clone permissions.

`CARTESIA_API_KEY_MAIN` remains server-only and is used for paid-account TTS
and all voice clone operations. `CARTESIA_API_KEY_1` through
`CARTESIA_API_KEY_5` are a server-only pool for free-account TTS. The pool is
selected deterministically per user so retries keep using the same key. No API
keys are returned to the browser.

## Verification and remaining blockers

- 166 tests passed across 25 files; production build passed.
- Live transaction verified admin-funded reservation, then rolled the test job
  back without any provider call. Anonymous/authenticated reservation access is
  false. Tests cover client metadata spoofing, refunds and duplicate requests.
- Supabase security advisor reported pre-existing promo-code function and Auth
  warnings, none naming the new admin membership or voice functions.
- The website change is **not deployed**: Vercel CLI reports an invalid token.
  Restore Vercel authentication before deployment; do not claim browser UI live.
- Voice ID `4499b44b-5180-4d65-9d76-e24405138493` now returns HTTP 200 with
  `CARTESIA_API_KEY_MAIN` (read-only lookup). The previous HTTP 404 came from
  the old key. No TTS was submitted in this routing task, so no credit was
  consumed.
- The prior video voice timestamp error remains a separate unresolved issue.
- Authenticated browser layout QA is pending deployment/login access.
