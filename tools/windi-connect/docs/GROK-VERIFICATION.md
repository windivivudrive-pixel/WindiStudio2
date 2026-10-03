# Grok Web 0.6.3 — reference video acceptance, 2026-09-18

Video submission now uses Grok Imagine's own composer in Windi's dedicated tab.
Reference bytes are hashed and uploaded, then selected by a job-specific filename
in Uploads in the original order. This does not bypass challenges or export cookies.

## Final repeated two-reference run

Job `046c1831-6f0a-4938-948a-ae08ab76e245` completed on 0.6.3:
`assets/grok/omo-two-ref-9x16-final.mp4`, 720x1280, 6.041667 seconds,
SHA256 `1fe0d84382797e108535ef644e731a115600cd19be70c1a34f119d38438686d2`.
Grok replaced its placeholder post during generation. The adapter now follows
conversation `a8365e9e-f609-46f8-8947-7f6130a01105` and updates the post link;
no generation was resubmitted. Chrome download 235 was automatically published.
The full file decoded without errors. Final post:
https://grok.com/imagine/post/f1aa3e21-5f28-4d0b-919d-220bf5600801?conversation=a8365e9e-f609-46f8-8947-7f6130a01105

Typecheck and 73 automated tests pass. Stable extension ID is unchanged;
Cốc Cốc gemini shows extension 0.6.3. Installed source and packaged source match.
Flow/ChatGPT retained 124/2 completed jobs and existing pairing.

## Live results on Cốc Cốc / gemini

- Two refs (OMO package, model), job `8b39f33c-9207-4ee5-8545-e715b1ad8c25`:
  complete; `visual-checks/grok-live/assets/grok/omo-two-ref-vertical-v5.mp4`;
  H.264/AAC, 720x1280, 6.041667 seconds, 2,898,708 bytes.
  SHA256 `ad76f7e0af3d5566b89162e361c69ee32d3fc96bcff64022d465a3c44ba21c25`.
  Post: https://grok.com/imagine/post/1e33ee42-6a3e-45ff-a355-0b893864ed14?conversation=ff1e276f-b424-4937-bec0-c258bbc4acc9
  The visible player showed the model holding OMO. Tab reload, runtime restart
  and extension reload retained this job's result; no second submission was made
  by resume. Chrome download 233 was ingested automatically into the project.
  Full FFmpeg decode passed.
- One OMO ref, job `84a0118a-df25-4e03-a66d-aeea200a5927`:
  complete without intervention; `assets/grok/omo-single-ref-verified.mp4` in
  the same project. 880x1040, 6.041667 seconds, Chrome download 234.
  SHA256 `ac97cdbf041c51b1031f344dfe8a4a2ad01c11e0de775ea3c230521d7e511e61`.
  Post: https://grok.com/imagine/post/caa8233c-fa32-46b0-8f5e-b98f790c923b?conversation=ebeb8c1d-c937-4549-b513-89b878c869e0
- Four earlier adapter attempts stopped before Submit while resolving the upload
  target and React dropdown events. They are failed diagnostics, not successful
  generation tests. Do not count their submitted_at timestamps as provider receipts.

## Boundaries

- Up to two references supported by this adapter. One ref uses first-frame mode
  and source aspect (`auto`); explicit aspect with one ref is rejected before job
  creation. Two refs support the observed aspect controls. Durations: 6/10/15s.
- Job snapshots and exact post links persist. A missing/ambiguous result never
  authorizes another generation. Recovery reads the old post or download only.
- Completion requires the large player on the correlated post, enabled Download,
  completed Chrome download, local file validation, then publication in the project.
  Library thumbnails cannot be used as the job result. Output aspect and duration
  are validated; mismatches keep the original for inspection and do not regenerate.
- Media-generation quality is model-dependent. This is macOS live acceptance;
  Windows runtime and future Grok UI changes still require their own validation.
- Image-ref HTTP 403 behavior has not been fixed or re-certified by this video work.
- Flow/ChatGPT generation code remains outside this change. Regression tests cover
  those providers; connection/data checks are not new paid generation tests.

---

# Live update — 2026-09-18

0.6.1 Grok Web is now activated on the local machine. The prior rollback had
left 0.6.0 OAuth active, which explains why a logged-in web account did not
connect. Native/daemon restart and browser reload restored Web connectivity.
UI logout/disconnect followed by login passed; status reports authenticated,
transport=web, no error. Reconnect now verifies login instead of only sending hello.

Image job 37c8ff23-cb67-40c9-adc4-057c4e22dc4a passed live subject inspection:
orange origami fox beside translucent green computer; JPEG 1008x1792. File is
visual-checks/grok-live/assets/grok/web-first-image.jpg. SHA-256:
ae55ae7245eda2fa3516287acad0f1834cc3367169eec76a40fbf5ba99729f87.
The browser downloaded the file. macOS Downloads access stalled local ingestion;
Grok now transfers the attributed asset through its extension in bounded chunks,
verifies SHA-256, then writes directly to staging/project. Recovery completed
without a second generation request. No credential leaves the browser.

Two-reference job 8fa4cfc9-edfb-441d-9027-d79b6e055681 was rejected by the Web
request path with HTTP 403 (GROK_WEB_CHALLENGE) during preparation, before image
generation submission. Multiple-reference live acceptance has NOT passed.
Do not claim ref stability, video acceptance or Imagine History synchronization.

Typecheck and all 66 tests passed. Flow/ChatGPT connection and prior completed
counts were preserved (124/2); no new Flow/ChatGPT generation was triggered.

---

# Grok Web 0.6.1 — verification status

2026-09-17. Source protocol: chenyme/grok2api commit
906b9493b099d192381c698d4e320fafeccb851c, MIT license included.

- Grok daemon uses the extension Web transport, not the OAuth media API.
- Browser-owned cookies remain in the browser; no cookie export or central server.
- Up to eight ordered image references; chunk lengths and SHA-256 verified before upload.
- Image WS waits for both final image and completion. Edits use uploaded metadata IDs.
- Text-to-video only; ref/input video is rejected before generation.
- Download attribution uses a persisted browser download ID for the exact job.
- Publication reuses local file validation without any OAuth or network dependency.
- Recoverable downloads resume without a new generation; ambiguous submissions do not
  automatically resubmit after tab loss.
- Typecheck passed. 66/66 automated tests passed, including existing Flow/GPT tests.
- Installed 0.6.1 with previous release and extension/launcher backup retained at
  `WINDI_HOME/backups/before-grok-web-061`.
- Before restart: Flow 124 completed and ChatGPT 2 completed, both paired/connected,
  zero queued and no active jobs. The upgrade was performed with no jobs running.

The live connection subsequently timed out while the Mac was locked. The final
0.6.1 source and extension are staged in its release directory. Active CLI,
launch agent and stable extension files were restored from the 0.6.0 backup;
no queued/running jobs existed during this restore. Browser reload/reconnection
still requires the unlocked desktop. Do not describe 0.6.1 as activated.

**Live Web image/ref/video acceptance is pending.** The Mac became locked while
reconnecting the extension. Do not claim end-to-end or History synchronization
from automated tests. The tests below describe the superseded OAuth route.

---

# Grok integration — local verification

Date: 2026-09-17. Release: 0.6.0.

## Implemented

- OAuth PKCE login/refresh/logout with loopback callback, state validation,
  xAI endpoint restriction, private local token storage and sanitized status.
- Independent native host, status storage and API job runner for Grok.
- Image generation/editing with up to five ordered inputs; @image aliases are
  validated and mapped before submission. Video supports text, one first-frame
  input, or up to seven references (720p maximum for references).
- Original media downloads into the project after image/MP4 inspection; stored
  video request IDs support recovery without another generation POST.
- CLI, MCP, popup, installer manifests and packaged source/license updated.

## Evidence

- TypeScript typecheck passed.
- Full suite passed (62/62), including legacy Flow/GPT tests and new OAuth, reference,
  media recovery, downloader isolation, workflow and daemon isolation tests.
- OAuth tests use a mock xAI response and a real local HTTP callback.
- Image/video tests use mock API responses and local fixture media. Video
  fixture is generated by FFmpeg and inspected by ffprobe.
- Popup visually inspected in a local browser with simulated connected and
  pending-login states. Pending login disables the login button.
- Extension build preserves the existing IDs and Flow host permissions/rules.
- Installer and universal ZIP build completed. This machine is macOS;
  Windows installer syntax/contracts are tested, not a Windows runtime install.
- Installed runtime smoke test used an isolated temporary WINDI_HOME before
  activation. The prior release, extension and launch configuration were kept
  for rollback. Existing native Flow/ChatGPT host registrations were retained.
- After activation, both Flow and ChatGPT reconnected with pairing preserved:
  Flow 124 complete, ChatGPT 2 complete, both 0 queued and no active job. This is
  connection/data verification, not a new paid generation test.

## Live acceptance: FAILED for API image content

Checked on 2026-09-17 using the installed release and the connected account.
OAuth login, model discovery and local download work. These do not establish
that image generation follows the prompt.

- Installed CLI job `19fde0a8-cb14-4273-8e5d-fb3cd476718c` requested an orange
  origami fox beside a green retro computer. Returned image: lighthouse.
  Re-fetching the same URL produced the identical SHA-256 as the local file.
- Independent minimal API request without the job scheduler or idempotency
  header returned mountains/lake for the same subject.
- A second minimal API request using `response_format: b64_json` returned an
  autumn forest. This also bypasses the media URL download path.
- The minimal request uses the documented `/v1/images/generations` endpoint,
  `model`, `prompt`, `n`, `aspect_ratio` and `response_format` fields. No proven
  local payload fix has been identified. The upstream cause is unresolved;
  do not claim the account, model or OAuth entitlement is the known cause.
- Controlled web comparison in the same Cốc Cốc profile, Imagine Quality 2.0,
  generated two correct fox/computer images. Screenshot inspection passed.
  Web uses its selected 2:3 ratio; this was a subject comparison, not a 9:16 test.
- Those web images are present under Imagine → All media → History
  (`https://grok.com/imagine/saved`), not the general Library page.
  Web result: https://grok.com/imagine/post/f95fd8ba-ebdf-4adf-b1a0-257012721d3a?conversation=f95fd8ba-ebdf-4adf-b1a0-257012721d3a
- The API runner only stores files/assets locally and does not create an
  Imagine web conversation. Do not promise web-history synchronization.

Sanitized request evidence and downloaded test files are under
`visual-checks/grok-live/` in the development workspace. No credentials are
included. No Flow/ChatGPT generation was triggered or code changed during
this investigation.

**Release acceptance remains blocked** on correct API image output; image-edit,
reference fidelity and video live acceptance are also outstanding. Unit tests
and HTTP success must not be presented as completion of those checks.
