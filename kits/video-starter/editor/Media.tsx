import React from 'react';
import {Img, OffthreadVideo, staticFile, Sequence, useCurrentFrame} from 'remotion';
import type {EditorBeat, EditorDocument} from './types';
import {resolveWindowTransform} from './client-model.mjs';

// The same component runs inside the live Player and the exported composition.
export function EditorMedia({media}: {media: NonNullable<EditorBeat['media']>}) {
  const style: React.CSSProperties = {width: '100%', height: '100%', objectFit: media.fit,
    objectPosition: `${media.x}% ${media.y}%`, transform: `scale(${media.zoom})`};
  return <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: '#081a2a'}}>
    {media.kind === 'image' ? <Img src={staticFile(media.src)} style={style}/> :
      <OffthreadVideo src={staticFile(media.src)} trimBefore={media.trimBefore} volume={media.volume} style={style}/>}
  </div>;
}

export function EditorWindowMedia({editor, children}: {editor?: EditorDocument; children: React.ReactNode}) {
  const frame = useCurrentFrame();
  const index = editor ? Math.max(0, editor.beats.findIndex(b => frame >= b.startFrame && frame < b.endFrame)) : 0;
  const transform = editor ? resolveWindowTransform(editor, index) : {x: 0, y: 0, scale: 1};
  const clip = editor?.mediaClips?.find(c => frame >= c.startFrame && frame < c.endFrame);
  return <div data-windi-window-media style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
    <div data-windi-window-transform style={{position: 'absolute', inset: 0, transform: `translate(${transform.x}%, ${transform.y}%) scale(${transform.scale})`, transformOrigin: 'center'}}>
      {clip ? <Sequence from={clip.startFrame} durationInFrames={clip.endFrame - clip.startFrame}><EditorMedia media={clip.media}/></Sequence> : children}
    </div>
  </div>;
}
