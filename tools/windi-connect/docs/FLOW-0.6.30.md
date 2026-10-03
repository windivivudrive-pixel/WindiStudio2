# Flow 0.6.30 — image acceptance

Date: 2026-09-30. Tested on macOS Apple Silicon, Cốc Cốc, paired Work profile.

Research: kodelyx/flow-agent at 7d7abdd4da1a43954e49603dc2b9214229d891c6
and kodelyx/flow-go at 70ec73861091267dd1f57184bcf809a922bea85b.
Windi retains its own Node/SQLite/native bridge, project isolation, fair queue,
job attribution and renderer. No upstream precompiled binary is included.

## Supported production image path

Explicit 9:16, 16:9, 1:1, 3:4, 4:3; standard/pro/lite; 1–4 individually
tracked variants; ordered refs; edit with input first; original 1K download.
Four inputs maximum, PNG/JPEG/WebP, 20 MB per file. Model choices depend on
the logged-in account. Fixed seed RPC is experimental and failed live with
PUBLIC_ERROR_UNUSUAL_ACTIVITY; ordinary workflow jobs use the tested UI path.

The adapter clears old ingredient chips, uploads each approved file, confirms
Add to prompt, verifies loaded ingredient count, applies exact settings and
performs one trusted submission. It briefly focuses a managed Flow window and
restores the previous window. Per-job storage survives worker reload and
prevents repeat submission. New tiles are checked against the full prompt;
reference-upload tiles cannot be downloaded as the generated result. Downloads
must be fresh, from Flow, attributed, decodable and match the selected ratio
within 4% (Flow's native sizes are approximate). SHA-256 precedes publication.

## Live jobs

Three independent local projects with three distinct Flow workspace UUIDs.
The following four queued jobs completed automatically without manual submit,
resume or imported media:

| Job | Operation | Model | Result | SHA-256 |
| --- | --- | --- | --- | --- |
| 31676247-52cf-4043-878a-c5cb72168cc5 | variant 1, 9:16 | Pro | 768×1376 | 5e93c46e8473085837f495717effd6b2ed77aab3edd84b8105a7e692ec899f60 |
| 91a2947f-4f92-4d5f-ba0e-25e7eb47fc1e | four refs, 3:4 | standard | 896×1200 | 800b2bc8319d4396e97c532f7d854030e1a11ec804c652d15ae027e54df71e17 |
| c13b51da-c969-4920-aade-0145841697bb | variant 2, 9:16 | Pro | 768×1376 | 6c12d1bbb44891f9f6b3c54e77ecdb95828aac92cb83577e9eddf86d108067a1 |
| 0cd2c84e-f459-4b82-8c4f-72601930f6d8 | edit input, 1:1 | Lite | 1024×1024 | 55f77bc326e0a7fe8d3caed8d3b900d356e8b3514b237c1e4a0c2cea241f141a |

Earlier clean 16:9 Lite job 6fe1eb9e-275c-4b29-b78c-9bc9ab60dd9d:
1376×768, SHA-256 55bfa36075d19eb6413fe46d0b0710af7ecdc84bbddd6dd2eb6642ff9656da86.
Single-ref 4:3 job ee7be777-6d49-4613-b358-78487d6ca178 completed by recovery
without resubmission after a wrong upload tile was safely rejected:
1200×896, SHA-256 59129650d03a5b5c61f9ce6d64ca185284154d2af52b44777e6dd0171fda7b27.
It is recovery evidence, not a clean first-attempt run. Early square/portrait
smokes required manual acceptance or recovery and are not counted as clean.

All outputs live under visual-checks/windi-flow-0630/project-{a,b,c}/assets/windi.
Visual inspection confirms the requested subjects, ref materials and framing.

## Verification scope

118/118 automated tests passed; TypeScript and extension build passed.
Tests cover count=4 idempotency, changed-count/model request-key rejection,
atomic rollback, project isolation, restart before/after acceptance, wrong-asset
protection, durable download reuse and actual aspect validation. Count=2 and
four refs were checked against the real service. No claim of long-term uptime,
Chrome live acceptance, Windows/Intel native acceptance, or seed stability.
Installer and published-object results are recorded separately in the release
report after verifying the exact ZIP.
