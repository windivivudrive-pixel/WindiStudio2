import React from 'react';
import {useCurrentFrame} from 'remotion';
import type {EditorBeat} from './types';

// Overlay transitions preserve all scene boundaries and narration timestamps.
export function EditorTransition({beats}: {beats: EditorBeat[]}) {
  const frame = useCurrentFrame();
  const beat = beats.find((b, i) => i > 0 && b.transition && b.transition.type !== 'none' && Math.abs(frame - b.startFrame) < Math.min(b.transition.durationInFrames / 2, (b.endFrame - b.startFrame) / 2, (b.startFrame - beats[i - 1].startFrame) / 2));
  if (!beat?.transition) return null;
  const i = beats.indexOf(beat);
  const half = Math.min(beat.transition.durationInFrames / 2, (beat.endFrame - beat.startFrame) / 2, (beat.startFrame - beats[i - 1].startFrame) / 2);
  const strength = 1 - Math.abs(frame - beat.startFrame) / half;
  return <div style={{position: 'absolute', inset: 0, zIndex: 90, pointerEvents: 'none', background: '#081a2a', opacity: strength}}>
    {beat.transition.type === 'scan' && <div style={{position: 'absolute', top: `${(frame - beat.startFrame + half) / (half * 2) * 100}%`, left: 0, right: 0, height: 10, background: '#a5dcc2', boxShadow: '0 0 35px #a5dcc2'}}/>}
  </div>;
}
