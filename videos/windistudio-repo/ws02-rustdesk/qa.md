# WS02 QA

## Đã kiểm tra

- `npm run lint` passed (`eslint src && tsc`).
- Remotion rendered all 1,429 frames to `final.mp4` without frame errors.
- Final composition is 1080×1920, 30fps, H.264 with AAC stereo 48kHz; duration 47.68 seconds.
- Seven scene stills and all six scene boundaries were rendered and inspected.
- Scene changes use a clean incoming slide; layouts no longer crossfade or overlap at boundaries.
- Dark moving grid, gradient light, subtle floating accents, one-line watermark, progress bar and caption safe zone are present.
- The pixel duck/bird component was removed from the composition and source.
- Final MP4 includes `public/musicbg.mp3` at Remotion volume `1`.
- Added seven semantic SFX cues from `@remotion/sfx@4.0.521`: record scratch, UI switch, click, ding, whoosh, page turn and CTA ding. Each is placed on the spoken/action anchor and mixed below the voice.
- Cartesia voice uses `sonic-3.6`, voice ID `de943f91-2f7f-47ca-88db-4a8d1cfc5291`, speed `1.15`.
- Whisper transcribed the complete narration from the final mixed audio with SFX, confirming that the voice remains intelligible over the music and effects.
- Final mixed-audio loudness: -15.20 LUFS integrated, -1.64 dBTP true peak, LRA 2.80.

## Editorial checks

- The spoken copy is written for non-tech viewers and leads with the familiar TeamViewer interruption pain.
- Two practical examples remain central: helping parents remotely and retrieving a customer file from the office computer.
- No unsupported latency, FPS, RAM, “free forever”, or fixed hosting-cost claim is used.
- Self-hosting is framed as an optional choice with maintenance and machine-cost tradeoffs.
- Source identity from the reference video is not copied; only its pain-to-solution rhythm and cumulative modular structure are reused.

## Ghi chú phát âm

Whisper recognizes the spoken brand name phonetically as “Rodead”; captions retain the correct spelling `RustDesk`. Credentials remain only in the ignored local environment file and are absent from tracked episode assets.
