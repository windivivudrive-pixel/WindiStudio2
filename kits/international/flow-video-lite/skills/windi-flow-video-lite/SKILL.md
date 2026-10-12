---
name: windi-flow-video-lite
description: Create short product demos, faceless explainers or SaaS feature videos using the English Windi Flow Video Lite kit, customer-owned media, optional Flow assets and local Remotion rendering. Use for this Lite kit; keep its project and state separate from the full Windi Video Workflow.
---

# Windi Flow Video Lite

Locate the kit by its package name `@windistudio/flow-video-lite`. Work inside a dedicated copy. Run `node scripts/kit.mjs doctor` before production. If dependencies are absent, use `npm ci` in that folder; explain the first-install and browser downloads. Never install globally or replace another project's package.json, skills, `.windi` state or saved layouts.

For a new video, run `node scripts/kit.mjs init --dir NEW_FOLDER --preset ugc-ad|faceless-explainer|saas-demo`. The destination must not exist. Open that folder, install its dependencies and rerun doctor. The command installs this uniquely named skill into the new project's `.agents/skills` only. Other agents can read the bundled skill directly.

Read README.md for the product boundary. This is an agent-assisted template kit. It does not include a Flow subscription, an LLM, hosted Windi Voice, browser bridge, automatic publishing, word alignment or guaranteed video performance.

## Create a video

1. Establish audience, exact product/topic, language and call to action from the brief. Use English by default. Start with one preset and write a concrete hook, demonstration and next step. For explainers, collect the sources for factual claims in a project-local `data/sources.md`.
2. Edit `data/video.json`. Keep scene headlines under 65 characters and captions under 120; shorter is usually clearer. Use 1–15 second scene durations on 30 fps boundaries, and no more than 180 seconds total. Select portrait or square and the customer's brand colors.
3. Present the script and media plan for review. User corrections authorize corresponding edits. Sample scenes are fictional examples, not customer testimonials or verified performance claims. Never invent endorsement, before/after results, research figures or product capabilities.
4. Use customer-owned media first, copied into `public/assets/`. Set each scene's `media` to `assets/FILENAME` and `mediaKind` to image or video. For optional Flow assets, export individual prompts from `visualPrompt`, with an explicit ratio matching the plan. The customer may use Flow manually and bring back the downloads. If an existing Windi Connect installation is available, read [flow.md](flow.md); the Lite kit does not install it. Confirm approval before paid/quota-consuming generation. Keep downloaded files tied to their original job. Do not remove provenance marks or resubmit uncertain generations.
5. Import narration owned/licensed by the customer via the optional `audio` assets path. Audio is a single soundtrack. Match the scene durations to real spoken phrases; the included caption track is scene-level, not automatic word timing. Video source audio is muted. Long video clips restart at each scene and loop if shorter than the scene. Use prepared clips for exact in/out points.
6. Run `npm run check`, then `npm run preview`. Inspect all scenes for text wrapping, media crop, safe areas, spelling, timing and audio. Placeholder geometry is acceptable only for an explicitly requested typography video/demo. Do not present empty-media presets as finished product footage.
7. On explicit export authorization, run `npm run render`. It refuses to overwrite `out/video.mp4`; move the old version first. Review the MP4 and scene-level SRT. `export.json` reports export metadata and pending visual QA, not proof of a successful creative review. Report the actual deliverables and unresolved limitations. Publishing needs a separate user request.

For unrelated video projects, keep their existing workflow. Do not silently route requests for the full Vietnamese kit into Lite.
