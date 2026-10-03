# Windi Video Workflow 0.6.30

Released 2026-09-30. Source archive: 695,507 bytes.
SHA-256: a0b982584dfa96e40458a792ce9c5ae23a219ca05937b31c22f20ebb7d56f3bc.
Supabase release ID: 11a8eb4a-3c7f-494e-af89-765097307491.

Flow changes and live evidence: ../../tools/windi-connect/docs/FLOW-0.6.30.md.
118 automated tests, typecheck, extension build and ZIP CRC passed.
The exact ZIP was extracted and installed on this Mac. Installed src files match
those inside the ZIP. Node/npm/npx shortcuts are now relative to the installed
runtime; the installer test also covers reinstall and removal of temporary files.
Global CLI, Windi Video Workflow skill and existing Windi Connect skill updated.
Pairing, projects and existing Antigravity hook configuration retained.

## Exact installed-release acceptance

- bc00edf6-544a-46a8-9037-ed5f792a31c7: standard, one ref, 4:3,
  assets/windi/installed-ref.jpg, 1200×896,
  SHA-256 7a166d219f306fa8fc0c192d6cc17724f65e59c00777be7bb67fb243c3aa951e.
- 031a9254-4024-484f-95c8-0a3c0b5e68ba: Lite, no ref, 16:9,
  assets/windi/installed-no-ref.jpg, 1376×768,
  SHA-256 abee01ee9935da3600c3e9c69f2cf595725b3f5a96aea3fe319b5fb05dfd7de7.

Both completed automatically in project-b's existing workspace after installation
and extension reload. Visual inspection confirms fox/bowl and independent
sailboat scene. Repeating the original count=2 request on the installed release
returned both original completed job IDs with reused=true; no generation repeated.
Seven clean automatic outputs across three projects, covering five ratios and
three models, plus separately labelled recovery tests.

## Publication evidence

Storage upload was downloaded back and its size/SHA-256 matched the local ZIP.
A fresh signed URL returned byte-identical data. product_releases is published;
the website's semantic selector, executed against live published rows, picks
0.6.30. Anonymous public download API returns 401 as expected. Authenticated
website button verification remains pending: the browser lacks a signed-in
licensed session. The user has been asked to sign in; no auth bypass was used.
Machine-readable receipt: RELEASE-0.6.30.json.

Download entry: https://windistudio.app/video-kits.
Chrome, Windows/Intel and fixed seed RPC were not accepted live in this run.
The existing local Voice/Workflow client config still targets localhost:3000;
it was preserved. Customer personal installers set their API URL from the website.
This release proves Flow image operations, not a new full voice/render run.
