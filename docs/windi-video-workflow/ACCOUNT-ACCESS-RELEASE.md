# Account access update — 2026-09-11

## Customer flow

Purchase → download personal installer → open Cai Windi.command → enable extension → start project.
The website creates a scoped account token and the installer stores it in Keychain.
Local CLI and MCP operations require neither login nor a network license check.
Voice requests alone still require the purchaser account token and available credit.
No hardware ID, device registration or one-machine limit is required. Account
entitlements, revocation, private downloads and Voice credit accounting remain.
Legacy `license activate` and `/devices` clients authenticate account ownership only.
Existing device rows are retained for historical audit; they do not gate access.

## Image cleanup

Pinned MIT dependency: GargantuaX/gemini-watermark-remover, npm
@pilio/gemini-watermark-remover 1.0.41; sharp 0.35.4.
`windi images clean --project PATH` runs locally. Completion of the asset stage and
preview/render also run cleanup. Flow originals remain untouched. PNGs and reports
are stored under windi/cleaned using input hashes and engine version. Corrupt or
changed cache outputs are regenerated. ChatGPT assets skip this Gemini-specific step.

Real ad run: 13 images processed; 12 applied, scene 06 no-watermark-detected.
Second run: 13 cache hits. Scene 13 comparison still has a faint star, so applied
is not a guarantee of complete visual removal. Review before publishing.

## Verification and delivery

Next production build passed. Account-access tests: 2 passed; Voice/API + video-kit
checks: 13 passed. Connect typecheck and 35 tests passed. New dependency audit: 0
vulnerabilities. Installer packaging includes the Node dependencies and license.
Source and installer are local. Vercel CLI reports logged out; production deployment,
release upload and opening paid checkout are not completed. Existing release flags
are unchanged. Layout polish remains deferred as requested.
