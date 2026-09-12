# Windi Pocket Studio

Home and `/video-kits` share `windi/workflow-hero.tsx`. Home now presents Video Kits, Voice, layouts, tools and news in that order. Catalog/news reads are behind separate Suspense boundaries so the product hero is not blocked by them. The main menu exposes both products directly.

## Implementation

- `windi/arcade-state.ts`: pure demo state machine; 10 stages, explicit versus simulated approvals, layout choices, cancellation on navigation, pause/resume and a four-second render that advances to delivery.
- `windi/workflow-arcade.tsx`: accessible HTML shell and controls; client-only Pixi canvas; visibility and reduced-motion handling. Vietnamese game text is excluded from the legacy DOM translation observer so changing languages cannot overwrite live game state.
- `windi/arcade-canvas.tsx`: PixiJS 8.20.1, one application/ticker, scene rebuilds only on stage/revision/layout/theme changes. Scene graphics and captions are demonstrative, not a real generated video. No production API or generation requests occur in these modules.
- The display content box is 2:3; the delivery illustration is 108 × 192 logical pixels (9:16). Site typography and theme tokens are retained.
- Existing commerce, installer and voice backend behavior is unchanged. A visible installer button does not establish that a release archive is available.

## Assets and references

Guidance used: https://github.com/pixijs/pixijs-skills — router plus Application, Assets, Sprite, Events, Ticker and Performance skills. The Next.js lazy-loading guide bundled with the installed version was used for the client boundary.

`public/arcade/bird-up.svg` and `bird-down.svg` reuse the paths of the existing `PixelDuck`, with one wing frame per file. The dog is drawn in `windi/arcade-dog.ts` using Pixi Graphics: separate head, ears, paws, legs, eyes and tail. Joint animation provides blinking, wagging, pondering, approval and celebration without loading an image. The original dog image and earlier atlas remain untouched but are not loaded by the demo. The desk nameplate uses an explicit Vietnamese-capable font and extra glyph padding.

Controls: left/right navigate, up/down choose, A acts/approves, B resets the current stage, Start/Pause controls autoplay and Replay restarts. Mouse, touch and keyboard use the same reducer. The reduced-motion button exposes the static alternative; the OS preference takes priority. Sound is off; the Home voice sample only plays on explicit native audio-control interaction.

## Validation — 2026-09-11

- Production build and TypeScript passed.
- 29 tests passed across arcade state, video kit presentation/access/installer, language mode and ambient motion.
- Inspected Home and Video Kits in light/dark at 390, 768 and 1440 widths; fixed header/news overflow and reserved space for the tilted machine. Display measured 294 × 441 on desktop.
- Browser: selected Dark Cinematic, approved layout and script, used keyboard arrows/A, advanced through all stages, rendered to delivery, switched theme while running, toggled reduced motion and resumed the canvas.
- Missing sprite test: temporarily moved the newly generated atlas, reloaded, verified the static fallback and working stage navigation, then restored the asset and verified canvas initialization again.
- Kit CTA reaches the existing commerce section and its account-specific download button. No purchase or installer generation was performed.
- Static boundary test rejects fetch/API/provider calls in all demo modules. Browser network instrumentation was unavailable in the read-only browser API; no claim of an intercepted network trace is made.

Not deployed. Preview with `npm run dev`.
