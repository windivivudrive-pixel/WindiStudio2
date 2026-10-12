import React, {useLayoutEffect, useRef, useState, type RefObject} from 'react';
import {patchWindowTransform, resolveWindowTransform} from './client-model.mjs';
import type {EditorDocument} from './types';

type Props = {canvas: RefObject<HTMLDivElement | null>; doc: EditorDocument; frame: number; index: number; scope: 'scene' | 'all'; enabled: boolean; onPreview: (doc: EditorDocument) => void; onCommit: (doc: EditorDocument) => void};
export function ContentOverlay({canvas, doc, frame, index, scope, enabled, onPreview, onCommit}: Props) {
  const [rect, setRect] = useState<{left: number; top: number; width: number; height: number} | null>(null);
  const gesture = useRef<{doc: EditorDocument; x: number; y: number; width: number; height: number; value: {x: number; y: number; scale: number}} | null>(null);
  useLayoutEffect(() => {
    const root = canvas.current, node = root?.querySelector('[data-windi-window-media]');
    if (!root || !node || !enabled) {setRect(null); return;}
    const measure = () => {const a = root.getBoundingClientRect(), b = node.getBoundingClientRect(); setRect({left: b.x - a.x, top: b.y - a.y, width: b.width, height: b.height});};
    measure(); const observer = new ResizeObserver(measure); observer.observe(root); observer.observe(node);
    const raf = requestAnimationFrame(measure); return () => {observer.disconnect(); cancelAnimationFrame(raf);};
  }, [canvas, enabled, doc, frame]);
  if (!enabled || !rect) return null;
  const finish = () => {if (gesture.current) onCommit(gesture.current.doc); gesture.current = null;};
  return <div className="content-overlay"><button className="content-hit" aria-label="Kéo nội dung trong cửa sổ" style={rect}
    onPointerDown={e => {e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); gesture.current = {doc, x: e.clientX, y: e.clientY, width: rect.width, height: rect.height, value: resolveWindowTransform(doc, index)};}}
    onPointerMove={e => {const g = gesture.current; if (!g) return; const clamp = (v: number) => Math.round(Math.max(-100, Math.min(100, v)) * 100) / 100; onPreview(patchWindowTransform(g.doc, index, {x: clamp(g.value.x + (e.clientX - g.x) / g.width * 100), y: clamp(g.value.y + (e.clientY - g.y) / g.height * 100)}, scope));}}
    onPointerUp={finish} onLostPointerCapture={finish} onPointerCancel={() => {if (gesture.current) onPreview(gesture.current.doc); gesture.current = null;}}
    onKeyDown={e => {if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return; e.preventDefault(); e.stopPropagation(); const v = resolveWindowTransform(doc, index), step = e.shiftKey ? 5 : 1; onPreview(patchWindowTransform(doc, index, {x: Math.max(-100, Math.min(100, v.x + (e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0))), y: Math.max(-100, Math.min(100, v.y + (e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0)))}, scope)); onCommit(doc);}}><span>Kéo để căn nội dung · khung cửa sổ giữ nguyên</span></button></div>;
}
