export function validateDocument(doc, baseline) {
  const fail = (message) => {throw new Error(message);};
  const number = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
  const frame = (value) => Number.isInteger(value) && number(value, 0, baseline.totalFrames);
  if (!doc || doc.schemaVersion !== 1 || doc.episodeId !== baseline.episodeId || doc.fps !== baseline.fps || doc.totalFrames !== baseline.totalFrames) fail('Định dạng hoặc thời lượng dự án không hợp lệ.');
  if (!Number.isInteger(doc.revision) || doc.revision < 0) fail('Phiên bản draft không hợp lệ.');
  const layout = map => {
    if (map == null) return;
    if (typeof map !== 'object' || Array.isArray(map) || Object.keys(map).length > 40) fail('Layout không hợp lệ.');
    const ranges = {x: [-1080, 2160], y: [-1920, 3840], width: [24, 2160], height: [16, 3840], fontSize: [10, 200], lineHeight: [0.8, 3]};
    for (const [id, values] of Object.entries(map)) {
      if (!/^[a-z][a-z0-9-]{0,39}$/.test(id) || !values || typeof values !== 'object' || Array.isArray(values)) fail('Khối layout không hợp lệ.');
      for (const [key, value] of Object.entries(values)) {
        if (key in ranges ? !number(value, ...ranges[key]) : key === 'color' ? !/^#[0-9a-f]{6}$/i.test(value) : key === 'textAlign' ? !['left', 'center', 'right'].includes(value) : key === 'wrap' ? typeof value !== 'boolean' : true) fail('Thuộc tính layout không hợp lệ.');
      }
    }
  };
  layout(doc.layout);
  const transform = value => {
    if (value == null) return;
    if (typeof value !== 'object' || Array.isArray(value)) fail('Vị trí nội dung không hợp lệ.');
    for (const [key, v] of Object.entries(value)) if (key === 'scale' ? !number(v, 0.1, 6) : ['x', 'y'].includes(key) ? !number(v, -100, 100) : true) fail('Vị trí nội dung không hợp lệ.');
  };
  const media = m => {
    if (!m || !['image', 'video'].includes(m.kind) || !['cover', 'contain'].includes(m.fit) || !number(m.zoom, 1, 3) || !number(m.x, 0, 100) || !number(m.y, 0, 100) || !number(m.volume, 0, 1) || !Number.isInteger(m.trimBefore) || !number(m.trimBefore, 0, 10000000)) fail('Cấu hình media không hợp lệ.');
    validateAssetName(m.src);
  };
  transform(doc.windowTransform);
  if (!Array.isArray(doc.beats) || doc.beats.length !== baseline.beats.length) fail('Số cảnh không khớp composition.');
  let cursor = 0;
  for (const [i, beat] of doc.beats.entries()) {
    if (beat.id !== baseline.beats[i].id || beat.index !== baseline.beats[i].index) fail('Thứ tự cảnh không khớp composition.');
    if (!frame(beat.startFrame) || !frame(beat.endFrame) || beat.startFrame !== cursor || beat.endFrame - beat.startFrame < 3) fail('Các cảnh phải nối liền nhau, mỗi cảnh ít nhất 3 frame.');
    for (const key of ['headline', 'spokenPill', 'category']) if (typeof beat[key] !== 'string' || beat[key].length > 250) fail('Nội dung chữ quá dài hoặc không hợp lệ.');
    if (beat.accentColor != null && !/^#[0-9a-f]{6}$/i.test(beat.accentColor)) fail('Màu nhấn không hợp lệ.');
    layout(beat.layout);
    transform(beat.windowTransform);
    if (beat.transition && (!['none', 'fade', 'scan'].includes(beat.transition.type) || !Number.isInteger(beat.transition.durationInFrames) || !number(beat.transition.durationInFrames, 2, Math.min(60, baseline.totalFrames)))) fail('Chuyển cảnh không hợp lệ.');
    if (beat.media) {
      media(beat.media);
    }
    cursor = beat.endFrame;
  }
  if (cursor !== doc.totalFrames) fail('Cảnh cuối phải kết thúc tại thời lượng voice.');
  if (doc.mediaClips != null) {
    if (!Array.isArray(doc.mediaClips) || doc.mediaClips.length > 100) fail('Track media không hợp lệ.');
    const ids = new Set(); let end = 0;
    if (doc.mediaClips.some(c => !c || typeof c !== 'object')) fail('Clip media không hợp lệ.');
    for (const clip of [...doc.mediaClips].sort((a, b) => a.startFrame - b.startFrame)) {
      if (!clip || typeof clip.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(clip.id) || ids.has(clip.id) || !frame(clip.startFrame) || !frame(clip.endFrame) || clip.endFrame <= clip.startFrame || clip.startFrame < end) fail('Clip media bị trùng hoặc chồng thời gian.');
      ids.add(clip.id); end = clip.endFrame; media(clip.media);
    }
  }
  if (!doc.audio || doc.audio.voice !== baseline.audio.voice) fail('Không thay voice trong bước chỉnh hình.');
  validateAssetName(doc.audio.music);
  if (!/\.(mp3|wav|m4a|aac|ogg)$/i.test(doc.audio.music)) fail('Định dạng nhạc nền không hợp lệ.');
  for (const key of ['voiceVolume', 'musicVolume', 'sfxVolume']) if (!number(doc.audio[key], 0, 1)) fail('Âm lượng phải từ 0 đến 100%.');
  for (const key of ['musicTrimBefore', 'musicOffsetFrames', 'musicFadeInFrames', 'musicFadeOutFrames']) if (doc.audio[key] != null && (!Number.isInteger(doc.audio[key]) || !number(doc.audio[key], 0, key === 'musicTrimBefore' ? 10000000 : doc.totalFrames - 1))) fail('Mốc nhạc nền không hợp lệ.');
  if (!Array.isArray(doc.captions) || doc.captions.length !== baseline.captions.length) fail('Nhóm phụ đề không khớp voice.');
  let captionEnd = 0;
  for (const [i, caption] of doc.captions.entries()) {
    const base = baseline.captions[i];
    if (!caption || typeof caption.text !== 'string' || caption.text.length > 500 || !number(caption.startMs, captionEnd, baseline.totalFrames / baseline.fps * 2000) || !number(caption.endMs, caption.startMs + 1, baseline.totalFrames / baseline.fps * 2000) || Math.abs(caption.endMs - caption.startMs - (base.endMs - base.startMs)) > 0.01 || !Array.isArray(caption.words) || caption.words.length > 100) fail('Phụ đề không hợp lệ.');
    captionEnd = caption.endMs;
    let start = caption.startMs;
    for (const word of caption.words) {
      if (typeof word.text !== 'string' || word.text.length > 100 || !number(word.startMs, start, caption.endMs) || !number(word.endMs, word.startMs, caption.endMs)) fail('Mốc từ phụ đề không hợp lệ.');
      start = word.startMs;
    }
    if (caption.words.map(w => w.text).join(' ').trim() !== caption.text.trim().replace(/\s+/g, ' ')) fail('Chữ phụ đề phải khớp với các từ.');
  }
  return structuredClone(doc);
}

// Per-scene overrides inherit the project layout, without copying it into every beat.
export function resolveLayout(doc, index, id) {
  return {...doc.layout?.[id], ...doc.beats[index]?.layout?.[id]};
}

export function patchLayout(doc, index, id, values, scope = 'scene') {
  const copy = structuredClone(doc);
  const target = scope === 'all' ? copy : copy.beats[index];
  target.layout = {...target.layout};
  if (values === null) delete target.layout[id];
  else target.layout[id] = {...target.layout[id], ...values};
  return copy;
}

export function moveBoundary(doc, boundaryIndex, targetFrame) {
  const copy = structuredClone(doc);
  if (boundaryIndex <= 0 || boundaryIndex >= copy.beats.length) return copy;
  const left = copy.beats[boundaryIndex - 1], right = copy.beats[boundaryIndex];
  const next = Math.max(left.startFrame + 3, Math.min(right.endFrame - 3, Math.round(targetFrame)));
  left.endFrame = next; right.startFrame = next;
  return copy;
}

export function editCaption(caption, text) {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (clean === caption.text.trim()) return {...caption, text};
  const parts = clean ? clean.split(' ') : [];
  // Keep word timestamps when correcting the same number of words. New word counts
  // are distributed within this group only; the narration is never regenerated.
  const preserve = parts.length === caption.words.length;
  return {...caption, text, words: parts.map((word, i) => ({text: word,
    startMs: preserve ? caption.words[i].startMs : Math.round(caption.startMs + (caption.endMs - caption.startMs) * i / parts.length),
    endMs: preserve ? caption.words[i].endMs : Math.round(caption.startMs + (caption.endMs - caption.startMs) * (i + 1) / parts.length)}))};
}

export function validateAssetName(name) {
  if (typeof name !== 'string' || !name || name.includes('\\') || name.startsWith('/') || name.split('/').some(part => part === '..' || part === '.' || part.startsWith('.')) || /[:?#\0]/.test(name)) throw new Error('Đường dẫn media không hợp lệ.');
  return name;
}

export function resolveWindowTransform(doc, index) {
  return {x: 0, y: 0, scale: 1, ...doc.windowTransform, ...doc.beats[index]?.windowTransform};
}
export function patchWindowTransform(doc, index, values, scope = 'scene') {
  const copy = structuredClone(doc), target = scope === 'all' ? copy : copy.beats[index];
  if (values === null) delete target.windowTransform;
  else target.windowTransform = {...target.windowTransform, ...values};
  return copy;
}
// One shared delta preserves spacing, durations and every karaoke word boundary.
export function shiftTimelineItems(doc, keys, deltaFrames) {
  const selected = new Set(keys), copy = structuredClone(doc);
  let low = -Infinity, high = Infinity, count = 0;
  const limit = (items, prefix, unit, max) => {
    items.forEach((item, i) => {
      const key = prefix + (prefix === 'caption:' ? i : item.id);
      if (!selected.has(key)) return;
      count++;
      const start = unit === 'ms' ? item.startMs : item.startFrame, end = unit === 'ms' ? item.endMs : item.endFrame;
      const previous = items.slice(0, i).reverse().find((v, j) => !selected.has(prefix + (prefix === 'caption:' ? i - j - 1 : v.id)));
      const next = items.slice(i + 1).find((v, j) => !selected.has(prefix + (prefix === 'caption:' ? i + j + 1 : v.id)));
      const factor = unit === 'ms' ? doc.fps / 1000 : 1;
      low = Math.max(low, ((previous ? previous[unit === 'ms' ? 'endMs' : 'endFrame'] : 0) - start) * factor);
      high = Math.min(high, ((next ? next[unit === 'ms' ? 'startMs' : 'startFrame'] : max) - end) * factor);
    });
  };
  limit(doc.captions, 'caption:', 'ms', doc.totalFrames / doc.fps * 2000);
  limit([...(doc.mediaClips || [])].sort((a, b) => a.startFrame - b.startFrame), 'media:', 'frames', doc.totalFrames);
  if (selected.has('music')) {count++; low = Math.max(low, -(doc.audio.musicOffsetFrames ?? 0)); high = Math.min(high, doc.totalFrames - 1 - (doc.audio.musicOffsetFrames ?? 0));}
  if (!count || !Number.isFinite(deltaFrames)) return copy;
  const delta = Math.max(Math.ceil(low - 1e-6), Math.min(Math.floor(high + 1e-6), Math.round(deltaFrames)));
  const ms = Math.round(delta * 1000 / doc.fps);
  copy.captions = copy.captions.map((c, i) => selected.has(`caption:${i}`) ? {...c, startMs: c.startMs + ms, endMs: c.endMs + ms, words: c.words.map(w => ({...w, startMs: w.startMs + ms, endMs: w.endMs + ms}))} : c);
  if (copy.mediaClips) copy.mediaClips = copy.mediaClips.map(c => selected.has(`media:${c.id}`) ? {...c, startFrame: c.startFrame + delta, endFrame: c.endFrame + delta} : c);
  if (selected.has('music')) copy.audio.musicOffsetFrames = (copy.audio.musicOffsetFrames ?? 0) + delta;
  return copy;
}
export function addMediaClip(doc, media, at, duration, id) {
  const copy = structuredClone(doc), startFrame = Math.max(0, Math.min(doc.totalFrames - 1, Math.round(at)));
  const clips = [...(doc.mediaClips || [])].sort((a, b) => a.startFrame - b.startFrame);
  if (clips.some(c => startFrame >= c.startFrame && startFrame < c.endFrame)) throw new Error('Vị trí này đã có clip. Thả vào khoảng trống trên track Media cửa sổ.');
  const next = clips.find(c => c.startFrame > startFrame);
  const endFrame = Math.min(next?.startFrame ?? doc.totalFrames, startFrame + Math.max(1, Math.floor(duration)));
  copy.mediaClips = [...clips, {id, startFrame, endFrame, media}].sort((a, b) => a.startFrame - b.startFrame);
  return copy;
}
export function trimMediaClip(doc, id, edge, target, sourceFrames = 10000000) {
  const copy = structuredClone(doc), clips = [...(copy.mediaClips || [])].sort((a, b) => a.startFrame - b.startFrame), i = clips.findIndex(c => c.id === id);
  if (i < 0) return copy;
  const c = clips[i];
  if (edge === 'start') {
    const start = Math.max(clips[i - 1]?.endFrame ?? 0, c.media.kind === 'video' ? c.startFrame - c.media.trimBefore : 0, Math.min(c.endFrame - 1, Math.round(target)));
    if (c.media.kind === 'video') c.media.trimBefore += start - c.startFrame;
    c.startFrame = start;
  } else c.endFrame = Math.max(c.startFrame + 1, Math.min(clips[i + 1]?.startFrame ?? doc.totalFrames, c.media.kind === 'video' ? c.startFrame + sourceFrames - c.media.trimBefore : doc.totalFrames, Math.round(target)));
  return copy;
}
