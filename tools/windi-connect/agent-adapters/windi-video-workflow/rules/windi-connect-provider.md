---
trigger: always_on
description: Keep Windi Connect as the image source for tasks that select Windi or Flow through Windi.
---

# Windi Connect image source

When the user or project selects Windi Connect or Flow through Windi for image work, use the installed `windi` CLI or Windi MCP for every generated image. A project's `.windi/project.json` provider default also counts unless the user explicitly chooses another source for the current task. Do not use Antigravity's built-in Gemini image generation, another image tool, or direct browser automation as a fallback. Do not change providers without the user's explicit choice.

Run `windi doctor --json` and initialize the project if needed. Submit with `windi images create ... --wait`, or keep polling the same job with `windi jobs status JOB_ID --json`. `queued`, `preparing`, `submitted`, `generating`, and `downloading` mean the asset is still pending. Use an image in the video only after that exact job says `complete` and its output file exists.

When the user requests a real product image as a reference, pass its local file as `--ref` on the relevant Windi image job and confirm that the job records that reference. A generic prompt without the reference does not satisfy this requirement.

If a job reports `needs_user_action`, `unknown_result`, or `failed`, preserve its job ID and workspace. Report its error code and stop the image stage. You may continue independent work, but do not fill missing images with Antigravity quota or render a final video with substitutes. Recover or retry through Windi only after checking whether the existing Flow result can be reused; ask the user before changing image source.
