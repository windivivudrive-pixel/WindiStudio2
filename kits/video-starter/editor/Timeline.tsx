import React, {useRef, useState} from 'react';
import {moveBoundary, shiftTimelineItems, trimMediaClip} from './client-model.mjs';
import type {EditorDocument, TimelineItemKey} from './types';

export const ASSET_DRAG_TYPE = 'application/x-windi-asset';
const clock = (frame: number, fps: number) => `${String(Math.floor(frame / fps / 60)).padStart(2, '0')}:${String(Math.floor(frame / fps) % 60).padStart(2, '0')}`;
type Props = {
  doc: EditorDocument; frame: number; selected: number; busy: boolean; waveform: number[];
  canUndo: boolean; canRedo: boolean; onTravel: (direction: 'undo' | 'redo') => void;
  onChange: (doc: EditorDocument) => void; onPreview: (doc: EditorDocument) => void; onCommit: (before: EditorDocument) => void;
  onSeek: (frame: number) => void; onPause: () => void; onScene: (index: number) => void;
  onCaption: (index: number) => void; onMedia: (id: string) => void; onMusic: () => void; onCaptionLayout: () => void;
  onDropAsset: (src: string, frame: number) => Promise<void>; onDropFile: (file: File, frame: number) => Promise<void>;
  sourceFrames: Record<string, number>; icon: (name: string) => React.ReactNode;
};
type Gesture = {before: EditorDocument; x: number; y: number; scrollLeft: number; keys: TimelineItemKey[]; kind: 'move' | 'marquee' | 'boundary' | 'trim'; index?: number; id?: string; edge?: 'start' | 'end'; startFrame?: number; moved: boolean};
export function Timeline(p: Props) {
  const {doc, icon} = p;
  const [zoom, setZoom] = useState(18), [collapsed, setCollapsed] = useState(false);
  const [height, setHeight] = useState<number | undefined>();
  const resize = useRef<{y: number; height: number} | null>(null);
  const [selection, setSelection] = useState<TimelineItemKey[]>([]), [box, setBox] = useState<{left: number; top: number; width: number; height: number} | null>(null);
  const [shift, setShift] = useState(1), [dropping, setDropping] = useState(false);
  const gesture = useRef<Gesture | null>(null), suppressClick = useRef(false), scroll = useRef<HTMLDivElement>(null), tracks = useRef<HTMLDivElement>(null);
  const pixels = Math.max(zoom, 780 / (doc.totalFrames / doc.fps));
  const endFrame = Math.max(doc.totalFrames, ...doc.captions.map(c => Math.ceil(c.endMs / 1000 * doc.fps)));
  const width = endFrame / doc.fps * pixels, videoWidth = doc.totalFrames / doc.fps * pixels;
  const pick = (e: React.PointerEvent, key: TimelineItemKey) => {
    if (p.busy || e.button !== 0) return;
    e.stopPropagation(); p.onPause(); suppressClick.current = false;
    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    const next = additive ? selection.includes(key) ? selection.filter(k => k !== key) : [...selection, key] : selection.includes(key) ? selection : [key];
    setSelection(next); e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = {before: doc, x: e.clientX, y: e.clientY, scrollLeft: scroll.current?.scrollLeft || 0, keys: next, kind: 'move', moved: false};
  };
  const startBox = (e: React.PointerEvent) => {
    if (p.busy || e.button !== 0 || (e.target as HTMLElement).closest('button,.ruler,.scene-track,.voice-track')) return;
    e.preventDefault(); p.onPause(); const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    const keys = e.shiftKey || e.metaKey || e.ctrlKey ? selection : [];
    gesture.current = {before: doc, x: e.clientX - r.left, y: e.clientY - r.top, scrollLeft: 0, keys, kind: 'marquee', moved: false};
    setBox({left: e.clientX - r.left, top: e.clientY - r.top, width: 0, height: 0}); setSelection(keys);
  };
  const move = (e: React.PointerEvent) => {
    const g = gesture.current; if (!g || !tracks.current) return;
    if (g.kind === 'marquee') {
      const r = tracks.current.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const rect = {left: Math.min(g.x, x), top: Math.min(g.y, y), width: Math.abs(x - g.x), height: Math.abs(y - g.y)};
      setBox(rect);
      const hits = Array.from(tracks.current.querySelectorAll<HTMLElement>('[data-timeline-item]')).filter(el => {const b = el.getBoundingClientRect(); return b.right >= r.left + rect.left && b.left <= r.left + rect.left + rect.width && b.bottom >= r.top + rect.top && b.top <= r.top + rect.top + rect.height;}).map(el => el.dataset.timelineItem as TimelineItemKey);
      setSelection([...new Set([...g.keys, ...hits])]); return;
    }
    const dx = e.clientX - g.x + (scroll.current?.scrollLeft || 0) - g.scrollLeft;
    if (!g.moved && Math.abs(dx) < 3) return;
    g.moved = true;
    if (scroll.current) {const b = scroll.current.getBoundingClientRect(); if (e.clientX > b.right - 24) scroll.current.scrollLeft += 12; else if (e.clientX < b.left + 145) scroll.current.scrollLeft -= 12;}
    const delta = Math.round(dx / pixels * doc.fps);
    const source = g.kind === 'trim' ? g.before.mediaClips!.find(c => c.id === g.id)!.media : undefined;
    const next = g.kind === 'move' ? shiftTimelineItems(g.before, g.keys, delta) : g.kind === 'boundary' ? moveBoundary(g.before, g.index!, g.startFrame! + delta) : trimMediaClip(g.before, g.id!, g.edge!, g.startFrame! + delta, source!.kind === 'image' ? doc.totalFrames : p.sourceFrames[source!.src]);
    p.onPreview(next);
  };
  const finish = () => {const g = gesture.current; if (!g) return; if (g.kind !== 'marquee' && g.moved) p.onCommit(g.before); suppressClick.current = g.moved; gesture.current = null; setBox(null);};
  const cancel = () => {const g = gesture.current; if (g && g.kind !== 'marquee') p.onPreview(g.before); gesture.current = null; setBox(null);};
  const trimStart = (e: React.PointerEvent, kind: 'boundary' | 'trim', fields: Partial<Gesture>) => {if (p.busy) return; e.stopPropagation(); p.onPause(); e.currentTarget.setPointerCapture(e.pointerId); gesture.current = {before: doc, x: e.clientX, y: e.clientY, scrollLeft: scroll.current?.scrollLeft || 0, keys: [], kind, moved: false, ...fields};};
  const chosen = (key: TimelineItemKey) => selection.includes(key) ? ' selected' : '';
  const keyboardMove = (e: React.KeyboardEvent, key: TimelineItemKey) => {
    if (p.busy || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation(); p.onPause(); const keys = selection.includes(key) ? selection : [key]; setSelection(keys);
    p.onChange(shiftTimelineItems(doc, keys, (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? doc.fps : 1)));
  };
  const selectAllCaptions = () => setSelection(doc.captions.map((_, i): TimelineItemKey => `caption:${i}`));
  const drop = async (e: React.DragEvent) => {
    e.preventDefault(); setDropping(false); if (p.busy) return;
    const r = tracks.current!.getBoundingClientRect(), at = Math.max(0, Math.min(doc.totalFrames - 1, Math.round((e.clientX - r.left) / pixels * doc.fps)));
    const src = e.dataTransfer.getData(ASSET_DRAG_TYPE);
    if (src) await p.onDropAsset(src, at);
    else if (e.dataTransfer.files[0]) await p.onDropFile(e.dataTransfer.files[0], at);
  };
  return <section className={`timeline-panel enhanced ${collapsed ? 'collapsed' : ''}`} style={collapsed ? undefined : {height}} aria-label="Timeline video" onKeyDown={e => {
    if ((e.target as HTMLElement).matches('input,select,textarea')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {e.preventDefault(); selectAllCaptions();}
    if (e.key === 'Escape') {setSelection([]); cancel();}
  }}>
    {!collapsed && <div className="timeline-resize" role="separator" aria-label="Đổi chiều cao timeline" aria-orientation="horizontal" tabIndex={0} onPointerDown={e => {e.currentTarget.setPointerCapture(e.pointerId); resize.current = {y: e.clientY, height: e.currentTarget.parentElement!.getBoundingClientRect().height};}} onPointerMove={e => {const g = resize.current; if (g) setHeight(Math.max(140, Math.min(window.innerHeight - 220, g.height + g.y - e.clientY)));}} onPointerUp={() => {resize.current = null;}} onPointerCancel={() => {resize.current = null;}} onKeyDown={e => {if (['ArrowUp', 'ArrowDown'].includes(e.key)) {e.preventDefault(); e.stopPropagation(); setHeight(Math.max(140, Math.min(window.innerHeight - 220, (height || e.currentTarget.parentElement!.getBoundingClientRect().height) + (e.key === 'ArrowUp' ? 10 : -10))));}}}/>}
    <div className="timeline-toolbar"><h2>Timeline</h2><button aria-label="Hoàn tác" title="Hoàn tác · ⌘Z" disabled={!p.canUndo || p.busy} onClick={() => p.onTravel('undo')}>{icon('undo')}</button><button aria-label="Làm lại" title="Làm lại · ⌘⇧Z" disabled={!p.canRedo || p.busy} onClick={() => p.onTravel('redo')}>{icon('redo')}</button>
      <button className="collapse-timeline" aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>{collapsed ? 'Mở timeline' : 'Thu gọn'}</button>
      <button className="select-captions" disabled={p.busy} onClick={selectAllCaptions}>Chọn tất cả sub</button><button onClick={p.onCaptionLayout}>Vị trí sub trên hình</button>
      <label className="timeline-zoom">Thu phóng<input aria-label="Thu phóng timeline" type="range" min="12" max="60" value={zoom} onChange={e => setZoom(Number(e.target.value))}/></label>
    </div>
    {!collapsed && <div className="selection-toolbar"><span role="status">{selection.length ? `Đã chọn ${selection.length} phần tử` : 'Kéo vùng trống để quét chọn · Shift / ⌘ click chọn thêm'}</span>{!!selection.length && <><label>Dời (s)<input aria-label="Dời nhóm trên timeline" type="number" step={1 / doc.fps} value={shift} onChange={e => setShift(Number(e.target.value))}/></label><button disabled={p.busy || !Number.isFinite(shift)} onClick={() => p.onChange(shiftTimelineItems(doc, selection, shift * doc.fps))}>Áp dụng</button><button onClick={() => setSelection([])}>Bỏ chọn</button><button disabled={p.busy || !selection.some(k => k.startsWith('media:'))} onClick={() => {p.onChange({...doc, mediaClips: doc.mediaClips?.filter(c => !selection.includes(`media:${c.id}`))}); setSelection(selection.filter(k => !k.startsWith('media:')));}}>Xóa clip đã chọn</button></>}{doc.captions.some(c => c.endMs > doc.totalFrames / doc.fps * 1000) && <small>Phụ đề sau mốc Hết video sẽ bị cắt khi xuất.</small>}</div>}
    <div className="timeline-scroll" ref={scroll}>
      <div className="track-labels"><div>THỜI GIAN</div><div>{icon('film')}Cảnh / hình</div><div className="media-label">{icon('film')}Media cửa sổ</div><div>{icon('text')}Phụ đề</div><div>{icon('audio')}Voice</div><div>{icon('audio')}Nhạc nền</div><div/></div>
      <div className="tracks" ref={tracks} data-timeline-pixels={pixels} style={{width}} onPointerDown={startBox} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={finish}
        onDragOver={e => {if (!p.busy && (e.dataTransfer.types.includes(ASSET_DRAG_TYPE) || e.dataTransfer.types.includes('Files'))) {e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDropping(true);}}} onDragLeave={e => {if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropping(false);}} onDrop={drop}>
        <div className="ruler" role="slider" tabIndex={0} aria-label="Vị trí phát" aria-valuemin={0} aria-valuemax={doc.totalFrames - 1} aria-valuenow={p.frame} onKeyDown={e => {if (e.key === 'Home') p.onSeek(0); if (e.key === 'End') p.onSeek(doc.totalFrames - 1);}} onPointerDown={e => {e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); p.onPause(); const r = e.currentTarget.getBoundingClientRect(); p.onSeek(Math.max(0, Math.min(doc.totalFrames - 1, Math.round((e.clientX - r.left) / pixels * doc.fps))));}} onPointerMove={e => {if (e.buttons === 1) {const r = e.currentTarget.getBoundingClientRect(); p.onSeek(Math.max(0, Math.min(doc.totalFrames - 1, Math.round((e.clientX - r.left) / pixels * doc.fps))));}}}>{Array.from({length: Math.ceil(endFrame / doc.fps / 5)}, (_, i) => <span style={{left: i * 5 * pixels}} key={i}>{clock(i * 5 * doc.fps, doc.fps)}</span>)}</div>
        <div className="scene-track">{doc.beats.map((b, i) => <React.Fragment key={b.id}><button aria-label={`Chọn cảnh ${i + 1}`} className={`scene-clip ${i === p.selected ? 'selected' : ''}`} style={{left: b.startFrame / doc.fps * pixels, width: (b.endFrame - b.startFrame) / doc.fps * pixels}} onClick={() => {if (!suppressClick.current) p.onScene(i); suppressClick.current = false;}}><span>{String(i + 1).padStart(2, '0')} / {b.name || b.category}</span><strong>{b.headline}</strong><small>{((b.endFrame - b.startFrame) / doc.fps).toFixed(2)}s · {b.media ? 'media cảnh' : 'nội dung gốc'}</small></button>{i > 0 && <button className="trim-handle" aria-label={`Điểm chuyển cảnh ${i} sang ${i + 1}`} disabled={p.busy} style={{left: b.startFrame / doc.fps * pixels - 6}} onPointerDown={e => trimStart(e, 'boundary', {index: i, startFrame: b.startFrame})} onKeyDown={e => {if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {e.preventDefault(); e.stopPropagation(); p.onChange(moveBoundary(doc, i, b.startFrame + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? doc.fps : 1)));}}}><span/></button>}</React.Fragment>)}</div>
        <div className={`media-track ${dropping ? 'drop-target' : ''}`} aria-label="Track media cửa sổ"><span className="drop-hint">Kéo video / ảnh từ thư viện hoặc máy vào đây</span>{doc.mediaClips?.map(c => <div key={c.id} className="media-clip-wrap" style={{left: c.startFrame / doc.fps * pixels, width: (c.endFrame - c.startFrame) / doc.fps * pixels}}><button data-timeline-item={`media:${c.id}`} className={`media-clip${chosen(`media:${c.id}`)}`} aria-label={`Clip media ${c.media.src.split('/').pop()}`} onPointerDown={e => pick(e, `media:${c.id}`)} onKeyDown={e => keyboardMove(e, `media:${c.id}`)} onClick={() => {if (!suppressClick.current) p.onMedia(c.id); suppressClick.current = false;}}><strong>{c.media.src.split('/').pop()}</strong><small>{((c.endFrame - c.startFrame) / doc.fps).toFixed(2)}s</small></button>{(['start', 'end'] as const).map(edge => <button key={edge} className={`media-trim ${edge}`} aria-label={`${edge === 'start' ? 'Đầu' : 'Cuối'} clip ${c.media.src.split('/').pop()}`} disabled={p.busy || (c.media.kind === 'video' && p.sourceFrames[c.media.src] == null)} onPointerDown={e => trimStart(e, 'trim', {id: c.id, edge, startFrame: edge === 'start' ? c.startFrame : c.endFrame})} onKeyDown={e => {if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {e.preventDefault(); e.stopPropagation(); p.onChange(trimMediaClip(doc, c.id, edge, (edge === 'start' ? c.startFrame : c.endFrame) + (e.key === 'ArrowLeft' ? -1 : 1), c.media.kind === 'image' ? doc.totalFrames : p.sourceFrames[c.media.src]));}}}>│</button>)}</div>)}</div>
        <div className="caption-track">{doc.captions.map((c, i) => <button data-timeline-item={`caption:${i}`} aria-label={`Phụ đề ${i + 1}: ${c.text}`} key={i} className={chosen(`caption:${i}`)} style={{left: c.startMs / 1000 * pixels, width: Math.max(3, (c.endMs - c.startMs) / 1000 * pixels)}} onPointerDown={e => pick(e, `caption:${i}`)} onKeyDown={e => keyboardMove(e, `caption:${i}`)} onClick={() => {if (!suppressClick.current) p.onCaption(i); suppressClick.current = false;}} title={c.text}>{c.text}</button>)}</div>
        <div className="voice-track" style={{width: videoWidth}} onClick={p.onMusic}><span>VOICE · {doc.audio.voice}</span><svg viewBox="0 0 560 32" preserveAspectRatio="none" aria-label="Waveform giọng đọc">{p.waveform.map((value, i) => <rect key={i} x={i * 2} y={16 - value * 15} width="1.1" height={Math.max(1, value * 30)} fill="currentColor"/>)}</svg></div>
        <div className="music-lane"><button data-timeline-item="music" className={`music-track${chosen('music')}`} style={{marginLeft: (doc.audio.musicOffsetFrames ?? 0) / doc.fps * pixels, width: (doc.totalFrames - (doc.audio.musicOffsetFrames ?? 0)) / doc.fps * pixels}} onPointerDown={e => pick(e, 'music')} onKeyDown={e => keyboardMove(e, 'music')} onClick={() => {if (!suppressClick.current) p.onMusic(); suppressClick.current = false;}}>NHẠC NỀN · {doc.audio.music.split('/').pop()} · {Math.round(doc.audio.musicVolume * 100)}%</button></div>
        <div className="selection-lane">Quét từ vùng trống này lên các clip để chọn nhiều phần tử</div>
        {endFrame > doc.totalFrames && <div className="video-end" style={{left: videoWidth}}><span>Hết video</span></div>}
        <div className="playhead" style={{left: p.frame / doc.fps * pixels}}><span/></div>
        {box && <div className="selection-box" style={box}/>}
      </div>
    </div>
    <footer className="timeline-footer"><span>{doc.beats.length} cảnh · {(doc.totalFrames / doc.fps).toFixed(2)} giây · {doc.mediaClips?.length || 0} clip media</span><span>Kéo phần tử đã chọn để dời nhóm · ← → dịch 1 frame</span></footer>
  </section>;
}
