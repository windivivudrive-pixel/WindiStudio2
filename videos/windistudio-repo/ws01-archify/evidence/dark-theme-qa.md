# WS01 dark theme QA

- Rendered MP4: `final.mp4`, 1080x1920 H.264/AAC, 30 fps, 47.55 seconds.
- Dark palette applied to the canvas, windows, tags, captions, progress bar, and watermark frame.
- Grid motion is frame-driven with a 52px loop (`backgroundPosition` modulo 52), so it never drifts or resets visibly.
- Two low-opacity radial highlights move on sine paths behind content; the glow remains subtle under captions.
- Every scene gets a small frame-driven translate/tilt wrapper to retain the floating retro-card feel.
- The salon and onboarding diagrams render from the native Archify HTML, float independently, and use smooth cubic camera moves between narration-synced nodes.
- Still checks: `evidence/dark/hook.png`, `hook-later.png`, `demo.png`, `cta.png`, `final-last.png`, `evidence/examples/booking-final.png`, and `onboarding-final.png`.
- The new practical examples are visibly distinct: a light editorial customer journey for salon appointments and a dark blueprint swimlane for staff onboarding.
- Hook frame comparison mean RGB difference: 7.65 / 8.16 / 7.25, confirming temporal motion between frames.
- Audio loudness check after the speed-1.15 narration: input -13.55 LUFS-I, true peak -1.29 dBTP; normalized mix -15.86 LUFS-I, -3.16 dBTP.
