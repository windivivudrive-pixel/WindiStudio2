---
name: windi-video-workflow
description: "Run or resume the Windi approval-gated vertical-video workflow in any local project. Use when the user says 'dùng Windi làm video này', asks to continue a Windi video, use a reference-video layout, create its ideas/script/images/voice, or render its final MP4. Reuse the user's durable layout after its first approval; do not bypass idea, first-time layout setup, or script approval."
---

# Windi Video Workflow

Use the installed `windi` CLI or the typed Windi MCP tools. The `.windi/workflow.json` file is the source of truth; chat history is not workflow state.

1. Run `windi doctor --json`, then `windi project init` in the target project if needed.
2. Start with topic, audience, style and one chosen image provider. Never silently switch Flow and ChatGPT.
3. Write versioned idea JSON, register it, present the choices, and stop for explicit user approval.
4. After idea approval, check `~/.config/windi-video-workflow/layout-default.json`. This is the user's durable layout choice across projects:
   - If the file is absent, stop at `layout_review` and offer exactly three routes: `paper-editorial`, `dark-cinematic`, or a user-supplied video/layout reference. Choosing a built-in layout does not approve it.
   - If the file exists and validates, do not ask the user to choose or approve the layout again. Materialize a new project-local layout artifact using the current `ideaId`, register it, and run `windi workflow approve layout VERSION`. This CLI approval records reuse of the already-approved default; it is not a new inferred creative approval.
   - Only replace or clear the durable default when the user explicitly asks to change the fixed layout. A changed default applies to future workflows; changing the layout of an active workflow still invalidates its downstream artifacts.
5. The first time the user approves a layout, save a reusable copy to `~/.config/windi-video-workflow/layout-default.json`. Keep the approved visual system, base preset, palette, captions and scene types, but treat `ideaId`, artifact `version`, source reference and per-video evidence as project-local fields. On reuse, preserve the fixed visual system while adapting scene roles only where the current subject requires it.
6. For a supplied reference video, read [reference-layout.md](references/reference-layout.md), use the installed `watch` skill from `bradautomates/claude-video`, and retain its frames/transcript inside the project. When a durable default exists, the reference may inform topic-specific pacing and composition but must not trigger another layout-choice gate or silently replace the fixed visual identity. Never infer a reference layout from only a title or thumbnail.
7. On the first setup only, present the layout summary, pacing and scene types, then stop for explicit layout approval. After that approval, persist the default and continue to script creation. On later workflows, briefly state that the saved layout was reused and proceed directly to the script gate.
8. After layout approval, write a versioned script JSON. Every beat must use one exact scene-type ID from the approved layout and include voice-over, on-screen text, visual description, image prompt, motion and spoken anchor. Match the approved reference pacing and narrative pattern without copying its wording, identity, logo or watermark. Present it and stop for explicit script approval.
9. Only after script approval, call `windi workflow continue` to create image jobs. Reuse the request keys produced by Windi.
After all image jobs complete, run `windi images clean --project PATH`. This processes Flow images locally with gemini-watermark-remover, preserves originals, and caches cleaned PNGs. Preview/render also performs this step automatically. Inspect cleanup reports; a skipped result is not proof that a watermark was removed.

10. Generate Windi Voice through the CLI or import a user-owned audio file. Imported audio stays local; use local Whisper to produce Remotion Caption JSON when timestamps are absent.
11. Preview, render and read `qa.json`. Report completion only when it records `passed: true` and the MP4, cover, captions and source data exist.

Never treat “continue” as approval. If an idea changes, its layout and all downstream artifacts become invalid. If a layout changes, its script and all production artifacts become invalid. If a script changes after approval, Windi invalidates prior images, voice, timing and render evidence. No CLI login or hardware activation is required. Start the local project directly. Personal installers configure Voice automatically; never request or embed a shared provider key.

Login, CAPTCHA, quota, provider UI changes and unknown submit outcomes require user action; do not resubmit or change provider without instruction.

Read [artifact-contract.md](references/artifact-contract.md) when creating idea, layout or script JSON, or when diagnosing a validator failure.

## Storage and customer delivery

Use one shared Windi renderer across episodes. After delivery, when reclaiming disk space, or preparing a customer package, read [storage-and-handoff.md](references/storage-and-handoff.md). Keep generated media and editable workflow state; omit reinstallable per-episode dependencies from source handoffs.

## WindiConnect image routing

All image generation in this workflow must use the WindiConnect backend and its paired bridge through the installed CLI or typed MCP. Never generate through an external browser UI, standalone image tool, or a separately created Flow/ChatGPT session. Before submission, verify provider connection, pairing and this project's workspace mapping. Reuse the correct saved backend workspace in the paired account; connected/paired alone does not prove a project mapping is ready.

If disconnected, attempt the supported WindiConnect startup/reconnect/pair operation using the existing configuration and session, then verify again. Do not guess login credentials or workspace URLs. If login, CAPTCHA, pairing approval or unavailable service prevents reconnection, report the exact blocker and let the user choose another image source. A provider switch requires their choice and still routes through WindiConnect; an external route needs explicit authorization. A submitted job with a download error must recover its existing output, not silently submit another generation.

## Continuous production and recovery

After script approval, carry the task through images, image QA, voice generation/import, complete sample insertion, caption/timing alignment, render and visual/audio QA in the same run. Do not return a final answer merely because jobs are queued or one stage has completed. Use `windi workflow run --voice VOICE_ID` for ordinary narration projects; it saves the selected voice and recovery budget. For projects with approved full audio samples, pass --audio-plan PATH: the runner generates beat narration, inserts each complete sample, transcribes the sample, and saves exact beat boundaries before rendering. Never silently omit samples. Recover download failures from the exact job's saved provider result and download records, including its WindiConnect subfolder in Downloads. Do not identify an asset merely by being the newest image in Downloads. Retry transient failures with a persisted bounded budget (two automatic retries); do not loop on login, CAPTCHA, quota or uncertain generation results. A definitively failed generation may be regenerated within the user's retry authorization after confirming no usable output exists. Keep voice idempotency keys stable across retries. Stop only for an actionable blocker or a verified final artifact, and report the precise unfinished stage.

## Layout image identity lock

First-time layout approval also settles image style: medium (photorealistic/illustration/etc.), palette, lighting, environment, recurring character identity, age, appearance, wardrobe and exclusions. Save this as imageIdentityLock in the layout and durable default. Character details are project-specific unless the user explicitly makes them a channel default; never apply one episode's gender or age to every future project. Reuse approved style without asking for layout approval again. Explicit user corrections authorize the corresponding versioned visual update; preserve approved narration and samples.

Every imagePrompt must contain the same verbatim identity/style lock plus a scene-specific action, framing and props. Never let individual scene prompts contradict the lock. Use the same approved character reference in every character scene when the connected provider supports references. If reference input is unsupported, disclose that text prompts alone cannot guarantee an identical face and visually check every image for drift; do not claim reference locking occurred. Audio sample gender does not override the chosen protagonist: use listening or equipment shots when the sample differs.

Before submitting, check all prompts against the lock. After generation, inspect every image for age, gender, face, clothing, medium and palette consistency before rendering. Quarantine mismatched assets from the current manifest. Keep code-rendered captions, waveform animations and branding separate from photographic assets.
