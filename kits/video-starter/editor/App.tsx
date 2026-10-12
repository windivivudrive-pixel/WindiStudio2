import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Player, type PlayerRef} from '@remotion/player';
import {EpisodeComposition} from 'virtual:windi-episode';
import {moveBoundary, editCaption, addMediaClip, resolveWindowTransform, patchWindowTransform, trimMediaClip, shiftTimelineItems} from './client-model.mjs';
import type {EditorDocument, EditorBeat} from './types';
import {Timeline} from './Timeline';
import {ContentOverlay} from './ContentTools';
import {LayoutInspector, LayoutOverlay, useLayoutItems} from './LayoutTools';
import './style.css';

type Asset = {src: string; kind: 'image' | 'video' | 'audio'};
type Job = {id: string; status: string; stage: string; progress: number; revision: number; error?: string; outputDir?: string};
type Project = {document: EditorDocument; baseline: EditorDocument; title: string; episodeRoot: string; assets: Asset[]; token: string; job: Job | null; draftWarning?: string};
const icons: Record<string, React.ReactNode> = {
  play: <path d="m8 5 11 7-11 7Z"/>, pause: <><path d="M8 5v14M16 5v14"/></>,
  undo: <><path d="m8 4-5 5 5 5M3 9h10a7 7 0 0 1 0 14"/></>, redo: <><path d="m16 4 5 5-5 5M21 9H11a7 7 0 0 0 0 14"/></>,
  save: <><path d="M5 3h12l4 4v14H3V3h2Zm2 0v6h10V3M7 21v-8h10v8"/></>,
  export: <><path d="M12 16V3m-5 5 5-5 5 5M4 14v7h16v-7"/></>,
  plus: <path d="M12 4v16M4 12h16"/>, prev: <><path d="M5 5v14m14-14L9 12l10 7Z"/></>, next: <><path d="M19 5v14M5 5l10 7-10 7Z"/></>,
  film: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4"/></>,
  audio: <><path d="M4 10v4M8 6v12M12 3v18M16 6v12M20 10v4"/></>, text: <path d="M4 5h16M12 5v15M8 20h8"/>,
  layout: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M10 9v12"/></>,
};
function Icon({name}: {name: string}) {return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>;}
const time = (frame: number, fps: number) => `${String(Math.floor(frame / fps / 60)).padStart(2, '0')}:${String(Math.floor(frame / fps) % 60).padStart(2, '0')}:${String(frame % fps).padStart(2, '0')}`;
const fingerprint = (doc: EditorDocument) => JSON.stringify({...doc, revision: 0});

function App() {
  const [project, setProject] = useState<Project | null>(null);
  const [doc, setDoc] = useState<EditorDocument | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(0);
  const [captionIndex, setCaptionIndex] = useState(0);
  const [tab, setTab] = useState<'layout' | 'scene' | 'caption' | 'audio' | 'content'>('layout');
  const [libraryTab, setLibraryTab] = useState<'media' | 'layout' | 'caption' | 'audio'>('media');
  const [frame, setFrame] = useState(0);
  const [layoutId, setLayoutId] = useState('headline');
  const [layoutScope, setLayoutScope] = useState<'scene' | 'all'>('scene');
  const [layoutMode, setLayoutMode] = useState(true);
  const [contentMode, setContentMode] = useState(false);
  const [contentScope, setContentScope] = useState<'scene' | 'all'>('scene');
  const [clipId, setClipId] = useState<string | null>(null);
  const [sourceFrames, setSourceFrames] = useState<Record<string, number>>({});
  const dropping = useRef(false);
  const assetGesture = useRef<{asset: Asset; x: number; y: number; moved: boolean} | null>(null);
  const suppressAssetClick = useRef(false);
  const [assetGhost, setAssetGhost] = useState<{src: string; x: number; y: number} | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const canvas = useRef<HTMLDivElement>(null);
  const layoutItems = useLayoutItems(canvas, doc, frame);
  const [playing, setPlaying] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [exportStarting, setExportStarting] = useState(false);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [musicFrames, setMusicFrames] = useState<number | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const undo = useRef<EditorDocument[]>([]), redo = useRef<EditorDocument[]>([]);
  const player = useRef<PlayerRef>(null), latest = useRef(doc);
  latest.current = doc;
  const dirty = doc ? fingerprint(doc) !== saved : false;
  const busy = exportStarting || job?.status === 'running';
  const api = useCallback(async (route: string, options: RequestInit = {}) => {
    const response = await fetch(`/api/editor/${route}`, {...options, headers: {'x-windi-editor-token': project?.token || '', ...options.headers}});
    const value = await response.json(); if (!response.ok) throw new Error(value.error || 'Thao tác chưa hoàn tất.'); return value;
  }, [project?.token]);

  useEffect(() => {fetch('/api/editor/project').then(async response => {const p = await response.json(); if (!response.ok) throw new Error(p.error); return p as Project;}).then(p => {
    setProject(p); setDoc(p.document); setSaved(fingerprint(p.document)); setJob(p.job); if (p.draftWarning) setNotice(p.draftWarning);
  }).catch(e => setError(e.message));}, []);

  useEffect(() => {
    if (!doc) return;
    let cancelled = false; const context = new AudioContext();
    fetch('/' + doc.audio.voice).then(r => r.arrayBuffer()).then(bytes => context.decodeAudioData(bytes)).then(audio => {
      const data = audio.getChannelData(0), bins = 280, size = Math.floor(data.length / bins);
      const values = Array.from({length: bins}, (_, i) => {let peak = 0; for (let j = i * size; j < (i + 1) * size; j += 40) peak = Math.max(peak, Math.abs(data[j])); return peak;});
      if (!cancelled) setWaveform(values);
    }).catch(() => {/* The voice remains playable even if browser decoding is unavailable. */}).finally(() => context.close());
    return () => {cancelled = true;};
  }, [doc?.audio.voice]);

  useEffect(() => {
    if (!doc) return;
    setMusicFrames(null);
    const audio = new Audio('/' + doc.audio.music);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {if (Number.isFinite(audio.duration)) setMusicFrames(Math.max(0, Math.floor(audio.duration * doc.fps) - 1));};
    return () => {audio.onloadedmetadata = null; audio.removeAttribute('src'); audio.load();};
  }, [doc?.audio.music, doc?.fps]);

  useEffect(() => {
    if (!project) return;
    const p = player.current; if (!p) return;
    const update = (e: {detail: {frame: number}}) => setFrame(e.detail.frame);
    const play = () => setPlaying(true), pause = () => setPlaying(false);
    p.addEventListener('frameupdate', update); p.addEventListener('play', play); p.addEventListener('pause', pause); p.addEventListener('ended', pause);
    return () => {p.removeEventListener('frameupdate', update); p.removeEventListener('play', play); p.removeEventListener('pause', pause); p.removeEventListener('ended', pause);};
  }, [project]);

  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {if (dirty || busy) {e.preventDefault(); e.returnValue = '';}};
    window.addEventListener('beforeunload', guard); return () => window.removeEventListener('beforeunload', guard);
  }, [dirty, busy]);

  useEffect(() => {
    if (job?.status !== 'running') return;
    let stopped = false;
    const poll = async () => {try {const result = await api('export'); if (!stopped) {setJob(result.job); if (result.job?.error) setError(result.job.error);}} catch (e) {if (!stopped) setError((e as Error).message);}};
    const timer = window.setInterval(poll, 1000); return () => {stopped = true; clearInterval(timer);};
  }, [job?.id, job?.status, api]);

  function change(next: EditorDocument) {
    if (busy || !latest.current || fingerprint(next) === fingerprint(latest.current)) return;
    undo.current.push(latest.current); if (undo.current.length > 100) undo.current.shift(); redo.current = [];
    setHistoryVersion(v => v + 1); latest.current = next; setDoc(next); setError(''); setNotice('');
  }
  function previewGesture(next: EditorDocument) {latest.current = next; setDoc(next);}
  function commitGesture(before: EditorDocument) {
    if (!latest.current || fingerprint(before) === fingerprint(latest.current)) return;
    undo.current.push(before); if (undo.current.length > 100) undo.current.shift(); redo.current = [];
    setHistoryVersion(v => v + 1); setError(''); setNotice('');
  }
  function travel(direction: 'undo' | 'redo') {
    const current = latest.current; if (!current || busy) return;
    const from = direction === 'undo' ? undo.current : redo.current, to = direction === 'undo' ? redo.current : undo.current;
    const next = from.pop(); if (!next) return; to.push(current); setDoc({...next, revision: current.revision}); setHistoryVersion(v => v + 1);
  }
  async function save() {
    const snapshot = latest.current; if (!snapshot || saving || busy) return;
    setSaving(true); setError('');
    try {const result = await api('draft', {method: 'PUT', body: JSON.stringify(snapshot)});
      setDoc(current => current ? {...current, revision: result.document.revision} : current); setSaved(fingerprint(result.document)); setNotice('Đã lưu draft trên máy.');
    } catch (e) {setError((e as Error).message);} finally {setSaving(false);}
  }
  async function exportVideo() {
    if (!latest.current || busy || saving) return;
    setExportStarting(true); setError(''); player.current?.pause();
    try {const result = await api('export', {method: 'POST', body: JSON.stringify({document: latest.current, coverFrame: frame})});
      setDoc(result.document); setSaved(fingerprint(result.document)); setJob(result.job);
    } catch (e) {setError((e as Error).message);} finally {setExportStarting(false);}
  }
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches('input, textarea, select, [contenteditable]')) return;
      if (e.code === 'Space') {e.preventDefault(); player.current?.toggle();}
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {e.preventDefault(); const d = latest.current; if (d) player.current?.seekTo(Math.max(0, Math.min(d.totalFrames - 1, (player.current?.getCurrentFrame() || 0) + (e.key === 'ArrowLeft' ? -1 : 1))));}
      if (e.metaKey || e.ctrlKey) {
        if (e.key.toLowerCase() === 's') {e.preventDefault(); void save();}
        if (e.key.toLowerCase() === 'z') {e.preventDefault(); travel(e.shiftKey ? 'redo' : 'undo');}
      }
    };
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  });

  useEffect(() => {
    const sources = [...new Set(doc?.mediaClips?.map(c => c.media.src) || [])].filter(src => sourceFrames[src] == null);
    let stopped = false;
    void Promise.all(sources.map(async src => {try {const info = await api(`media-info?src=${encodeURIComponent(src)}`); if (!stopped) setSourceFrames(current => ({...current, [src]: info.durationInFrames}));} catch (e) {if (!stopped) setError((e as Error).message);}}));
    return () => {stopped = true;};
  }, [doc?.mediaClips, sourceFrames, api]);

  const inputProps = useMemo(() => ({editor: doc || undefined}), [doc]);
  if (!doc || !project) return <main className="loading"><div className="wordmark">windi<span> / timeline</span></div><p role={error ? 'alert' : 'status'}>{error || 'Đang mở bản dựng…'}</p></main>;
  const beat = doc.beats[selected];
  const caption = doc.captions[captionIndex];
  const activeIndex = Math.max(0, doc.beats.findIndex(b => frame >= b.startFrame && frame < b.endFrame));
  const windowTransform = resolveWindowTransform(doc, activeIndex);
  const activeClip = doc.mediaClips?.find(c => frame >= c.startFrame && frame < c.endFrame);
  const inspectedClip = doc.mediaClips?.find(c => c.id === clipId);
  const contentBeat = doc.beats[activeIndex];
  const patchBeat = (patch: Partial<EditorBeat>) => change({...doc, beats: doc.beats.map((b, i) => i === selected ? {...b, ...patch} : b)});
  const mediaPatch = (patch: Partial<NonNullable<EditorBeat['media']>>) => {if (beat.media) patchBeat({media: {...beat.media, ...patch}});};
  const selectBeat = (i: number, seek = true) => {setSelected(i); setClipId(null); setTab('scene'); if (seek) {player.current?.pause(); player.current?.seekTo(doc.beats[i].startFrame);}};
  const defaultMedia = (asset: Asset): NonNullable<EditorBeat['media']> => ({...asset, kind: asset.kind === 'video' ? 'video' : 'image', trimBefore: 0, fit: 'contain', zoom: 1, x: 50, y: 50, volume: 0});
  async function importMedia(file?: File): Promise<Asset | undefined> {
    if (!file) return; setError(''); setNotice('Đang nhập media…');
    try {const result = await api(`media?name=${encodeURIComponent(file.name)}`, {method: 'POST', body: file});
      setProject(current => current ? {...current, assets: [...current.assets, result.asset]} : current);
      if (result.asset.kind === 'audio' && latest.current) {change({...latest.current, audio: {...latest.current.audio, music: result.asset.src, musicTrimBefore: 0}}); setNotice('Đã chọn file nhạc vừa nhập.');}
      else setNotice('Đã nhập file. Kéo vào timeline hoặc chọn để thay hình trong cảnh.');
      return result.asset;
    } catch (e) {setError((e as Error).message); setNotice('');}
  }
  async function addTimelineAsset(asset: Asset, at: number) {
    if (busy || dropping.current) return;
    if (asset.kind === 'audio') {setError('Track Media cửa sổ chỉ nhận video hoặc ảnh. Chọn nhạc ở tab Âm thanh.'); return;}
    dropping.current = true; setError(''); setNotice('Đang đọc clip…');
    try {
      const info = await api(`media-info?src=${encodeURIComponent(asset.src)}`);
      setSourceFrames(current => ({...current, [asset.src]: info.durationInFrames}));
      const snapshot = latest.current; if (!snapshot) return;
      const id = crypto.randomUUID();
      change(addMediaClip(snapshot, defaultMedia(asset), at, info.durationInFrames, id));
      setClipId(id); setTab('content'); setContentMode(true); player.current?.pause(); player.current?.seekTo(at);
      setNotice('Đã thêm clip vào track Media cửa sổ. Kéo clip để dời thời gian, kéo hai đầu để cắt.');
    } catch (e) {setError((e as Error).message); setNotice('');} finally {dropping.current = false;}
  }
  const replaceWindowSource = async (src: string) => {
    const media = src ? defaultMedia(project.assets.find(a => a.src === src)!) : undefined;
    const target = inspectedClip || activeClip;
    if (target) {
      if (!media) {change({...doc, mediaClips: doc.mediaClips?.filter(c => c.id !== target.id)}); setClipId(null);}
      else {
        try {
          const info = await api(`media-info?src=${encodeURIComponent(media.src)}`);
          setSourceFrames(current => ({...current, [media.src]: info.durationInFrames}));
          const snapshot = latest.current; if (!snapshot) return;
          change({...snapshot, mediaClips: snapshot.mediaClips?.map(c => c.id === target.id ? {...c, media, endFrame: media.kind === 'video' ? Math.min(c.endFrame, c.startFrame + info.durationInFrames) : c.endFrame} : c)});
        } catch (e) {setError((e as Error).message);}
      }
    } else change({...doc, beats: doc.beats.map((b, i) => i === activeIndex ? {...b, media} : b)});
  };
  function moveAsset(e: React.PointerEvent) {
    const g = assetGesture.current; if (!g) return;
    if (!g.moved && Math.hypot(e.clientX - g.x, e.clientY - g.y) < 6) return;
    g.moved = true; suppressAssetClick.current = true;
    setAssetGhost({src: g.asset.src, x: e.clientX, y: e.clientY});
  }
  function finishAsset(e: React.PointerEvent) {
    const g = assetGesture.current; assetGesture.current = null; setAssetGhost(null);
    if (!g?.moved) return;
    const track = document.querySelector<HTMLElement>('.tracks'), viewport = document.querySelector('.timeline-scroll');
    if (!track || !viewport) return;
    const r = track.getBoundingClientRect(), v = viewport.getBoundingClientRect();
    if (e.clientX >= Math.max(r.left, v.left) && e.clientX <= Math.min(r.right, v.right) && e.clientY >= Math.max(r.top, v.top) && e.clientY <= Math.min(r.bottom, v.bottom)) {
      void addTimelineAsset(g.asset, Math.max(0, Math.min(doc!.totalFrames - 1, Math.round((e.clientX - r.left) / Number(track.dataset.timelinePixels) * doc!.fps))));
    }
  }
  const statusLabels: Record<string, string> = {starting: 'Chuẩn bị', bundle: 'Chuẩn bị bản dựng', render: 'Render MP4', cover: 'Tạo ảnh bìa', qa: 'Kiểm tra MP4', complete: 'Xuất xong'};
  return <main className="editor" data-history={historyVersion}>
    <header className="topbar">
      <div className="wordmark">windi<span> / timeline</span><small>BẢN THỬ NGHIỆM</small></div>
      <div className="project-title"><strong>{project.title}</strong><span>{project.document.episodeId}</span></div>
      <span className={`save-state ${dirty ? 'unsaved' : ''}`}>{dirty ? '● Chưa lưu' : '● Đã lưu'}</span>
      <button onClick={save} disabled={saving || busy || !dirty}><Icon name="save"/>{saving ? 'Đang lưu…' : 'Lưu draft'}</button>
      <button className="primary" onClick={exportVideo} disabled={busy || saving}><Icon name="export"/>{busy ? 'Đang xuất…' : 'Xuất video'}</button>
    </header>
    {(error || notice) && <div className={`message ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>{error || notice}<button aria-label="Đóng thông báo" onClick={() => {setError(''); setNotice('');}}>×</button></div>}
    <section className="workspace">
      <aside className="library">
        <nav className="library-tabs" aria-label="Thư viện chỉnh sửa">{([
          ['media', 'film', 'Media'], ['audio', 'audio', 'Âm thanh'], ['caption', 'text', 'Phụ đề'], ['layout', 'layout', 'Bố cục'],
        ] as const).map(([id, icon, label]) => <button key={id} aria-pressed={libraryTab === id} onClick={() => {setLibraryTab(id); if (id !== 'media') setTab(id); if (id === 'layout') setLayoutMode(true);}}><Icon name={icon}/><span>{label}</span></button>)}</nav>
        <div className="library-content">
        {libraryTab === 'layout' && <><div className="panel-heading"><h2>Các khối layout</h2><span>{layoutItems.length} khối</span></div>
        <p className="hint">Chọn một khối để chỉnh vị trí và kích thước trực tiếp trên hình.</p>
        <div className="layer-list">{layoutItems.map(item => <button key={item.id} className={layoutId === item.id && tab === 'layout' ? 'chosen' : ''} onClick={() => {setLayoutId(item.id); setTab('layout'); setLayoutMode(true); setContentMode(false); player.current?.pause();}}><Icon name={item.mode === 'scale' ? 'film' : 'text'}/><span>{item.label}</span><small>{doc.beats[activeIndex].layout?.[item.id] ? 'CẢNH' : doc.layout?.[item.id] ? 'CHUNG' : ''}</small></button>)}</div><div className="divider"/></>}
        {libraryTab === 'media' && <>
        <div className="panel-heading"><h2>Media của tập</h2><span>{project.assets.filter(a => a.kind !== 'audio').length} file</span></div>
        <label className={`import-button ${busy ? 'disabled' : ''}`}><Icon name="plus"/>Nhập ảnh / clip<input type="file" disabled={busy} accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm" onChange={e => {void importMedia(e.target.files?.[0]); e.target.value = '';}}/></label>
        <p className="hint">Kéo video / ảnh vào timeline. Click để thay hình của cảnh đang chọn.</p>
        <div className="asset-grid">{project.assets.filter(a => a.kind !== 'audio').map(asset => <button key={asset.src} className={`asset ${beat.media?.src === asset.src ? 'chosen' : ''}`} disabled={busy} draggable={false} onDragStart={e => e.preventDefault()} onPointerDown={e => {if (e.button !== 0 || busy) return; suppressAssetClick.current = false; assetGesture.current = {asset, x: e.clientX, y: e.clientY, moved: false}; e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={moveAsset} onPointerUp={finishAsset} onPointerCancel={() => {assetGesture.current = null; setAssetGhost(null);}} onClick={() => {if (suppressAssetClick.current) {suppressAssetClick.current = false; return;} patchBeat({media: defaultMedia(asset)}); player.current?.seekTo(beat.startFrame + 5);}} title={asset.src}>
          {asset.kind === 'image' ? <img src={'/' + asset.src} alt=""/> : <video src={'/' + asset.src + '#t=0.1'} muted preload="metadata"/>}
          <span>{asset.src.split('/').pop()}</span><small>{asset.kind === 'image' ? 'ẢNH' : 'CLIP'}</small>
        </button>)}</div>
        <div className="library-note"><Icon name="film"/><p>Nội dung gốc vẫn có trong lựa chọn <strong>Bản dựng gốc</strong>.</p></div>
        </>}
        {libraryTab === 'audio' && <><div className="panel-heading"><h2>Nhạc của tập</h2><span>{project.assets.filter(a => a.kind === 'audio').length} file</span></div>
          <label className={`import-button ${busy ? 'disabled' : ''}`}><Icon name="plus"/>Nhập nhạc<input type="file" disabled={busy} accept=".mp3,.wav,.m4a,.aac,.ogg" onChange={e => {void importMedia(e.target.files?.[0]); e.target.value = '';}}/></label>
          <p className="hint">Chọn file làm nhạc nền. Chỉnh âm lượng và điểm cắt ở bảng thuộc tính.</p>
          <div className="audio-assets">{project.assets.filter(a => a.kind === 'audio').map(asset => <button key={asset.src} disabled={busy} aria-pressed={doc.audio.music === asset.src} onClick={() => {change({...doc, audio: {...doc.audio, music: asset.src, musicTrimBefore: 0}}); setTab('audio');}}><Icon name="audio"/><span>{asset.src.split('/').pop()}</span><small>{doc.audio.music === asset.src ? 'Đang dùng' : 'Chọn nhạc'}</small></button>)}</div>
        </>}
        {libraryTab === 'caption' && <><div className="panel-heading"><h2>Phụ đề của tập</h2><span>{doc.captions.length} đoạn</span></div><p className="hint">Chọn một đoạn để tua đến và sửa nội dung ở bảng thuộc tính.</p><div className="caption-list">{doc.captions.map((c, i) => <button key={i} aria-pressed={captionIndex === i} onClick={() => {setCaptionIndex(i); setTab('caption'); player.current?.pause(); player.current?.seekTo(Math.round(c.startMs / 1000 * doc.fps));}}><small>{time(Math.round(c.startMs / 1000 * doc.fps), doc.fps)}</small><span>{c.text}</span></button>)}</div></>}
        </div>
      </aside>
      <section className="preview-panel" aria-label="Xem trước video">
        <div className="preview-heading"><h2>Trình phát</h2><span>9:16 · 1080 × 1920 · {doc.fps} fps</span></div>
        <div className="preview-mode"><button aria-pressed={layoutMode} onClick={() => {setLayoutMode(v => !v); setContentMode(false); player.current?.pause();}}>✥ {layoutMode ? 'Đang chỉnh layout' : 'Bật chỉnh layout'}</button><button aria-pressed={contentMode} onClick={() => {setContentMode(v => !v); setLayoutMode(false); setTab('content'); player.current?.pause();}}>Căn nội dung</button><label className="preview-zoom">Preview<select aria-label="Zoom preview" value={previewZoom} onChange={e => setPreviewZoom(Number(e.target.value))}><option value="1">Vừa khung</option><option value="1.5">150%</option><option value="2">200%</option><option value="3">300%</option></select></label></div>
        <div className="preview-stage"><div className="preview-canvas" ref={canvas} style={{'--preview-zoom': previewZoom} as React.CSSProperties}><Player ref={player} component={EpisodeComposition} inputProps={inputProps} durationInFrames={doc.totalFrames} compositionWidth={1080} compositionHeight={1920} fps={doc.fps} style={{height: '100%', width: '100%'}} controls={false} clickToPlay={false} acknowledgeRemotionLicense errorFallback={({error: e}) => <div className="preview-error">Không phát được media: {e.message}</div>}/>
          <LayoutOverlay items={layoutItems} selected={layoutId} enabled={layoutMode && !contentMode && !playing && !busy} doc={doc} index={activeIndex} scope={layoutScope} onSelect={id => {setLayoutId(id); setContentMode(false); setTab('layout'); setSelected(activeIndex);}} onPause={() => player.current?.pause()} onPreview={previewGesture} onCommit={commitGesture}/>
          <ContentOverlay canvas={canvas} doc={doc} frame={frame} index={activeIndex} scope={contentScope} enabled={contentMode && !playing && !busy} onPreview={previewGesture} onCommit={commitGesture}/>
        </div></div>
        <div className="transport"><button aria-label="Frame trước" onClick={() => player.current?.seekTo(Math.max(0, frame - 1))}><Icon name="prev"/></button>
          <button className="play-button" aria-label={playing ? 'Tạm dừng' : 'Phát video'} onClick={() => player.current?.toggle()}><Icon name={playing ? 'pause' : 'play'}/></button>
          <button aria-label="Frame sau" onClick={() => player.current?.seekTo(Math.min(doc.totalFrames - 1, frame + 1))}><Icon name="next"/></button>
          <output>{time(frame, doc.fps)} <span>/ {time(doc.totalFrames, doc.fps)}</span></output>
          <span className="preview-beat">Cảnh {String(activeIndex + 1).padStart(2, '0')}</span>
        </div>
        <p className="preview-help">Space để phát · ← → từng frame · ⌘Z hoàn tác · Chưa xuất MP4</p>
      </section>
      <aside className="inspector">
        <div className="inspector-heading"><h2>Thuộc tính</h2><span>Cảnh {String((tab === 'layout' || tab === 'content' ? activeIndex : selected) + 1).padStart(2, '0')}</span></div>
        <nav className="tabs" aria-label="Thuộc tính"><button aria-pressed={tab === 'content'} onClick={() => {setTab('content'); setContentMode(true); setLayoutMode(false);}}>Nội dung</button><button aria-pressed={tab === 'layout'} onClick={() => {setTab('layout'); setLayoutMode(true); setContentMode(false);}}>Layout</button><button aria-pressed={tab === 'scene'} onClick={() => setTab('scene')}>Cảnh</button><button aria-pressed={tab === 'caption'} onClick={() => setTab('caption')}>Phụ đề</button><button aria-pressed={tab === 'audio'} onClick={() => setTab('audio')}>Âm thanh</button></nav>
        <fieldset disabled={busy}>
        {tab === 'content' && <>
          <div className="panel-heading"><h2>Nội dung trong cửa sổ</h2><span>Cảnh {activeIndex + 1}</span></div>
          <label>Nguồn hình<select aria-label="Nguồn nội dung cửa sổ" value={(inspectedClip || activeClip)?.media.src || contentBeat.media?.src || ''} onChange={e => void replaceWindowSource(e.target.value)}><option value="">Bản dựng gốc</option>{project.assets.filter(a => a.kind !== 'audio').map(a => <option key={a.src} value={a.src}>{a.src.split('/').pop()}</option>)}</select></label>
          {inspectedClip && <>
            <h3>Clip trên timeline</h3>
            <div className="two-fields"><label>Bắt đầu (s)<input aria-label="Bắt đầu clip media" type="number" min="0" max={(doc.totalFrames - 1) / doc.fps} step="any" value={Number((inspectedClip.startFrame / doc.fps).toFixed(3))} onChange={e => {if (e.target.value !== '' && e.currentTarget.validity.valid) {const next = shiftTimelineItems(doc, [`media:${inspectedClip.id}`], Math.round(Number(e.target.value) * doc.fps) - inspectedClip.startFrame); change(next); player.current?.seekTo(next.mediaClips!.find(c => c.id === inspectedClip.id)!.startFrame);}}}/></label><label>Kết thúc (s)<input aria-label="Kết thúc clip media" type="number" min={(inspectedClip.startFrame + 1) / doc.fps} max={doc.totalFrames / doc.fps} step="any" value={Number((inspectedClip.endFrame / doc.fps).toFixed(3))} onChange={e => {if (e.target.value !== '' && e.currentTarget.validity.valid) change(trimMediaClip(doc, inspectedClip.id, 'end', Number(e.target.value) * doc.fps, inspectedClip.media.kind === 'video' ? sourceFrames[inspectedClip.media.src] : doc.totalFrames));}}/></label></div>
            <label>Cách đặt clip<select aria-label="Cách đặt clip media" value={inspectedClip.media.fit} onChange={e => change({...doc, mediaClips: doc.mediaClips?.map(c => c.id === inspectedClip.id ? {...c, media: {...c.media, fit: e.target.value as 'contain' | 'cover'}} : c)})}><option value="contain">Vừa khung</option><option value="cover">Lấp khung</option></select></label>
            {inspectedClip.media.kind === 'video' && <label>Cắt đầu file (s)<input aria-label="Cắt đầu file clip media" type="number" disabled={sourceFrames[inspectedClip.media.src] == null} min="0" max={Math.max(0, (sourceFrames[inspectedClip.media.src] ?? 10000000) - (inspectedClip.endFrame - inspectedClip.startFrame)) / doc.fps} step="any" value={Number((inspectedClip.media.trimBefore / doc.fps).toFixed(3))} onChange={e => {if (e.target.value !== '' && e.currentTarget.validity.valid) change({...doc, mediaClips: doc.mediaClips?.map(c => c.id === inspectedClip.id ? {...c, media: {...c.media, trimBefore: Math.round(Number(e.target.value) * doc.fps)}} : c)});}}/></label>}
            {inspectedClip.media.kind === 'video' && <label>Âm lượng clip <output>{Math.round(inspectedClip.media.volume * 100)}%</output><input aria-label="Âm lượng clip media" type="range" min="0" max="1" step="0.01" value={inspectedClip.media.volume} onChange={e => change({...doc, mediaClips: doc.mediaClips?.map(c => c.id === inspectedClip.id ? {...c, media: {...c.media, volume: Number(e.target.value)}} : c)})}/></label>}
            <button onClick={() => {change({...doc, mediaClips: doc.mediaClips?.filter(c => c.id !== inspectedClip.id)}); setClipId(null);}}>Xóa clip khỏi timeline</button><div className="divider"/>
          </>}
          <label>Áp dụng vị trí<select aria-label="Phạm vi nội dung cửa sổ" value={contentScope} onChange={e => setContentScope(e.target.value as 'scene' | 'all')}><option value="scene">Cảnh {activeIndex + 1}</option><option value="all">Toàn video</option></select></label>
          <div className="two-fields">{(['x', 'y'] as const).map(key => <label key={key}>{key === 'x' ? 'Ngang (%)' : 'Dọc (%)'}<input aria-label={`Nội dung ${key.toUpperCase()}`} type="number" min="-100" max="100" step="0.01" value={windowTransform[key]} onChange={e => {if (e.target.value !== '' && e.currentTarget.validity.valid) change(patchWindowTransform(doc, activeIndex, {[key]: Number(e.target.value)}, contentScope));}}/></label>)}</div>
          <label>Thu phóng nội dung <output>{windowTransform.scale.toFixed(2)}×</output><input aria-label="Zoom nội dung cửa sổ" type="range" min="0.1" max="6" step="0.01" value={windowTransform.scale} onChange={e => change(patchWindowTransform(doc, activeIndex, {scale: Number(e.target.value)}, contentScope))}/></label>
          <button className="reset-layout" onClick={() => change(patchWindowTransform(doc, activeIndex, null, contentScope))}>Đặt lại vị trí nội dung</button>
          <p className="hint">Bật Căn nội dung rồi kéo bên trong cửa sổ. Thao tác này dịch hình bên trong, giữ nguyên khung retro. Phím mũi tên dịch 1%; Shift dịch 5%.</p>
        </>}
        {tab === 'layout' && <LayoutInspector items={layoutItems} selected={layoutId} onSelect={setLayoutId} scope={layoutScope} onScope={setLayoutScope} doc={doc} index={activeIndex} onChange={change}/>}
        {tab === 'scene' && <>
          <div className="panel-heading"><h2>Cảnh {String(selected + 1).padStart(2, '0')}</h2><span>{((beat.endFrame - beat.startFrame) / doc.fps).toFixed(2)}s</span></div>
          <label>Chọn cảnh<select value={selected} onChange={e => selectBeat(Number(e.target.value))}>{doc.beats.map((b, i) => <option key={b.id} value={i}>{i + 1}. {b.name || b.category}</option>)}</select></label>
          <label>Tiêu đề cảnh<textarea value={beat.headline} maxLength={250} onChange={e => patchBeat({headline: e.target.value})} rows={3}/></label>
          <label>Nhãn nội dung<input value={beat.category} maxLength={250} onChange={e => patchBeat({category: e.target.value})}/></label>
          <label>Dòng nhấn<input value={beat.spokenPill} maxLength={250} onChange={e => patchBeat({spokenPill: e.target.value})}/></label>
          {beat.accentColor && <label className="inline-label">Màu nhấn<input aria-label="Màu nhấn" type="color" value={beat.accentColor} onChange={e => patchBeat({accentColor: e.target.value})}/></label>}
          <div className="divider"/>
          <h3>Timing cảnh</h3><div className="two-fields"><label>Bắt đầu (s)<input aria-label="Bắt đầu cảnh" type="number" step={1 / doc.fps} value={Number((beat.startFrame / doc.fps).toFixed(3))} disabled={selected === 0} onChange={e => {if (e.target.value !== '') change(moveBoundary(doc, selected, Number(e.target.value) * doc.fps));}}/></label><label>Kết thúc (s)<input aria-label="Kết thúc cảnh" type="number" step={1 / doc.fps} value={Number((beat.endFrame / doc.fps).toFixed(3))} disabled={selected === doc.beats.length - 1} onChange={e => {if (e.target.value !== '') change(moveBoundary(doc, selected + 1, Number(e.target.value) * doc.fps));}}/></label></div>
          <p className="hint">Kéo biên trên timeline để đổi điểm chuyển cảnh. Voice và tổng thời lượng giữ nguyên.</p>
          <div className="divider"/>
          {selected > 0 && <><label>Hiệu ứng vào cảnh<select value={beat.transition?.type ?? 'none'} onChange={e => patchBeat({transition: {type: e.target.value as 'none' | 'fade' | 'scan', durationInFrames: beat.transition?.durationInFrames ?? 12}})}><option value="none">Cắt thẳng</option><option value="fade">Mờ qua nền tối</option><option value="scan">Quét retro</option></select></label>
          {beat.transition && beat.transition.type !== 'none' && <label>Thời lượng hiệu ứng (s)<input aria-label="Thời lượng chuyển cảnh" type="number" min={2 / doc.fps} max={60 / doc.fps} step={1 / doc.fps} value={Number((beat.transition.durationInFrames / doc.fps).toFixed(3))} onChange={e => {if (e.target.value !== '' && e.currentTarget.validity.valid) patchBeat({transition: {...beat.transition!, durationInFrames: Math.max(2, Math.min(60, Math.round(Number(e.target.value) * doc.fps)))}});}}/></label>}
          <p className="hint">Hiệu ứng phủ tại điểm cắt, giữ nguyên nhịp voice.</p></>}
          <label>Hình trong cửa sổ<select aria-label="Media cảnh" value={beat.media?.src || ''} onChange={e => patchBeat({media: e.target.value ? defaultMedia(project.assets.find(a => a.src === e.target.value)!) : undefined})}><option value="">Bản dựng gốc</option>{project.assets.filter(a => a.kind !== 'audio').map(a => <option value={a.src} key={a.src}>{a.src.split('/').pop()}</option>)}</select></label>
          {beat.media && <><label>Cách đặt hình<select value={beat.media.fit} onChange={e => mediaPatch({fit: e.target.value as 'cover' | 'contain'})}><option value="contain">Vừa khung · giữ trọn hình</option><option value="cover">Lấp khung · có crop</option></select></label>
            <label>Zoom <output>{beat.media.zoom.toFixed(2)}×</output><input type="range" min="1" max="3" step="0.01" value={beat.media.zoom} onChange={e => mediaPatch({zoom: Number(e.target.value)})}/></label>
            <label>Vị trí ngang<input type="range" min="0" max="100" value={beat.media.x} onChange={e => mediaPatch({x: Number(e.target.value)})}/></label><label>Vị trí dọc<input type="range" min="0" max="100" value={beat.media.y} onChange={e => mediaPatch({y: Number(e.target.value)})}/></label>
            {beat.media.kind === 'video' && <><label>Cắt đầu clip (s)<input type="number" min="0" step={1 / doc.fps} value={Number((beat.media.trimBefore / doc.fps).toFixed(3))} onChange={e => mediaPatch({trimBefore: Math.max(0, Math.round(Number(e.target.value) * doc.fps))})}/></label><label>Âm lượng clip <output>{Math.round(beat.media.volume * 100)}%</output><input type="range" min="0" max="1" step="0.01" value={beat.media.volume} onChange={e => mediaPatch({volume: Number(e.target.value)})}/></label></>}
          </>}
        </>}
        {tab === 'caption' && <>
          <div className="panel-heading"><h2>Phụ đề karaoke</h2><span>{doc.captions.length} đoạn</span></div>
          <label>Chọn đoạn<select value={captionIndex} onChange={e => {const i = Number(e.target.value); setCaptionIndex(i); player.current?.seekTo(Math.round(doc.captions[i].startMs / 1000 * doc.fps));}}>{doc.captions.map((c, i) => <option value={i} key={i}>{(c.startMs / 1000).toFixed(1)}s · {c.text}</option>)}</select></label>
          {caption && <><label>Nội dung<textarea aria-label="Nội dung phụ đề" rows={4} maxLength={500} value={caption.text} onChange={e => change({...doc, captions: doc.captions.map((c, i) => i === captionIndex ? editCaption(c, e.target.value) : c)})}/></label><p className="hint">{(caption.startMs / 1000).toFixed(2)}–{(caption.endMs / 1000).toFixed(2)}s. Sửa cùng số từ giữ mốc karaoke. Thêm/bớt từ sẽ chia lại mốc trong đoạn này.</p></>}
          <p className="locked-note">Sửa phụ đề chỉ đổi chữ trên hình. Muốn đổi lời đọc cần tạo lại voice trong workflow.</p>
        </>}
        {tab === 'audio' && <>
          <div className="panel-heading"><h2>Âm thanh</h2><Icon name="audio"/></div>
          <label>File nhạc nền<select aria-label="File nhạc nền" value={doc.audio.music} onChange={e => change({...doc, audio: {...doc.audio, music: e.target.value, musicTrimBefore: 0}})}>{project.assets.filter(a => a.kind === 'audio').map(a => <option key={a.src} value={a.src}>{a.src.split('/').pop()}</option>)}</select></label>
          <label className="import-button">+ Nhập nhạc từ máy<input aria-label="Nhập nhạc nền" type="file" accept=".mp3,.wav,.m4a,.aac,.ogg" onChange={e => {void importMedia(e.target.files?.[0]); e.target.value = '';}}/></label>
          <p className="hint">Nhạc được lặp từ điểm cắt đầu đến hết video.</p>
          <div className="audio-timing">{(['musicTrimBefore', 'musicOffsetFrames', 'musicFadeInFrames', 'musicFadeOutFrames'] as const).map((key, i) => <label key={key}>{['Cắt đầu file nhạc (s)', 'Bắt đầu trên timeline (s)', 'Fade vào (s)', 'Fade ra (s)'][i]}<input type="number" min="0" max={key === 'musicTrimBefore' ? (musicFrames ?? 10000000) / doc.fps : (doc.totalFrames - 1) / doc.fps} step={1 / doc.fps} value={Number(((doc.audio[key] ?? 0) / doc.fps).toFixed(3))} onChange={e => {if (e.target.value !== '' && e.currentTarget.validity.valid) change({...doc, audio: {...doc.audio, [key]: Math.round(Number(e.target.value) * doc.fps)}});}}/></label>)}</div>
          <div className="divider"/>
          {(['voiceVolume', 'musicVolume', 'sfxVolume'] as const).map((key, i) => <label key={key}>{['Voice', 'Nhạc nền', 'Hiệu ứng chuyển cảnh'][i]}<output>{Math.round(doc.audio[key] * 100)}%</output><input type="range" min="0" max="1" step="0.01" value={doc.audio[key]} onChange={e => change({...doc, audio: {...doc.audio, [key]: Number(e.target.value)}})}/></label>)}
          <p className="locked-note">Voice và word timestamps dùng lại từ bản dựng. Chỉnh hình không phát sinh lần tạo voice mới.</p>
        </>}
        </fieldset>
      </aside>
    </section>
    <Timeline doc={doc} frame={frame} selected={selected} busy={!!busy} waveform={waveform} canUndo={!!undo.current.length} canRedo={!!redo.current.length} onTravel={travel}
      onChange={change} onPreview={previewGesture} onCommit={commitGesture} onPause={() => player.current?.pause()} onSeek={at => player.current?.seekTo(at)} onScene={selectBeat}
      onCaption={i => {setCaptionIndex(i); setTab('caption'); player.current?.pause(); player.current?.seekTo(Math.min(doc.totalFrames - 1, Math.round(doc.captions[i].startMs / 1000 * doc.fps)));}}
      onMedia={id => {const clip = doc.mediaClips?.find(c => c.id === id); if (clip) {setClipId(id); setTab('content'); setContentMode(true); setLayoutMode(false); player.current?.pause(); player.current?.seekTo(clip.startFrame);}}}
      onMusic={() => setTab('audio')} onCaptionLayout={() => {setLayoutId('captions'); setLayoutScope('all'); setTab('layout'); setLayoutMode(true); setContentMode(false);}}
      onDropAsset={async (src, at) => {const asset = project.assets.find(a => a.src === src); if (asset) await addTimelineAsset(asset, at);}}
      onDropFile={async (file, at) => {if (!/\.(mp4|mov|webm|png|jpe?g|webp)$/i.test(file.name)) {setError('Thả file video hoặc ảnh vào track media.'); return;} const asset = await importMedia(file); if (asset) await addTimelineAsset(asset, at);}}
      sourceFrames={sourceFrames} icon={name => <Icon name={name}/>}/>
    {assetGhost && <div className="asset-drag-ghost" style={{left: assetGhost.x + 12, top: assetGhost.y + 12}}>+ {assetGhost.src.split('/').pop()}</div>}
    {job && <div className={`export-panel ${job.status}`} role="status"><div><strong>{job.status === 'failed' ? 'Xuất chưa hoàn tất' : job.status === 'cancelled' ? 'Đã dừng xuất' : job.status === 'complete' && job.revision !== doc.revision ? 'Bản xuất trước' : statusLabels[job.stage] || job.stage}</strong><span>Bản draft r{job.revision} {job.status === 'running' ? `· ${Math.round(job.progress * 100)}%` : ''}</span></div>
      {job.status === 'running' && <><progress value={job.progress} max="1"/><button disabled={job.stage !== 'render'} onClick={async () => {try {setJob((await api('cancel', {method: 'POST'})).job);} catch (e) {setError((e as Error).message);}}}>Dừng xuất</button></>}
      {job.status === 'complete' && <><a className="download" href="/api/editor/download?file=final.mp4">Tải MP4</a><a href="/api/editor/download?file=cover.png">Ảnh bìa</a><a href="/api/editor/download?file=captions.srt">SRT</a><span className="export-note" title={job.outputDir}>Đã lưu trên máy · cần xem/nghe MP4 để duyệt QA</span></>}
      {job.status !== 'running' && <button aria-label="Đóng kết quả xuất" onClick={() => setJob(null)}>×</button>}
    </div>}
  </main>;
}

createRoot(document.getElementById('root')!).render(<App/>);
