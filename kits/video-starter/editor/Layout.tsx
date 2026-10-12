import React from 'react';
import {useCurrentFrame} from 'remotion';
import {resolveLayout} from './client-model.mjs';
import type {EditorDocument, LayoutSpec} from './types';

// Wrap native roots instead of rebuilding their contents. Without overrides this
// contributes no box or styles, preserving the original composition and motion.
export function EditorElement({editor, spec, children}: {editor?: EditorDocument; spec: LayoutSpec; children: React.ReactNode}) {
  const frame = useCurrentFrame();
  const index = editor ? Math.max(0, editor.beats.findIndex(b => frame >= b.startFrame && frame < b.endFrame)) : 0;
  const value = editor ? resolveLayout(editor, index, spec.id) : {};
  const selector = `[data-windi-element="${spec.id}"] > :not(style)`;
  const declarations: string[] = [];
  if (value.x != null) declarations.push(`left:${value.x}px`);
  if (value.y != null) declarations.push(`top:${value.y}px`);
  if (spec.mode === 'scale') {
    if (value.width != null || value.height != null) declarations.push(`scale:${(value.width ?? spec.width) / spec.width} ${(value.height ?? spec.height) / spec.height}`, 'transform-origin:0 0');
  } else {
    if (value.width != null) declarations.push(`width:${value.width}px`);
    if (value.height != null) declarations.push(`height:${value.height}px`, 'min-height:0');
  }
  const text = [];
  if (value.fontSize != null) text.push(`font-size:${value.fontSize}px`);
  if (value.lineHeight != null) text.push(`line-height:${value.lineHeight}`);
  if (value.color) text.push(`color:${value.color}`);
  if (value.wrap != null) text.push(`white-space:${value.wrap ? 'normal' : 'nowrap'}`);
  if (value.textAlign) text.push(`text-align:${value.textAlign}`);
  const rule = (target: string, rules: string[]) => rules.length ? `${target}{${rules.join('!important;')}!important;}` : '';
  const css = rule(selector, declarations) + rule(spec.mode === 'caption' ? `${selector} > div` : selector, text);
  return <span data-windi-element={spec.id} data-windi-spec={JSON.stringify(spec)} style={{display: 'contents'}}>
    {css && <style>{css}</style>}{children}
  </span>;
}
