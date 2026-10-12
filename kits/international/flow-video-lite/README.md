# Windi Flow Video Lite — International Beta

An English-first starter for short product demos, faceless explainers and SaaS feature videos. Use your AI coding agent to customize the script and timeline, bring your own images/clips/narration, preview locally and export an MP4 plus scene-level SRT.

**This is an agent-assisted source kit, not a standalone desktop editor.** It includes three editable content presets and one shared visual template, with portrait and square outputs. No AI subscription, generated media credits, hosted voice service or one-click publishing is included. Optional Flow generation is online; your agent subscription runs separately. Local rendering can work offline after dependencies and the renderer browser have been downloaded.

## Start in a new project

1. Extract the entire ZIP into a folder you will keep. Install Node.js 20+ if absent: https://nodejs.org/en/download . Use Node 24 LTS when available for your system. Initial installation needs internet.
2. Open the extracted folder in your AI coding agent, and say:

   > Read skills/windi-flow-video-lite/SKILL.md. Check my environment first. Create a new ugc-ad project beside this folder. Help me make a short product demo using my own media. Show me the script before generating assets or exporting.

3. The agent creates a new project using:

```sh
node scripts/kit.mjs init --dir "../My Product Demo" --preset ugc-ad
```

4. In the new folder run `npm ci`, then `npm run doctor`. Address required checks before continuing. On Windows use PowerShell/Terminal; on macOS use Terminal. The Start launchers print environment checks and next steps. They do not install system software automatically. If macOS does not open a launcher, run `sh "Start macOS.command"` from Terminal.
5. Put your media in `public/assets/`. Customize `data/video.json` with the agent. Run `npm run check`, `npm run preview`, then `npm run render` when ready to export.

Choose `ugc-ad`, `faceless-explainer` or `saas-demo` when initializing. To start another video, create another folder. The kit never changes your full Windi installation, stored layouts, domestic license or Voice balance.

## Timeline and assets

Each scene has a duration, eyebrow, headline, caption and optional media path. Use `assets/product.png` for an image or `assets/demo.mp4` with `mediaKind: "video"`. Use `audio: "assets/narration.wav"` for a single soundtrack, or `null` for silent video. Paths are relative to `public/`; remote URLs and paths outside assets are rejected.

Scene durations determine all cuts. Narration is not automatically stretched or aligned. Captions are scene-level, not word-by-word subtitles. The renderer displays the headline and caption, with a simple entrance, image zoom and progress line. Source clip audio is muted; short clips loop. Trim clips externally when exact in/out points are needed. Long headlines still need preview review; character limits do not guarantee layout fit in every language.

The sample renders use original geometric backgrounds, with no third-party photos, fonts, music, voices or generated images. Replace sample wording with verified facts about your own product. Flow use is optional; see the skill's flow.md for an existing-bridge route. This ZIP does not install Windi Connect or include a Flow browser extension.

## Requirements and verification

Planning recommendation for this template: a 64-bit Windows 10/11 or supported macOS computer, 4 CPU cores, 8 GB RAM and 5 GB free disk, plus space for your media. 16 GB RAM is preferable for 1080p. Apple Silicon M1 or newer is a practical Mac starting point. No discrete GPU is required by this template. These are suggested starting configurations, not a benchmarked minimum. Local AI models are not part of this kit.

Node 20+ and renderer dependencies are required. First preview/render may download Chrome Headless Shell. Some machines need browser/system setup; follow the exact Remotion diagnostic. Renderer: https://www.remotion.dev/docs/ . Check QA.md for release verification status. Native Windows, Intel Mac, a clean machine install and optional Flow bridge require additional acceptance testing. Do not interpret supplied launchers as evidence that every platform has been tested.

## Output and license

`out/video.mp4`, `out/captions.srt`, `out/export.json`. Existing MP4s are preserved: move the old one before exporting again. Review full playback and confirm your media/voice/music rights before distribution.

Your purchase licenses Windi-authored kit files under LICENSE.txt. Commercial finished videos are permitted under that license, subject to the third-party software and media licenses. Redistribution/resale of this source kit is not included. Remotion licensing is separate; see THIRD-PARTY-NOTICES.md. This product is independent of Google, OpenAI, Whop and Gumroad. No account access or subscription is sold with it.
