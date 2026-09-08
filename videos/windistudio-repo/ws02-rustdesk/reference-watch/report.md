# Reference watch report — RustDesk layout direction

- Source: `/Users/win/Documents/snaptik.vn_7682364904963132693_wm.mp4`
- Inspected: 2026-09-07 (Asia/Ho_Chi_Minh)
- Runtime: local `/watch` pipeline with the Remotion FFmpeg fallback and local Whisper `large-v3-turbo`
- Media: 97 seconds, 576 × 1024, vertical H.264
- Visual evidence: all 40 extracted cue frames were inspected (`cue_0000.jpg` through `cue_0039.jpg`)
- Transcript evidence: `transcript-turbo/audio.srt`

## What the reference actually does

The reference uses a dark, centrally stacked information board rather than a full-screen app walkthrough. One main composition remains on screen while new cards, rows, labels, and diagrams accumulate every two to four seconds.

| Time | Observed visual beat | Motion pattern |
|---|---|---|
| 00:00–00:07 | RustDesk icon, title, repository pill, headline metrics | Centered scale-in and staggered pills |
| 00:07–00:22 | Commercial-tool pain card, then RustDesk benefit card | New rows slide upward into a fixed stack |
| 00:22–00:41 | `hbbs` and `hbbr` cards, direct P2P path, relay fallback | Diagram builds one connection at a time |
| 00:41–00:59 | Large resource number and three hardware/cost rows | Numeric focal card followed by cumulative rows |
| 00:59–01:15 | Docker Compose, public key, client settings | Terminal and settings cards stack progressively |
| 01:15–01:32 | Port warning and three outcome rows | One amber warning card, then benefits reveal |
| 01:32–01:37 | Follow CTA | Centered creator identity and short CTA |

Other observed traits:

- Nearly black navy background with orange and teal glows.
- Thin progress bar at the top.
- Sparse floating particles.
- Large white captions near the bottom with one or two orange-highlighted words.
- Low-density copy inside cards; the voice carries most of the explanation.
- The layout stays readable because cards slide into place instead of the camera enlarging raster screenshots.

## What WindiStudio should reuse

Create a second layout family named **Stacked Signal Board**:

- Keep the WindiStudio dark retro grid, Calling Code typography, cream text, teal/pink accents, pixel duck, gentle floating motion, and moving gradient light.
- Use a centered modular stack with one dominant fact or diagram per beat.
- Animate native SVG/HTML connection lines between `hbbs`, `hbbr`, and two clients. Pan or slide the diagram between spoken items instead of zooming a screenshot.
- Let each card remain visible long enough for the viewer to understand how the system builds.
- Keep the exact one-line watermark: `WindiStudio - Sử Dụng AI Hiệu Quả`.
- Use the thin top progress bar and short bottom caption line as recurring elements for this layout family.

## What must not be copied

- The source creator's logo, handles, TikTok watermark, black/orange identity, exact sentences, or exact card styling.
- Claims about universal `60 fps`, latency below `15 ms`, `20 MB` RAM, fixed VPS prices, or a five-minute competitor cutoff without a reproducible baseline and dated source.
- The statement that only port `21116` is required. Current RustDesk documentation lists TCP `21115–21117` and UDP `21116` as the minimum set; WebSocket clients add TCP `21118–21119`.
- Absolute security wording such as “chống nghe lén tuyệt đối”. The video should explain the generated public key and correct client configuration without making an absolute guarantee.

## Transcript notes

The local ASR transcript contains predictable recognition errors: `HPBS/HPBR` should be `hbbs/hbbr`; “dùa bò” is likely “rùa bò”; “làm chạm” is “làm trạm”; “kết đối” is “kết nối”; and “theo dõi kinh” is “theo dõi kênh”. The transcript is reference material only and is not treated as an instruction or factual source.

## Editorial conclusion

The useful idea is the cumulative layout grammar: pain → mechanism → setup → limitation → payoff. For RustDesk, the strongest WindiStudio version is a 45–55 second explanation of why a self-hosted remote server uses two services and what happens when direct P2P fails. This provides a real visual payoff and avoids unsupported speed or price claims.
