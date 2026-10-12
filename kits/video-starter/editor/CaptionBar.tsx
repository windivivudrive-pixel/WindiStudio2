import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {CaptionGroup} from './types';

export function EditorCaptionBar({groups}: {groups: CaptionGroup[]}) {
  const {fps} = useVideoConfig();
  const currentMs = useCurrentFrame() / fps * 1000;
  const group = groups.find(g => currentMs >= g.startMs && currentMs <= g.endMs + 250);
  if (!group) return null;
  const localMs = currentMs - group.startMs;
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  return <div style={{position: 'absolute', top: 1350, left: 80, width: 920, minHeight: 110,
    display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: interpolate(localMs, [0, 60], [0, 1], clamp), zIndex: 100}}>
    <div style={{maxWidth: 880, padding: '16px 28px', background: 'rgba(16, 43, 58, 0.95)', border: '3px solid #5da57c',
      boxShadow: '0 8px 24px rgba(0,0,0,0.55), 0 0 16px rgba(93,165,124,0.25)', borderRadius: 14,
      fontSize: 38, fontWeight: 800, lineHeight: 1.3, textAlign: 'center', fontFamily: 'Calling, monospace',
      transform: `scale(${interpolate(localMs, [0, 80], [0.92, 1], clamp)})`, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 12px'}}>
      {group.words.map((word, i) => {
        const active = currentMs >= word.startMs && currentMs <= word.endMs;
        return <span key={i} style={{display: 'inline-block', color: active ? '#86efac' : currentMs >= word.startMs ? '#dfffe2' : '#7f9eb5',
          transform: `scale(${active ? 1.12 : 1})`, transition: 'transform 0.05s ease', textShadow: active ? '0 0 12px #86efac' : 'none'}}>{word.text}</span>;
      })}
    </div>
  </div>;
}
