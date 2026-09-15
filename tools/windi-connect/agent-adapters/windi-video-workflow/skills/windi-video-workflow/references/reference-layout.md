# Reference-video layout analysis

Use the upstream `watch` skill from <https://github.com/bradautomates/claude-video>. Read its complete `SKILL.md` before invoking it and follow its setup/security instructions. Windi does not claim that the upstream tool creates a template: it extracts timestamped transcript and scene-aware frames; the agent interprets that evidence into Windi's typed layout artifact.

## Evidence run

## Resolve the analyzer before analysis

The customer installer already bundles the MIT watch runtime from the reviewed upstream commit `83da59fa78c3eee9e20f515fe75c438bb5166efd` and installs it into the user's `.codex/skills/watch` and `.agents/skills/watch` directories. Reuse it; a fresh repository download for every video is unnecessary.

Resolve the installed skill directory and verify `SKILL.md`, `scripts/watch.py`, `scripts/setup.py` and `LICENSE` exist. A SKILL.md alone does not prove the runtime is ready. If missing, restore from the installer's `vendor/watch` directory. If the bundled copy is unavailable, automatically fetch the pinned repository into a fresh temporary directory using `git init`, `git remote add origin https://github.com/bradautomates/claude-video.git`, `git fetch --depth 1 origin 83da59fa78c3eee9e20f515fe75c438bb5166efd`, and `git checkout --detach FETCH_HEAD`. Verify `git rev-parse HEAD` equals that commit before using `skills/watch`. Keep the upstream LICENSE and provenance. Do not overwrite an existing customized installation; use the recovered copy directly for this run. Never silently upgrade to main.

Read the resolved SKILL.md and run its structured preflight through `windi-python`. Use Windi's managed environment for missing dependencies. Do not request a Whisper key merely to inspect composition: native captions or a clearly labeled frames-only analysis are valid. If speech timing is essential and captions are absent, use the approved transcription route. Report actual missing evidence. Network, login or installation failures must not be presented as successful analysis.

Run the resolved script with the supplied URL or absolute local file path, `--detail balanced`, and `--out-dir` pointing to a new versioned evidence folder below. Capture stdout as `report.md` and retain extracted frames/transcript; do not follow upstream temporary-directory cleanup for evidence used by a registered layout.

Use `balanced` detail and keep the work directory inside the project:

```text
windi/layout-analysis/layout-vNN/
```

Pass that folder as the watch run's `--out-dir`. Read every returned frame. For videos longer than ten minutes, analyze the relevant short-form segment or explain that the full-video scan is sparse. Native captions are preferred; when a local video has no captions, follow the watch skill's explicit Whisper-consent/setup path or analyze frames only.

## What to extract

Record evidence-backed observations with timestamps:

- hook duration and the first visual/text change;
- shot and layout changes, average beat duration and cut rhythm;
- image crop, safe areas and recurring text positions;
- headline/caption treatment, approximate palette and contrast;
- transition and motion patterns;
- recurring scene roles such as hook, explanation, quote, comparison and CTA;
- the relationship between spoken anchors and visual changes.

Do not copy the reference's script, brand identity, logo, watermark, faces or protected artwork. Reproduce its reusable structure, pacing and composition grammar with the customer's own subject and assets.

## Output and gate

Write a layout artifact matching `artifact-contract.md`. Set `source.kind` to `reference`, the analyzer to `bradautomates/claude-video`, detail to `balanced`, and `evidenceDir` to the project-relative evidence folder. The `sceneTypes` IDs become the only legal values for each script beat's `layout`.

Present a compact review containing the source, analyzed range, hook timing, beat rhythm, palette, captions and scene types. Register the JSON and stop. Only call `windi workflow approve layout VERSION` after explicit user approval.

Include timestamped examples and a simple scene wireframe so the customer can review the proposed layout. Clearly distinguish observed details from proposed adaptations. If the customer supplies a new video specifically to select/change layout, propose a new version even when a durable default exists; approval of the old default does not approve this replacement. Keep the old default until the customer approves the replacement, then save it for reuse. If the video is only topic evidence, retain the already approved layout. Do not produce script, images, voice or render for an unapproved replacement layout.
