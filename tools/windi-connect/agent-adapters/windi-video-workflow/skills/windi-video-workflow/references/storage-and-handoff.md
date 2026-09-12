# Storage and customer handoff

Use the shared Windi renderer installed with the application. Episode projects contain workflow state, source data and media; do not scaffold or install a new Remotion runtime per episode. Keep the renderer separate from the Next.js website. The installer may contain runtime dependencies once for offline use; do not strip those dependencies from the installer.

## After delivery or when asked to reclaim storage

- Inventory disk usage first. Preserve final MP4, cover, captions, script/layout/idea versions, approval state, QA, manifests, original images, cleaned images, voice and custom source. Preserve paid generation outputs and request keys so reopening never triggers another charge just to restore the project.
- For a legacy standalone Remotion episode, remove only its local node_modules after confirming package.json and package-lock.json exist and no preview/render is using it. Include restoration instructions: run npm ci inside that episode, then its documented preview/render command. This requires a compatible Node/npm and network access.
- Never delete the shared installed runtime as episode cleanup. Do not automatically delete assets, reference analysis, QA evidence, old distinct renders or voice previews.
- Compare SHA-256 before removing duplicate exports. Matching names or sizes are insufficient. If bytes differ, retain both unless the user chooses which version to discard; update any artifact references when removing a duplicate.
- Renderer public/windi-job/<workflowId> is staging, but remove it only after preview/render exits and canonical project media and manifests have been verified. Do not remove another active workflow's staging.
- Record what was removed and measured before/after sizes. Storage cleanup is not a new video QA pass.

## Customer source package

Include project-relative workflow data (.windi included), source, media, approvals, manifests, QA, final deliverables and a restore note with the Windi version and exact tested commands. Standalone projects also need package.json and lockfile. Exclude node_modules, build caches, temporary staging, machine-specific credentials, .env secrets and unrelated customer data. Do not exclude .windi wholesale: retain workflow state while inspecting for credentials and absolute machine-specific paths.

Deliver the shared Windi application/installer separately; each episode should not bundle another copy. Before calling a package ready for customers, unpack it into a fresh directory, verify referenced files resolve, and preview/render using the intended runtime. Do not claim portability or a clean-machine test without executing it. Packaging updates in source do not mean an existing published installer has been rebuilt or released.
