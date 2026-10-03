# Flow 0.6.31 — background operation

2026-09-30, macOS Apple Silicon / Cốc Cốc, existing paired Work profile.
Feature acceptance continues from [0.6.30](FLOW-0.6.30.md).

Flow no longer calls windows.update focused:true or restores browser window
focus after submission. A Windi-owned window is created unfocused and explicitly
minimized (Cốc Cốc ignored the initial create state). Existing user windows are
never minimized. Project tabs are reused inside this managed window; it remains
open for the next job rather than opening/closing a foreground window per image.

CDP Emulation.setFocusEmulationEnabled scopes renderer focus during workspace
creation, reference attachment, submission and result download. A finally block
clears the override; the job releases its debugger on completion/error. There is
no foreground fallback. Unsupported background operation reports an error before
submission; failures after submission preserve the accepted job for recovery.
This uses the existing authenticated provider tab; login/challenges still need
the user's normal action when requested by Flow.

Protocol references: [renderer focus](https://chromedevtools.github.io/devtools-protocol/tot/Emulation/#method-setFocusEmulationEnabled),
[Chrome windows](https://developer.chrome.com/docs/extensions/reference/api/windows).

## Live evidence

Finder was raised through CUA before jobs. A bounded extension window-focus
trace remained empty from the extension reload through completion.

| Job | Test | Result | SHA-256 |
| --- | --- | --- | --- |
| e2b7fe5b-3797-4c44-a3fb-870b795a38a5 | new local/Flow project, Lite 16:9 | 1376×768 | ca9e0fc5352eea7a586cf90b8b3ece75fa456d67d6350a02b2e7a790d941863d |
| 4113f6fc-c35c-47a3-a5b4-d02b3feae07f | existing project B, standard, single ref 3:4 | 896×1200 | f36ba26ad8c40a4b856319bf8201921ac8578a1d404b263fa02a9bd0586a5632 |
| 3dec5484-87ee-4ecc-ba99-f4e8156c5c3a | Pro 9:16, explicitly minimized window | 768×1376 | 091f44bf460b1198627a16ca809e49760688ad45b88e4815af648888d356cf76 |

All jobs completed without manual submission, resume or imported media.
Focus receipts: visual-checks/windi-flow-background-0631/{project-d/focus-first.json,
focus-ref.json,focus-minimized.json}. First two were unfocused, unminimized; the
last receipt confirms state=minimized, focused=false, no focus events.
Exact installed ZIP acceptance is recorded in the release report.

## Limits

Live scope is Flow on Cốc Cốc/macOS. Chrome, Windows, Intel, sleep/wake and
long-running soak were not tested in this change. ChatGPT/Grok behavior was not
changed or retested. No new full voice/render acceptance is claimed.

## Exact final ZIP on this Mac

124/124 Windi tests, TypeScript, extension build, ZIP CRC and non-secret source
archive checks passed. The exact ZIP was extracted and installed. All installed
source and stable extension files were compared byte-for-byte with that ZIP.

- 2e246ed4-071f-4400-a06a-e34b5009a969: standard, four refs, 4:3,
  final-four-ref.jpg, 1200×896,
  SHA-256 62e1508603e176ad6e8da69c2e9707efc91ce72f31f784f7f8cdc328dafb0590.
- 12f0d645-0957-4505-9fac-2d8d0b2b6153: Lite, no refs after four refs, 1:1,
  final-clear-ref.jpg, 1024×1024,
  SHA-256 1af6a5a19a09346a9cd103f43efda165f50385b59e5d97d6f95a89ef597c40b0.

Both completed automatically. Original JPEGs were decoded and visually checked.
Finder remained focused; the managed Flow window stayed minimized, focused=false,
and focusEvents=[] throughout the quiet test. Receipt:
visual-checks/windi-flow-background-0631/focus-final-installed.json.
Extension version is 0.6.31. Debugger is released by the provider job finally block;
workspace remains available for reuse.

The first installed attempt, 051a4907-a0ef-4113-b2e8-13547c78b1e4, lost submission
confirmation during concurrent Flow UI activity; recovery subsequently found its
tab closed. The user confirmed another actor was using Flow at that time.
5bdc47e6-f9df-4864-ae95-65991f8246d4 stopped before submission when settings had
not yet appeared. These attempts are excluded from clean acceptance. Popover
readiness is now polled, and a closed tab reports a recoverable action error.
No ambiguous job was silently regenerated.
