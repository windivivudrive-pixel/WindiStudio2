# Windi Timeline — local prototype QA, 2026-10-07

## Verified scope

The shared editor is separate from Next.js. WS25 (`ws25-esp32-adblock`) uses an isolated `EditorComposition.tsx`; the original composition and delivered MP4 were not overwritten.

- Browser: live playback/pause, scene selection, media override, pointer-drag scene boundary, one-frame keyboard trim, headline changes, caption changes, undo/redo, save and reload persistence.
- Layout: inspected at 1440×900 and 375×812; narrow page has no horizontal document overflow. The timeline and media library deliberately scroll horizontally.
- Export: clicked “Xuất video” in the editor after changing a headline and scene boundary. The 1942-frame snapshot produced H.264/AAC, 1080×1920, 30 fps, 64.789333 seconds, 49,639,226 bytes. A decoded frame confirms the edited headline, media, caption, watermark and footer in the actual MP4.
- Technical QA passed after correcting the audio metadata check to use `audioCodec`. Existing outputs can be checked with `node kits/video-starter/editor/export-qa.mjs OUTPUT_FOLDER`; this does not render again.
- A separate three-frame check verifies the latest PNG-frame / BT.709 render settings produce `yuv420p` rather than the initial JPEG default's full-range `yuvj420p`. This was a format-only test, not a second complete export.
- Seven Node tests cover timing continuity, caption edits/whitespace, invalid documents, stale-save conflicts/history, path/symlink confinement and SRT timestamps. Editor TypeScript check passes.
- Legacy attach tested on a temporary copy of WS24. The original composition SHA-256 stays `a7c114c025f85860e8375cb7b20799acc3b2ade2dbb53b0c9e7561fa453ddf7b`; a second attach preserves the existing adapter.
- Active and tracked repo-video skills validate. Generic `windi-video-workflow`, customer installer and website delivery are unchanged.

## Evidence

Full test snapshot and outputs:

`videos/windistudio-repo/ws25-esp32-adblock/windi/editor-exports/1791380040991-ef1b30fc/`

The test export is revision 2; the working draft was restored to the episode's original headline/timing and saved as revision 3. Test outputs remain separate and recoverable. Preview/save did not launch additional full-video renders.

## Remaining limits

- Full exported-video listening/visual review is pending. `technicalPassed` is not editorial approval or `DELIVERED`.
- This is a basic local editor, not a full CapCut replacement: fixed narration length/scene order, no arbitrary new layers, transitions, voice regeneration, arbitrary scene animation controls or cloud collaboration.
- Import and cancel are implemented but were not exercised end-to-end in this QA pass. Existing-media selection was tested.
- Custom/Three/global-timed episodes need an appropriate props adapter; the helper does not claim universal legacy support. Verify each episode's preview.
- Vite currently comes from this workspace. Standalone packaging, customer auth/storage, distribution, billing and generic Windi workflow integration are phase 2.

## 2026-10-10 — Basic layout editor

- Added six registered native roots, pointer move/resize with one undo checkpoint per gesture, keyboard nudges, numeric geometry/typography, wrapping, per-scene/global inheritance and reset. Added preview zoom/scroll and timeline collapse; scoped editor element styles away from native preview scenes.
- Added music upload/switch, trim, timeline offset, loop/fades and validation of actual audio duration through ffprobe. Added dark fade and retro scan overlays without changing narration timing.
- Current WS25 timeline is **2158 frames / 30 fps**, with a continuous `douyin_synced.mp4` in its native RetroWindow. The previous editor adapter represented six older animated scenes and a 1942-frame draft. Updated the isolated adapter from current Composition.tsx, preserving the continuous source when no media override is present and the correct global trim for unmodified scenes when an override is present. Original Composition.tsx and delivered MP4 were not written. Prior adapter is backed up in `.windi/editor/adapters/`; prior incompatible draft r3 is in history.
- Browser interactions verified: headline move (80,275 → 187,411) and single-step undo; headline resize; keyboard nudge + undo; global x110 inherited by scene 1, scene 2 override x160 and reset; native window proportional resize 920×880 → 834×798 + undo with the same video source; timeline boundary drag 14.60 → 15.60s + undo and keyboard 14.600 → 14.633s + undo; scan mask at the cut; import a 1-second WAV fixture and save trim 0.1s/offset 1s/fade 0.5s. Saved draft was reloaded successfully.
- QA coordinates and test music assignment were removed after verification; current saved draft is r6, with original `musicbg.mp3`, 0.95 gain, native 15/25-frame fades. Imported QA WAV remains in editor-media so test revision history stays reproducible. Existing scene copy/timing/assets were retained.
- Responsive checks: 1280×720, desktop default 1286×983, tablet 820×1180, phone 375×844, landscape 844×390. Document width did not exceed the viewport at the tablet/phone/landscape sizes. Phone uses stacked preview and inspector; numeric controls remain available. Preview at 200% scrolls inside its stage without expanding the document. Temporary viewport override was reset.
- Final editor typecheck and a separate typecheck including the WS25 adapter passed. **11 model/integration tests passed**, including safe layout values, inheritance, music/transition constraints, revision protection and native-source-preserving attach. Export composition **webpack bundle passed** at draft r6 / 2158 frames. Browser error/warning log was empty at handoff. Code graph updated.
- No new MP4 or still frame was rendered during this change. These checks verify editor interactions, persistence, source adaptation and bundling; they do **not** establish visual/audio parity of a newly rendered MP4. Final render and listening review remain behind the user's Export action.
- Screenshot: `docs/research/windi-timeline-basic-2026-10-10.jpg`.

## 2026-10-10 — Familiar editing layout / gray-blue theme

- Reorganized the editor around a left library with Media / Audio / Captions / Layout tabs, central player, right property inspector and bottom timeline. Audio assets can select background music; caption entries seek to the corresponding timestamps. Existing controls remain connected to the same document model.
- Replaced the green editor palette with charcoal surfaces and muted blue selection, controls, clips and playhead. Consolidated the stylesheet while preserving its isolation from native composition elements. The episode composition and adapter were not edited.
- Preview fit now accounts for both available width and height; at 820×1180 the stage is 322×664 and the fitted canvas is 318×565. At 200% the canvas is 636×1131, scrolling inside the stage while the document remains 820px wide. Short desktop viewports use a compact timeline to give the preview more room.
- Browser QA: all four library tabs, 3 audio entries, 50 caption entries, 6 layout roots, caption seek to 00:03:02, scene selection, timeline collapse/expand, keyboard nudge and undo. Pointer move changed headline (80,275) to (131,309); one undo restored (80,275) and the saved indicator. No draft save or export was triggered.
- Checked 1280×720, 820×1180, 375×844 and normal desktop 1286×983; no document horizontal overflow at the checked responsive sizes. Temporary viewport override reset. Browser warning/error log empty at handoff.
- Editor typecheck passed after final changes; existing 11 tests passed. Code graph updated. Screenshot: `docs/research/windi-timeline-gray-blue-2026-10-10.jpg`.
- These are editor UI checks; no new MP4 was rendered in this revision.

## 2026-10-10 — Retro track colors

- Timeline colors now distinguish scene/image (sage), captions (sand), voice (existing blue) and background music (lavender). Track labels, icons and left-edge color marks match the corresponding track; labels remain readable without relying on color alone. Scene trim handles and selected/hover states follow their track palette.
- CSS-only update. Browser verified scene and caption selection without changing the draft. Measured text/background contrast for scene metadata, caption text, voice and music was 4.68–6.94:1 in the checked states. No MP4 export triggered.
- Screenshot: `docs/research/windi-timeline-retro-tracks-2026-10-10.jpg`. Code graph updated.

## 2026-10-10 — Timeline group selection, window content and media drops

- Added marquee and additive Shift/⌘/Ctrl selection for caption/media/music items, group drag with common constrained delta, select-all subtitles, numeric time shift, keyboard nudges and a shortcut to the global subtitle layout. Caption duration/spacing and karaoke word timestamps move together; unselected neighbours block overlap. Captions may extend past the fixed voice timeline; the UI marks that boundary and SRT export clips/omits the excess.
- Added an independent single media track: drop video/image at a chosen timeline time, move and trim clips, replace source, contain/cover, source trim, volume and delete. Actual source duration bounds video trim; still images can extend freely within the timeline. Library dragging uses pointer capture with a visible ghost; external files use native HTML file drop and the existing local import API. No drag/drop dependency added.
- Added a shared `EditorWindowMedia` wrapper to the WS25 adapter and future attach output, preserving the native continuous source and existing scene code when no clip is active. The wrapper supports per-scene/global translation and scale inside the window, with matching preview/export props. The original Composition.tsx and delivered MP4 were not written.
- Browser QA at 1280×800: dragged all 50 subtitles +1s and undid in one step; marquee selected the first three captions; dragged native window content to x10.43% / y10.76% and undid; dragged `clip_beat1.mp4` from the library to 5s, moved it to 8s, trimmed its end 29s → 27s and undid the trim. Preview changed to the imported track source. Checked the global subtitle-position shortcut selects `captions` with scope `all`.
- Saved a combined test document (clip at frame 240, scene content x8%, first subtitle/word at 1119ms) as r8, reloaded the UI, and verified all three fields persisted. Restored the exact original r7 document fields through revision-checked save as r9; r8 remains in history. Existing user-imported media and settings retained.
- Responsive QA: 375×844 and 1280×720 have no document horizontal overflow. Content numeric controls are available in the stacked phone layout. At 1280×720, dragging the timeline divider reduced its height 322 → 252px and increased fitted preview height 176 → 246px. Temporary viewport override reset. Browser warning/error log empty during the pass.
- Editor and WS25-adapter TypeScript checks passed. All **16 model/integration tests passed**, including grouped timing, source-aware trim, image extension, inherited content transforms, persistence and invalid documents. Export webpack bundle passed using the combined r8 interaction snapshot. Graph updated.
- Screenshot `docs/research/windi-timeline-interactions-2026-10-10.jpg` illustrates the temporary QA edits; the live editor was returned to the user's original draft fields. No new MP4/still render or generation was launched. External OS-file drag/drop is implemented but was not exercised by browser automation; library-to-timeline dragging was exercised. Final encoded-video/audio review remains behind the user's Export action.
