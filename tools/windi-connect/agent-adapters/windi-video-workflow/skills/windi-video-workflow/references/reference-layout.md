# Reference-video layout analysis

Use the upstream `watch` skill from <https://github.com/bradautomates/claude-video>. Read its complete `SKILL.md` before invoking it and follow its setup/security instructions. Windi does not claim that the upstream tool creates a template: it extracts timestamped transcript and scene-aware frames; the agent interprets that evidence into Windi's typed layout artifact.

## Evidence run

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
