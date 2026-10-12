import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, mkdir, symlink, copyFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import os from 'node:os';
import path from 'node:path';
import {validateDocument, moveBoundary, editCaption, saveDraft, safeAsset, validateAssetName, captionsSrt} from './model.mjs';
import {patchLayout, resolveLayout} from './client-model.mjs';
const document = () => ({schemaVersion: 1, episodeId: 'test', revision: 0, fps: 30, totalFrames: 300,
  beats: [{id: 'a', startFrame: 0, endFrame: 100, headline: 'A', category: 'A', spokenPill: 'A'}, {id: 'b', startFrame: 100, endFrame: 200, headline: 'B', category: 'B', spokenPill: 'B'}, {id: 'c', startFrame: 200, endFrame: 300, headline: 'C', category: 'C', spokenPill: 'C'}],
  captions: [{text: 'Xin chào', startMs: 100, endMs: 900, words: [{text: 'Xin', startMs: 100, endMs: 400}, {text: 'chào', startMs: 500, endMs: 900}]}],
  audio: {voice: 'voice.mp3', music: 'musicbg.mp3', voiceVolume: 1, musicVolume: 1, sfxVolume: 0.35}});
test('trimming keeps contiguous coverage and leaves narration/captions unchanged', () => {
  const original = document(), edited = moveBoundary(original, 1, 150);
  assert.equal(edited.beats[0].endFrame, 150); assert.equal(edited.beats[1].startFrame, 150);
  assert.deepEqual(edited.captions, original.captions); assert.deepEqual(edited.audio, original.audio);
  assert.equal(moveBoundary(original, 1, 999).beats[1].startFrame, 197);
  assert.equal(moveBoundary(original, 1, -99).beats[0].endFrame, 3);
  assert.equal(original.beats[0].endFrame, 100); validateDocument(edited, original);
});
test('caption correction preserves timings for equal words and redistributes within group otherwise', () => {
  const original = document().captions[0];
  assert.equal(editCaption(original, 'Xin bạn').words[1].startMs, 500);
  const expanded = editCaption(original, 'Xin chào mọi người');
  assert.equal(expanded.words[0].startMs, 100); assert.equal(expanded.words.at(-1).endMs, 900);
  assert.equal(expanded.text, expanded.words.map(w => w.text).join(' '));
});
test('rejects gaps, reordered scenes, changed voice, invalid captions and non-finite crop values', () => {
  const baseline = document();
  for (const mutate of [d => d.beats[1].startFrame++, d => d.beats.reverse(), d => d.audio.voice = 'other.mp3', d => d.captions[0].words[0].endMs = 950,
    d => d.beats[0].media = {kind: 'image', src: 'img.png', trimBefore: 0, fit: 'contain', zoom: NaN, x: 50, y: 50, volume: 0}]) {
    const doc = document(); mutate(doc); assert.throws(() => validateDocument(doc, baseline));
  }
});
test('caption typing retains spaces without breaking draft validation', () => {
  const baseline = document(), edited = document();
  edited.captions[0] = editCaption(baseline.captions[0], '  Xin   bạn  ');
  assert.equal(edited.captions[0].text, '  Xin   bạn  ');
  assert.equal(edited.captions[0].words[1].startMs, 500);
  validateDocument(edited, baseline);
});
test('draft save preserves previous revisions and refuses stale writes', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'windi-editor-test-'));
  const file = path.join(root, 'draft.json'), baseline = document();
  const first = await saveDraft(file, baseline, baseline); assert.equal(first.revision, 1);
  first.beats[0].headline = 'Bản mới'; const second = await saveDraft(file, first, baseline); assert.equal(second.revision, 2);
  assert.equal(JSON.parse(await readFile(path.join(root, 'history/revision-1.json'), 'utf8')).beats[0].headline, 'A');
  await assert.rejects(saveDraft(file, first, baseline), /cửa sổ khác/);
});
test('media paths cannot escape public even through symlinks', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'windi-editor-path-')); await mkdir(path.join(root, 'public'));
  await symlink(root, path.join(root, 'public', 'escape'));
  for (const name of ['../secret', '/secret', 'file:secret', '.env', 'dir/../secret']) assert.throws(() => validateAssetName(name));
  await assert.rejects(safeAsset(path.join(root, 'public'), 'escape/public'), /ngoài/);
});
test('exports corrected caption text with precise SRT times', () => {
  assert.match(captionsSrt(document().captions), /00:00:00,100 --> 00:00:00,900\nXin chào/);
});
test('scene layout inherits global values; resetting a scene restores inheritance', () => {
  const base = document();
  const global = patchLayout(base, 0, 'headline', {x: 100, fontSize: 48}, 'all');
  const scene = patchLayout(global, 1, 'headline', {x: 160});
  assert.deepEqual(resolveLayout(scene, 0, 'headline'), {x: 100, fontSize: 48});
  assert.deepEqual(resolveLayout(scene, 1, 'headline'), {x: 160, fontSize: 48});
  assert.deepEqual(resolveLayout(patchLayout(scene, 1, 'headline', null), 1, 'headline'), {x: 100, fontSize: 48});
  assert.equal(base.layout, undefined); validateDocument(scene, base);
});
test('layout rejects non-finite geometry, CSS injection, unknown properties and bad identifiers', () => {
  for (const layout of [{headline: {x: Infinity}}, {headline: {width: 0}}, {headline: {color: 'red;display:none'}}, {headline: {position: 'fixed'}}, {'bad"]div': {x: 100}}, {headline: {wrap: 'true'}}]) {
    const d = document(); d.layout = layout; assert.throws(() => validateDocument(d, document()), /layout/);
  }
});
test('music edits and transition effects preserve narration and total frame coverage', () => {
  const base = document(), d = document();
  d.audio = {...d.audio, music: 'editor-media/new-track.wav', musicTrimBefore: 45, musicOffsetFrames: 30, musicFadeInFrames: 15, musicFadeOutFrames: 60};
  d.beats[1].transition = {type: 'scan', durationInFrames: 12};
  validateDocument(d, base);
  assert.deepEqual(d.captions, base.captions); assert.equal(d.audio.voice, base.audio.voice); assert.equal(d.totalFrames, base.totalFrames);
  for (const mutate of [x => x.audio.music = '../escape.mp3', x => x.audio.music = 'clip.mp4', x => x.audio.musicOffsetFrames = 300, x => x.audio.musicFadeInFrames = 1.5, x => x.beats[1].transition.durationInFrames = 100]) {
    const invalid = structuredClone(d); mutate(invalid); assert.throws(() => validateDocument(invalid, base));
  }
});
test('attach registers native WS25 roots while preserving original source and scene components', async () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const original = path.resolve(here, '../../../videos/windistudio-repo/ws25-esp32-adblock/src');
  const root = await mkdtemp(path.join(os.tmpdir(), 'windi-editor-attach-'));
  await mkdir(path.join(root, 'src/components'), {recursive: true});
  for (const name of ['Composition.tsx', 'timeline.json', 'components/Watermark.tsx', 'components/RetroWindow.tsx']) await copyFile(path.join(original, name), path.join(root, 'src', name));
  const source = await readFile(path.join(root, 'src/Composition.tsx'), 'utf8');
  await promisify(execFile)(process.execPath, [path.join(here, 'attach.mjs'), '--project', root]);
  const adapted = await readFile(path.join(root, 'src/EditorComposition.tsx'), 'utf8');
  assert.equal(await readFile(path.join(root, 'src/Composition.tsx'), 'utf8'), source);
  for (const name of ['douyin_synced.mp4', 'OffthreadVideo', 'Watermark', 'FooterProgress']) assert.ok(adapted.includes(name), name);
  assert.equal((adapted.match(/<EditorElement /g) || []).length, 6);
  assert.ok(adapted.includes('<EditorMusic editor={editor}/>'));
  assert.ok(adapted.includes('<OffthreadVideo trimBefore={beat.startFrame}'));
  assert.ok(adapted.includes('!editor?.beats.some(b => b.media)'));
  assert.ok(adapted.includes('<EditorTransition beats={timeline.beats}/>'));
  assert.ok(adapted.includes('<EditorWindowMedia editor={editor}>'));
  assert.equal(ts.createSourceFile('adapter.tsx', adapted, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX).parseDiagnostics.length, 0);
  await promisify(execFile)(process.execPath, [path.join(here, 'attach.mjs'), '--project', root]);
  assert.equal(await readFile(path.join(root, 'src/EditorComposition.tsx'), 'utf8'), adapted);
});

test('moving caption groups shifts every karaoke word together and clamps against unselected neighbours', async () => {
  const {shiftTimelineItems} = await import('./client-model.mjs');
  const base = document();
  base.captions.push({...structuredClone(base.captions[0]), startMs: 1000, endMs: 1800, words: base.captions[0].words.map(w => ({...w, startMs: w.startMs + 900, endMs: w.endMs + 900}))});
  const single = shiftTimelineItems(base, ['caption:0'], 30);
  assert.equal(single.captions[0].startMs, 200); assert.equal(single.captions[0].endMs, 1000);
  assert.deepEqual(single.captions[1], base.captions[1]); validateDocument(single, base);
  const moved = shiftTimelineItems(base, ['caption:0', 'caption:1'], 270);
  assert.equal(moved.captions[0].startMs, 9100); assert.equal(moved.captions[1].endMs, 10800);
  assert.equal(moved.captions[0].words[1].startMs - moved.captions[0].words[0].startMs, 400);
  assert.deepEqual(moved.audio, base.audio); assert.deepEqual(moved.beats, base.beats); validateDocument(moved, base);
  assert.equal(captionsSrt(moved.captions, 10000).split('-->').length - 1, 1);
  const left = shiftTimelineItems(base, ['caption:0', 'caption:1'], -999);
  assert.equal(left.captions[0].startMs, 0); validateDocument(left, base);
});

test('media clips use independent timing, reject occupied drops and move groups without overlaps', async () => {
  const {addMediaClip, shiftTimelineItems, trimMediaClip} = await import('./client-model.mjs');
  const base = document(), media = {kind: 'video', src: 'demo.mp4', trimBefore: 0, fit: 'contain', zoom: 1, x: 50, y: 50, volume: 0};
  const first = addMediaClip(base, media, 30, 60, 'first');
  const second = addMediaClip(first, media, 120, 60, 'second');
  assert.throws(() => addMediaClip(second, media, 40, 10, 'occupied'), /đã có clip/);
  const clamped = shiftTimelineItems(second, ['media:first'], 999);
  assert.equal(clamped.mediaClips[0].endFrame, 120);
  const grouped = shiftTimelineItems(second, ['media:first', 'media:second'], 999);
  assert.deepEqual(grouped.mediaClips.map(c => [c.startFrame, c.endFrame]), [[150, 210], [240, 300]]);
  const trimmed = trimMediaClip(second, 'first', 'start', 60, 60);
  assert.equal(trimmed.mediaClips[0].media.trimBefore, 30); assert.equal(trimmed.mediaClips[0].endFrame, 90);
  assert.equal(trimMediaClip(trimmed, 'first', 'end', 300, 60).mediaClips[0].endFrame, 90);
  assert.deepEqual(grouped.captions, base.captions); validateDocument(grouped, base); validateDocument(trimmed, base);
  const image = addMediaClip(base, {...media, kind: 'image', src: 'still.png'}, 60, 30, 'image');
  const extended = trimMediaClip(trimMediaClip(image, 'image', 'start', 0, 30), 'image', 'end', 300, 30);
  assert.equal(extended.mediaClips[0].startFrame, 0); assert.equal(extended.mediaClips[0].endFrame, 300);
  assert.equal(extended.mediaClips[0].media.trimBefore, 0); validateDocument(extended, base);
});

test('mixed media/caption selection uses one shared constrained delta', async () => {
  const {addMediaClip, shiftTimelineItems} = await import('./client-model.mjs');
  const base = document(), media = {kind: 'image', src: 'test.png', trimBefore: 0, fit: 'cover', zoom: 1, x: 50, y: 50, volume: 0};
  const withClip = addMediaClip(base, media, 270, 30, 'last');
  const next = shiftTimelineItems(withClip, ['caption:0', 'media:last'], 30);
  assert.deepEqual(next, withClip);
  const shifted = shiftTimelineItems(withClip, ['caption:0', 'media:last'], -3);
  assert.equal(shifted.captions[0].startMs, 0); assert.equal(shifted.mediaClips[0].startFrame, 267);
  validateDocument(shifted, base);
});

test('window content transform inherits, resets and persists with shifted captions and clips', async () => {
  const {patchWindowTransform, resolveWindowTransform, addMediaClip, shiftTimelineItems} = await import('./client-model.mjs');
  const base = document();
  let d = patchWindowTransform(base, 0, {x: 12, scale: 1.3}, 'all');
  d = patchWindowTransform(d, 1, {x: -8, y: 5});
  assert.deepEqual(resolveWindowTransform(d, 1), {x: -8, y: 5, scale: 1.3});
  assert.deepEqual(resolveWindowTransform(patchWindowTransform(d, 1, null), 1), {x: 12, y: 0, scale: 1.3});
  d = addMediaClip(d, {kind: 'image', src: 'test.png', trimBefore: 0, fit: 'contain', zoom: 1, x: 50, y: 50, volume: 0}, 30, 60, 'image');
  d = shiftTimelineItems(d, ['caption:0'], 30);
  const root = await mkdtemp(path.join(os.tmpdir(), 'windi-group-save-'));
  await saveDraft(path.join(root, 'draft.json'), d, base);
  const saved = JSON.parse(await readFile(path.join(root, 'draft.json'), 'utf8'));
  assert.equal(saved.captions[0].words[0].startMs, 1100); assert.equal(saved.mediaClips[0].startFrame, 30);
  assert.deepEqual(resolveWindowTransform(saved, 1), {x: -8, y: 5, scale: 1.3});
});

test('rejects overlapping media, invalid transforms and corrupt moved caption timing', async () => {
  const {addMediaClip} = await import('./client-model.mjs');
  const base = document(), clip = addMediaClip(base, {kind: 'video', src: 'demo.mp4', trimBefore: 0, fit: 'contain', zoom: 1, x: 50, y: 50, volume: 0}, 30, 60, 'clip');
  for (const mutate of [d => d.windowTransform = {x: Infinity}, d => d.windowTransform = {scale: 0}, d => d.beats[0].windowTransform = {position: 'fixed'}, d => d.mediaClips.push({...d.mediaClips[0], id: 'overlap'}), d => d.mediaClips[0].endFrame = 301, d => d.mediaClips[0].media.src = '../escape.mp4', d => d.captions[0].endMs += 50, d => d.captions[0].startMs = -1]) {
    const invalid = structuredClone(clip); mutate(invalid); assert.throws(() => validateDocument(invalid, base));
  }
});
