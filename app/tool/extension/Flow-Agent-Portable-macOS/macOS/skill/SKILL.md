---
name: flow-agent-portable-macos
description: Generate Google Flow media using the portable macOS bridge, local image references, project-relative outputs, and automatic environment checks.
---

# Flow Agent Portable macOS

Run `macOS/scripts/status.sh`; it starts the bridge when absent and reports any
one-time Chrome setup. Run jobs with `macOS/scripts/run-job.sh <absolute-job>`.
Read `macOS/README-VI.md` only for first-time installation or manual operation.

Keep an explicit output and stable idempotency key. Resolve output and up to 10
local refs relative to the job. Do not change or blindly retry a job after an
uncertain submission. If Google presents CAPTCHA, leave it to the user, then run
the unchanged job after verification. Use an output only after exit zero and an
existing media file.
