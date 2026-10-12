# Verification status — 0.1.0-beta.1

Checked locally on 2026-10-10, macOS Apple Silicon, Node 24.11.1, 16 GB RAM.
This is a local beta handoff, not a public-release or all-platform certification.

Passed:

- Dependency installation from the local npm cache and TypeScript check.
- Skill frontmatter validation with the skill-creator validator.
- Four Node tests: preset timelines/captions; invalid timing/duplicate IDs;
  initialization in a folder with spaces and existing-project preservation;
  external/traversal/incompatible/symlink-escape asset rejection.
- `doctor` and `check` with the factory sample.
- Portrait 1080x1920 still, visually inspected for headline/caption layout.
- Actual 90-frame square render with a synthetic local PNG, a half-second local
  video loop and a separate three-second tone soundtrack. H.264 video 1080x1080
  and AAC audio verified with ffprobe; container duration 3.050667 seconds
  (including audio encoder padding). Three scene-level SRT cues were exported.
- Imported-video and typography frames inspected visually. This is technical
  media acceptance, not a real commercial product demo or long-video benchmark.
- Existing MP4 overwrite refused, with the existing file hash unchanged.
- Customer ZIP generated from a source allowlist, with CRC and per-file SHA-256
  manifest checks. Seller drafts, dependencies, customer media and account data
  are excluded.

The render used an existing Chrome Headless Shell via `--browser` in a copied
project. The dependency folder was shared for that render. Browser launch was
initially blocked by the agent sandbox and passed when local execution was
permitted. This is not evidence of a first-time browser download or machine setup.

Not yet verified:

- Native Windows or Intel Mac installation/render.
- Installation on a completely clean machine and first-time browser download.
- Optional Flow manual-generation/bridge path with a customer's account.
- Automatic skill discovery in each supported coding agent.
- Long videos, varied narration/music and all third-party media codecs.
- Benchmarking the recommended minimum hardware configuration.
- Seller account approval, payouts, licensing clearance and public storefront.

No AI media quotas were consumed, no provider accounts were supplied, and no
product was uploaded or published by these checks.
