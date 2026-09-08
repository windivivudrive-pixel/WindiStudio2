# WS01 QA — Archify / dark retro pass

## Export

- `final.mp4`: H.264, 1080×1920, 30 fps, AAC stereo 48 kHz, 47.55 s.
- Render completed and the final MP4 was remuxed successfully with FFmpeg.
- New Cartesia voice: model `sonic-3.6`, speed `1.15`, voice ID `de943f91-2f7f-47ca-88db-4a8d1cfc5291`.
- Audio loudness: -13.55 LUFS-I input, -1.29 dBTP input true peak; normalized mix measured -15.86 LUFS-I and -3.16 dBTP.

## Visual

- Dark navy canvas, mint grid, warm white typography, pink/copper accents.
- Grid uses a frame-driven 52px loop; teal and warm-gold highlights move slowly behind the layout.
- Scene cards use frame-driven translate/tilt so the floating retro feel remains throughout.
- The two practical examples use compact 68px titles. Remotion renders the actual Archify HTML in-frame, then moves one continuous camera between spoken nodes using cubic interpolation; no enlarged screenshot crops appear in the final video. Diagram cards retain an additional 10–11px frame-driven float and 0.7° tilt.
- Watermark remains visible from the first frame to the last; captions stay inside the vertical safe area.
- Final stability pass: the static Archify result now uses Remotion's canvas image layer and was exported with one renderer process. Three adjacent direct render checks (frames 300–302) retain the diagram in every frame.
- Watermark is now a single line: `WindiStudio - Sử Dụng AI Hiệu Quả`. `musicbg.mp3` is the current background music at 100% source volume.
- Still review: `evidence/dark/hook.png`, `hook-later.png`, `demo.png`, `cta.png`, `final-last.png`, `evidence/examples/native-booking-*.png`, `native-onboarding-*.png`, and three sequential `native-motion-*.png` frames from the exported MP4.
- Hook frame comparison mean RGB difference: 7.65 / 8.16 / 7.25, confirming motion between sampled frames.

## Content and provenance

- Three real Archify outputs appear in the video: a video-production workflow, a salon customer journey in editorial style, and an employee-onboarding swimlane in blueprint style. Each new example passed nine showcase checks; inputs and HTML outputs are in `public/`.
- Voice, music, Calling Code font, and pixel duck provenance are recorded in `evidence/asset-manifest.json`.
- No social post, external message, or website content was published as part of this render.
