# Windi Video Workflow 0.6.32

Published 2026-10-03. Supabase release ID: `0bd925da-292a-46a3-a67c-2f4982079a17`.
ZIP: 734,869 bytes. SHA-256: `5f7c8c429201ff172bc593f1c281646356dc8a173fe35b95a59559b32dea3379`.

The customer ZIP now contains the current Windi Connect source and a combined
Flow, ChatGPT and Grok extension. The package extension manifest, installer
package version and installer-bundled extension manifest all report 0.6.32.
The exact archive passed ZIP CRC verification and matched the built extension
file-for-file. No `.env`, `.local`, `node_modules`, `.DS_Store` or `__MACOSX`
files were included.

Windi Connect tests passed 124/124, typecheck passed, and the extension build,
installer build and release packaging completed. The exact ZIP was extracted to
a temporary directory and its `--prepare-only` installer completed, including
production npm dependencies, Sharp, FFmpeg/FFprobe and yt-dlp. The active local
Windi installation was not changed. Supabase storage readback matched the ZIP
size and SHA-256, and the live semantic-version selector now chooses 0.6.32.

No live Flow, ChatGPT or Grok generation was performed for 0.6.32. The previous
Flow evidence is limited to Cốc Cốc/macOS Apple Silicon; Chrome, Windows/Intel,
and new ChatGPT/Grok live acceptance remain unverified. An authenticated
customer-button download was not exercised in this release run.

The product price remains 219,000 VND; the prior launch-price metadata is absent.
