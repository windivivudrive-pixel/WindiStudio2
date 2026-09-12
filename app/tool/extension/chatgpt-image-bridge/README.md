# ChatGPT Image Bridge · Girl Compare + Manly Darklab

Local-only bridge for `tools/chatgpt-imagegen`. It writes only to
the selected project's `public/illustrations/epNNN/`, never overwrites an
approved asset unless `overwrite: true` is explicitly sent, and serialises
image jobs so two automations cannot spend quota at the same time.

It is not a public image-generation service. The server listens only on
`127.0.0.1` and uses the logged-in ChatGPT/Codex session already available on
this Mac. The bridge deliberately uses the `web` backend by default, so it
uses the image quota of the logged-in ChatGPT browser and never silently spends
the metered Codex quota. It needs `chrome-use` plus its connected browser
extension and a ChatGPT login in that browser. Set
`CHATGPT_IMAGE_BACKEND=codex` only when you explicitly want the Codex fallback.

## Start once with Flow

```bash
cd "/Users/win/Documents/so sánh/tools/google-flow-batch-extension"
npm run bridge:all
npm run bridge:status-all
```

The single start command keeps these local services available together:

- Google Flow Batch bridge on `38471`
- Flow Agent on `8001`
- ChatGPT Image Bridge on `38472`

## Verify the ChatGPT route

```bash
cd "/Users/win/Documents/so sánh/tools/chatgpt-image-bridge"
npm run doctor
```

## Generate a Manly Darklab hook thumbnail

ChatGPT Web, controlled through Chrome Use, is reserved for the 9:16 hook-thumbnail base. Stage the reference
images first under `Manly-darklab/public/references/epNNN/`, then send the job
to the shared bridge with `--project manly-darklab`. All Manly beat sheets and
singleton illustrations remain Flow Agent jobs.

```bash
cd "/Users/win/Documents/so sánh"
node tools/chatgpt-image-bridge/client.mjs generate \
  --project manly-darklab \
  --backend web \
  --target public/illustrations/ep007/hook-cover-v01.png \
  --reference public/references/ep007/man-ref.png \
  --reference public/references/ep007/woman-ref.png \
  --size 1024x1365 \
  --prompt "<approved hook-cover prompt>"
```

## Generate from an approved Girl Compare brief

```bash
cd "/Users/win/Documents/so sánh/girl-compare-remotion"
npm run generate-illustrations -- epNNN --provider chatgpt
```

The existing approval gate remains in force. `--dry-run` parses the exact
brief plan without sending an image request. Existing sheets and crops are not
overwritten.
