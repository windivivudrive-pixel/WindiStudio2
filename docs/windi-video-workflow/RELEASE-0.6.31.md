# Windi Video Workflow 0.6.31

Published 2026-09-30. Release ID: 9e6b4222-9a98-409a-80bd-795851634db3.
ZIP: 698,056 bytes.
SHA-256: 77b9bd2cba9f7d0f693fd5745539d7273cf577ab8ca5b91e44d3a74786967505.

Flow runs in its own background window without requesting OS focus. Newly
created managed windows are minimized; existing user windows are preserved.
Workspaces are retained for reuse. Renderer focus overrides are scoped, settings
wait for the menu to appear, and the debugger is detached after each job. Closing
a processing tab gives a recoverable action error instead of inviting resubmission.

124/124 Windi tests, typecheck, extension build, ZIP CRC and diff checks passed.
The incidental website suite also passed 196/196. The exact final ZIP was installed;
installed source and stable extension bytes match the archive. Five clean real
Flow outputs were inspected across two projects in this background-change run.
The final exact-installed tests cover four refs 4:3 then no refs 1:1, complete
original download, decoded JPEG dimensions and correct subject/materials.

The quiet final test recorded focusEvents=[], window.state=minimized and
window.focused=false throughout both jobs. Finder remained focused. CUA's final
full browser accessibility observation showed no debugging banner. Concurrent
manual Flow interference affected two earlier attempts; they are excluded from
acceptance and their uncertain prompt was not silently repeated.
Evidence and job IDs: ../../tools/windi-connect/docs/FLOW-0.6.31.md.

Publication: storage readback and a fresh signed URL both returned byte-identical
ZIP data. The website's release selector against live published rows chooses
0.6.31. Anonymous /api/video-kits/download returns 401 as expected. Authenticated
website-button delivery was not tested because there was no signed-in licensed
browser session. Machine-readable receipt: RELEASE-0.6.31.json.

Download entry: https://windistudio.app/video-kits.
Live acceptance is Cốc Cốc/macOS Apple Silicon. Chrome, Windows/Intel and
sleep/wake/soak remain untested. ChatGPT/Grok were not changed or retested.
No new complete voice/render acceptance is claimed. Existing localhost Voice
configuration, provider pairing, project records and other hooks were retained.
