import React, {useLayoutEffect, useRef, useState, type RefObject} from 'react';
import {patchLayout, resolveLayout} from './client-model.mjs';
import type {EditorDocument, LayoutSpec, LayoutValues} from './types';

export type LayoutItem = LayoutSpec & {rect: {left: number; top: number; width: number; height: number}; values: LayoutValues & {x: number; y: number; width: number; height: number}};
export function useLayoutItems(canvas: RefObject<HTMLDivElement | null>, doc: EditorDocument | null, frame: number) {
  const [items, setItems] = useState<LayoutItem[]>([]);
  useLayoutEffect(() => {
    const root = canvas.current;
    if (!root || !doc) return;
    const measure = () => {
      const bounds = root.getBoundingClientRect(), scale = bounds.width / 1080;
      if (!scale) return;
      const index = Math.max(0, doc.beats.findIndex(b => frame >= b.startFrame && frame < b.endFrame));
      const next = Array.from(root.querySelectorAll<HTMLElement>('[data-windi-spec]')).map(node => {
        const spec: LayoutSpec = JSON.parse(node.dataset.windiSpec!);
        const child = Array.from(node.children).find(c => c.tagName !== 'STYLE');
        const b = child?.getBoundingClientRect();
        const overrides = resolveLayout(doc, index, spec.id);
        const textNode = spec.mode === 'caption' ? child?.firstElementChild : child;
        const fontSize = textNode ? parseFloat(getComputedStyle(textNode).fontSize) : spec.fontSize;
        const width = b?.width ? b.width / scale : spec.width, height = b?.height ? b.height / scale : spec.height;
        return {...spec, values: {...spec, width, height, ...(spec.fontSize && fontSize ? {fontSize} : {}), ...overrides}, rect: b?.width ? {left: b.left - bounds.left, top: b.top - bounds.top, width: b.width, height: b.height} : {left: (overrides.x ?? spec.x) * scale, top: (overrides.y ?? spec.y) * scale, width: (overrides.width ?? spec.width) * scale, height: (overrides.height ?? spec.height) * scale}};
      });
      setItems(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(root);
    // Player updates its scale after its container resize. Observe that update
    // too, so hit boxes and numeric dimensions use the same rendered scale.
    const mutations = new MutationObserver(measure);
    const player = root.querySelector('.__remotion-player');
    if (player) mutations.observe(player, {attributes: true, attributeFilter: ['style']});
    const timer = requestAnimationFrame(measure);
    return () => {observer.disconnect(); mutations.disconnect(); cancelAnimationFrame(timer);};
  }, [canvas, doc, frame]);
  return items;
}

type OverlayProps = {items: LayoutItem[]; selected: string; enabled: boolean; doc: EditorDocument; index: number; scope: 'scene' | 'all'; onSelect: (id: string) => void; onPause: () => void; onPreview: (doc: EditorDocument) => void; onCommit: (before: EditorDocument) => void};
export function LayoutOverlay({items, selected, enabled, doc, index, scope, onSelect, onPause, onPreview, onCommit}: OverlayProps) {
  const drag = useRef<{document: EditorDocument; item: LayoutItem; x: number; y: number; scale: number; resize: boolean; ratio: number} | null>(null);
  const clamp = (n: number, low: number, high: number) => Math.round(Math.max(low, Math.min(high, n)));
  const start = (e: React.PointerEvent<HTMLButtonElement>, item: LayoutItem, resize: boolean) => {
    if (!enabled) return;
    e.preventDefault(); e.stopPropagation(); onPause(); onSelect(item.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {document: doc, item, x: e.clientX, y: e.clientY, scale: e.currentTarget.closest('.layout-overlay')!.getBoundingClientRect().width / 1080, resize, ratio: item.values.height / item.values.width};
  };
  const move = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current; if (!d) return;
    const dx = (e.clientX - d.x) / d.scale, dy = (e.clientY - d.y) / d.scale, v = d.item.values;
    const width = clamp(v.width + dx, 24, 2160);
    const patch = d.resize ? {width, height: clamp(e.shiftKey || d.item.mode === 'scale' ? width * d.ratio : v.height + dy, 16, 3840)} : {x: clamp(v.x + dx, -1080, 2160), y: clamp(v.y + dy, -1920, 3840)};
    onPreview(patchLayout(d.document, index, d.item.id, patch, scope));
  };
  const end = () => {if (drag.current) onCommit(drag.current.document); drag.current = null;};
  const cancel = () => {if (drag.current) onPreview(drag.current.document); drag.current = null;};
  return <div className={`layout-overlay ${enabled ? 'enabled' : ''}`} aria-label="Các khối layout">
    {enabled && items.map(item => <React.Fragment key={item.id}>
      <button className={`layout-hit ${selected === item.id ? 'selected' : ''}`} style={item.rect} aria-label={`Chỉnh ${item.label}`} aria-pressed={selected === item.id}
        onPointerDown={e => start(e, item, false)} onPointerMove={move} onPointerUp={end} onPointerCancel={cancel} onLostPointerCapture={end}
        onClick={() => {onPause(); onSelect(item.id);}}
        onKeyDown={e => {
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
          e.preventDefault(); e.stopPropagation(); onPause(); onSelect(item.id);
          const step = e.shiftKey ? 10 : 1;
          onPreview(patchLayout(doc, index, item.id, {x: clamp(item.values.x + (e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0), -1080, 2160), y: clamp(item.values.y + (e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0), -1920, 3840)}, scope));
          onCommit(doc);
        }}><span>{item.label}</span></button>
      {selected === item.id && <button className="layout-resize" aria-label={`Đổi kích thước ${item.label}`} style={{left: item.rect.left + item.rect.width - 7, top: item.rect.top + item.rect.height - 7}}
        onPointerDown={e => start(e, item, true)} onPointerMove={move} onPointerUp={end} onPointerCancel={cancel} onLostPointerCapture={end}/>}</React.Fragment>)}
  </div>;
}

export function LayoutInspector({items, selected, onSelect, scope, onScope, doc, index, onChange}: {items: LayoutItem[]; selected: string; onSelect: (id: string) => void; scope: 'scene' | 'all'; onScope: (scope: 'scene' | 'all') => void; doc: EditorDocument; index: number; onChange: (doc: EditorDocument) => void}) {
  const item = items.find(i => i.id === selected);
  const patch = (values: LayoutValues | null) => {if (item) onChange(patchLayout(doc, index, item.id, values, scope));};
  return <>
    <div className="panel-heading"><h2>Bố cục trên hình</h2><span>1080 × 1920</span></div>
    {!items.length ? <p className="hint">Tập này chưa đăng ký các khối layout. Xem hướng dẫn adapter để nối các khối gốc vào editor.</p> : <>
      <label>Khối đang chỉnh<select value={selected} onChange={e => onSelect(e.target.value)}>{items.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}</select></label>
      <label>Phạm vi áp dụng<select value={scope} onChange={e => onScope(e.target.value as 'scene' | 'all')}><option value="scene">Cảnh {index + 1}</option><option value="all">Layout chung của video</option></select></label>
      <p className="hint">Layout riêng của một cảnh được ưu tiên hơn layout chung.</p>
      {item && <>
        <div className="two-fields">{(['x', 'y'] as const).map(key => <label key={key}>{key === 'x' ? 'Vị trí X' : 'Vị trí Y'}<input type="number" aria-label={`Layout ${key.toUpperCase()}`} min={key === 'x' ? -1080 : -1920} max={key === 'x' ? 2160 : 3840} value={Math.round(item.values[key])} onChange={e => {if (e.target.value !== '' && e.currentTarget.validity.valid) patch({[key]: Number(e.target.value)});}}/></label>)}</div>
        <div className="two-fields">{(['width', 'height'] as const).map(key => <label key={key}>{key === 'width' ? 'Rộng (px)' : 'Cao (px)'}<input type="number" aria-label={key === 'width' ? 'Layout rộng' : 'Layout cao'} min={key === 'width' ? 24 : 16} max={key === 'width' ? 2160 : 3840} value={Math.round(item.values[key])} onChange={e => {if (e.target.value !== '' && e.currentTarget.validity.valid) {const value = Number(e.target.value); patch(item.mode === 'scale' ? key === 'width' ? {width: value, height: Math.round(value * item.height / item.width)} : {height: value, width: Math.round(value * item.width / item.height)} : {[key]: value});}}}/></label>)}</div>
        {item.fontSize && <><div className="two-fields"><label>Cỡ chữ<input aria-label="Cỡ chữ layout" type="number" min="10" max="200" value={item.values.fontSize ?? item.fontSize} onChange={e => {if (e.target.value !== '' && e.currentTarget.validity.valid) patch({fontSize: Number(e.target.value)});}}/></label><label>Giãn dòng<input aria-label="Giãn dòng layout" type="number" min="0.8" max="3" step="0.05" value={item.values.lineHeight ?? (item.id === 'headline' ? 1.15 : 1.3)} onChange={e => {if (e.target.value !== '' && e.currentTarget.validity.valid) patch({lineHeight: Number(e.target.value)});}}/></label></div>
          {item.mode !== 'caption' && <><label className="inline-label">Cho phép xuống dòng<input type="checkbox" checked={item.values.wrap ?? false} onChange={e => patch({wrap: e.target.checked})}/></label><label>Căn chữ<select value={item.values.textAlign ?? 'left'} onChange={e => patch({textAlign: e.target.value as LayoutValues['textAlign']})}><option value="left">Trái</option><option value="center">Giữa</option><option value="right">Phải</option></select></label><label className="inline-label">Màu chữ<input aria-label="Màu chữ layout" type="color" value={item.values.color ?? (item.id === 'headline' ? '#ffffff' : doc.beats[index].accentColor ?? '#a5dcc2')} onChange={e => patch({color: e.target.value})}/></label></>}
        </>}
        <button className="reset-layout" onClick={() => patch(null)}>Đặt lại khối · {scope === 'all' ? 'layout chung' : 'cảnh này'}</button>
        <p className="hint">Kéo khối để di chuyển. Kéo góc để đổi kích thước. Phím mũi tên dịch 1 px; Shift dịch 10 px.</p>
      </>}
    </>}
  </>;
}
