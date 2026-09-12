# Verification status — 0.5.4

## Verified locally

- macOS Apple Silicon installer packages a Node runtime, LaunchAgent, owner-only
  Unix socket, SQLite state, stable unpacked extension IDs and native messaging
  manifests for Chrome and Cốc Cốc.
- `windi doctor` reads the local daemon without creating an image.
- Extension transport handles a missing native host without an unhandled error,
  requires the provider-specific extension identity, automatically pairs the
  first installation and requires an explicit reset when the installation ID
  changes.
- Automated checks cover protocol framing, provider URL boundaries, persistent
  project IDs, copied-project conflict/fork, request-key idempotency, fair
  provider scheduling, image header validation, staging and non-overwrite
  publishing.
- Flow Angular uses same-page `FlowService.BatchGenerateImages` RPC (`ogiZ0b`).
  No DOM snapshot, click, fill, or download selector is used by this job path.
  The previous selector adapter is archived in `flow-legacy-ui.js`, not bundled.
  CSRF remains inside the Flow page; signed media URLs remain byte-for-byte intact.
  Responses are persisted per job before download, allowing download-only recovery.
- Reloading the extension and inspecting the Flow adapter state does not submit
  a generation or consume image quota.

## Must still be verified with the user's provider accounts

The implementation intentionally does not claim this evidence yet:

1. Flow: multi-reference live generation and edit (edit remains explicitly unsupported; single reference verified below).
2. ChatGPT: new image → reference attachment → edit → exact original download.
3. Three real projects queued in alternating order, plus browser reload and
   sleep/wake while a provider is generating.
4. Final rendered-video QA remains unverified. The existing workflow consumed
   the full 13-scene manifest on 2026-09-11 (see continuation evidence below).

## Live evidence — 2026-09-11, Cốc Cốc / gemini profile

- Read-only config/model RPCs returned 200 in the authenticated Flow tab.
- Scene 06 job `f21d05c6-8891-4aa3-bafe-ff668dda40dd` generated via RPC;
  media `0c459d8b-8602-4d96-9064-af3af67b1017`. Initial download failed because
  the adapter incorrectly appended `=d` to a signed URL. Keeping the original
  URL returned JPEG 768×1376. After helper restart/extension reload, download-only
  recovery completed the same job without resubmission.
  Output: `videos/windi-workflow-ad/assets/windi/scene-06.jpg`.
  SHA-256: `eb59e739b377d685f7f46f124b47a281ca967d2af116c18c037173de8dac3c16`.
- Scene 07 job `c00d6496-95df-4b17-aa69-08823359925e` completed create → download
  → staging → project automatically using the corrected adapter (no manual import).
  Output: `videos/windi-workflow-ad/assets/windi/scene-07.jpg`, JPEG 768×1376.
  SHA-256: `908a6b46167f4b0aab242aacc4339bb2f9dbb5c7f8f063047bb7ce42fd01839a`.
- Scenes 01–04 were imported in earlier runs; they are not direct-generation evidence.
- Scene 05 was unresolved in this initial run; it was later resubmitted with
  explicit user authorization and completed (see continuation evidence below).
- Chrome, reference/edit, multi-project live concurrency and sleep/wake remain
  unverified for this RPC adapter. ChatGPT was not retested in this turn.

This is still `production-candidate`, not a claim that every release gate passed.

## Continuation evidence — 2026-09-11, 02:35 UTC

- `windi doctor --json`: active license; Flow connected and paired.
- Windi Connect tests: 35/35 passed outside the sandbox (the first sandbox run
  could not bind the daemon test port). `npm run typecheck` passed.
- Resumed the existing request keys for scenes 08–13, which had been cancelled
  before submission. Scene 05 was retried only after the user explicitly allowed
  regeneration despite its previously unknown result.
- Scenes 05 and 08–13 completed direct Flow creation and automatic original
  download to the project. No manual import was used for these seven assets.
- All 13 project images exist; decoded dimensions and SHA-256 match job results.
  Full job IDs, paths and hashes are recorded in
  `videos/windi-workflow-ad/windi/manifests/assets-verified-20260911.json`.
- `windi workflow continue --json` consumed the complete manifest, returned
  `stage: voice` and `queued: []`. No complete images were regenerated.
- Visually inspected all seven new originals. Some have visible Gemini marks
  and generated English/pseudo-text despite no-text prompts. Originals are
  preserved; file completeness does not mean final visual approval.
- Windi Voice trials using Minh (`0e58d60a-2f1a-4252-81bd-3db6af45fb41`)
  and Linh (`935a9060-373c-49e4-b078-f4ea6326987a`), speed 1, approved full
  script v01, both returned: “Phản hồi timestamp từ nhà cung cấp không hợp lệ.
  Credit đã được hoàn lại.” No MP3/captions were returned. Refund is reported by
  the API, not independently checked against a balance ledger.
- Local source `lib/voice/api.ts:parseCartesiaSse` rejects malformed JSON,
  unequal timestamp arrays, blank words and non-positive word durations.
  The specific provider response was not retained, so root cause is unconfirmed.
  Voice remains blocked pending timestamp-path diagnosis; no further paid trial
  was submitted. No video was rendered in this continuation.

### Prompt ratio and download cleanup (2026-09-11)

Flow now resolves explicit prompt ratios 9:16, 16:9, 1:1, 3:4 and 4:3 to RPC aspect values. Conflicting or unsupported numeric ratios fail before submission. Default without a ratio remains portrait. After a job completes, its attributed file under ~/Downloads is removed only when both it and the published project original match the recorded SHA-256. Failed publication and files outside Downloads are retained. Existing downloads are not swept. Verified with unit tests and TypeScript; no new paid Flow generation performed.

### Workspace tab reuse (2026-09-11)

Both extension entry points now reuse a browser tab matching the requested workspace URL instead of creating one per job. A missing workspace opens in the background. Other workspace tabs are not navigated or closed. Combined-extension matching is covered by tests for repeat jobs, missing tabs, origin isolation and query isolation. Extension tests: 8 passed; build and typecheck passed. Browser reload and a live batch remain unverified. Flow reference attachment/edit remain explicitly unsupported.

### Flow reference upload — verified live 2026-09-11 07:40 UTC

- Official Flow Angular module `wO1vlb` / `XRV0Af`, build `4VUdhqiXTI4.2018.O`, identifies `maseQ` as `FlowService.UploadImage`. Uploaded media IDs enter image request field 3 as ingredient type 1, rather than prompt-only text.
- Implemented PNG/JPEG/WebP references, up to 4 files of 20 MB each. Native messages carry at most 524288 base64 characters per chunk; final bytes must match size and SHA-256. Only project/job-owned reference files are read. Reference IDs are cached per workspace and source hash; base64 is not persisted.
- Live job `45d807e5-4889-4ce6-af82-afbd3b11335b` completed upload → reference generation → original download → project publication. Uploaded reference media: `e89f67e1-ccbb-4693-95b9-40591da27a05`.
- Output `videos/windi-macos-smoke/assets/windi/reference-test.jpg`, JPEG 1376×768, SHA-256 `0a51b32d72d4312e04ba189b1afddabfe48be30a3c724f171408164c824e0398`. Prompt requested 16:9. Flow's native landscape dimensions are approximate 16:9, not an exact mathematical crop.
- Viewed source and output: creator, olive jacket and workstation closely retained; requested orange cat added. Generated screen text remains despite no-typography request.
- Job-attributed Downloads file ID 94 no longer exists after verified publication. Repeated open calls returned the same tab. Reusing the same reference returned its cached media ID without uploading or generating again. Evidence: `videos/windi-macos-smoke/reference-test-verification.json`.
- Full Windi Connect tests: 42/42 passed; TypeScript and extension build passed. Installed locally and reloaded the combined extension. This does not update the previously packaged release ZIP or publish a new release.
- Multi-reference behavior is implemented and structurally tested but only one reference was tested live. Edit/mask workflows remain unsupported.

### Extension logo (2026-09-11)

The supplied retro Windi mark is bundled as `extension/icons/icon-{16,32,48,128}.png`, declared in the combined manifest for the browser action and extension identity, and installed into the active Windi Connect extension directory. The source artwork is retained as `extension/icons/windi-logo.png`.

### Image list view (2026-09-11)

The popup's recent-image area now renders up to eight saved assets as a compact list with local 96px JPEG previews, filename and shortened path. Previews are enlarged in the popup while filename/path text stays compact. Each row's action asks the native host to reveal the asset with macOS `open -R` in Finder; a `file://` tab remains only as a fallback when the native host is unavailable. Thumbnails are generated locally beside the project asset as `.thumb.jpg`; no original image bytes are sent to the extension. Existing assets were backfilled (27/27). The extension build was regenerated and copied into the active install.

### ChatGPT create and original-download smoke test (2026-09-11)

One square image was created through the active ChatGPT provider in `videos/windi-macos-smoke`. The live UI confirmed that the prompt was submitted and that ChatGPT produced a result. The completed original was saved as `assets/windi/chatgpt-download-smoke.png` (PNG, 1254×1254, SHA-256 `534a2df00e19dc387cf2aa41bdc94f9b8390fd5c8ea0f7bf13456d4b5857e817`). The daemon staged, checksum-verified, and published that same file; no fresh file remained in Downloads after completion. The provider now clicks the observed Send button after filling a ChatGPT prompt and recognizes ChatGPT's current `Generated image` button when opening an image for its native Save action.
