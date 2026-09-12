# Windi artifact contract

Ideas use `{ "schemaVersion": 1, "version": 1, "ideas": [...] }`. Each idea needs a unique `id`, `title`, `hook` and `angle`.

Layouts are selected only after an idea is approved. A built-in layout is created with:

```bash
windi workflow layout choose paper-editorial
# or
windi workflow layout choose dark-cinematic
```

A custom layout uses `{ "schemaVersion": 1, "version": 1, "ideaId": "...", "id": "...", "name": "...", ... }` and requires:

- `source`: either a built-in preset or `{ "kind": "reference", "reference": "...", "analyzer": "bradautomates/claude-video", "detail": "balanced", "evidenceDir": "..." }`.
- `basePreset`: `paper-editorial` or `dark-cinematic` as the safe renderer foundation.
- `summary` and `pacing` with positive `hookDurationMs`, positive `averageBeatDurationMs` and `cutRhythm`.
- five six-digit hex colors: `background`, `surface`, `text`, `accent`, `border`.
- `captions.position`: `top`, `center` or `bottom`; `captions.style`: `boxed`, `pill` or `plain`.
- one or more `sceneTypes`, each with unique `id`, human-readable `role`, `composition`, `textPosition` and `imageFit`.
- allowed compositions: `full-bleed`, `framed`, `split`, `text-led`, `quote`, `comparison`, `cta`.

Register and approve the exact version:

```bash
windi workflow artifact layout --file layout-v01.json
windi workflow approve layout 1
```

Scripts use `{ "schemaVersion": 1, "version": 1, "ideaId": "...", "title": "...", "language": "vi", "beats": [...] }`. Each beat needs:

- `id`
- `voiceOver`
- `onScreenText`
- `visualDescription`
- `imagePrompt`
- `motion`
- `layout`
- `spokenAnchor`
- optional positive integer `estimatedDurationMs`

Every script beat `layout` must equal one `sceneTypes[].id` from the approved layout. The approved script is the production source. Markdown reviews may be derived for people but never replace JSON. Script durations are estimates; final scene timing comes from the real voice Caption JSON.
