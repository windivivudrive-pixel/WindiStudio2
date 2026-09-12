# SFX plan v02 — Windi Dark Thumbnail Editorial

Library: `@remotion/sfx@4.0.520`, aligned with the installed Remotion version.

SFX uses a base level of **-8 dB** as approved. Each cue starts after the spoken phrase it supports and fades quickly; no meme/impact effect is used under spoken anchors.

| Beat | Cue | Effect | Mix target |
| --- | --- | --- | --- |
| 01 hook | Thumbnail cards resolve | `whoosh` + one `mouseClick` | -8 dB |
| 02 pain points | Each failure card | `uiSwitch` (3 variations in timing) | -8 dB |
| 03 flat voice | Waveform loses energy | `loadingLag` | -8 dB |
| 04 reveal | Cards converge | `whoosh`, then `ding` after the spoken pause | -8 dB |
| 05 approval | Idea gets approved | `mouseClick` then short `ding` | -8 dB |
| 06 reference analysis | Layout/ref cards switch | `uiSwitch` | -8 dB |
| 07 beat breakdown | Storyboard cards fan out | `pageTurn` | -8 dB |
| 08 image generation | Approved scene revision | `mouseClick` | -8 dB |
| 09 human voice | Emphasis settles | no effect; preserve voice clarity | — |
| 10 timestamps | Playhead aligns lanes | `uiSwitch` | -8 dB |
| 11 system proof | Approval node resolves | short `ding` | -8 dB |
| 12 contrast | Cut from chaos to system | restrained `whoosh` | -8 dB |
| 13 CTA | Offer card lands | warm `ding`, one `mouseClick` on final CTA | -8 dB |

Implementation will use frame-based `<Sequence>` cues, `Audio` and a short fade-in/out volume callback. The final audio render is checked for voice intelligibility and absence of clipping.
