import React from 'react';
import {Audio, Sequence, staticFile} from 'remotion';
import type {EditorDocument} from './types';

export function EditorMusic({editor}: {editor: EditorDocument}) {
  const a = editor.audio, offset = a.musicOffsetFrames ?? 0;
  const length = editor.totalFrames - offset;
  const fadeIn = a.musicFadeInFrames ?? 0, fadeOut = a.musicFadeOutFrames ?? 0;
  return <Sequence from={offset} durationInFrames={length} layout="none">
    <Audio src={staticFile(a.music)} trimBefore={a.musicTrimBefore ?? 0} loop
      loopVolumeCurveBehavior="extend" volume={frame => a.musicVolume * Math.min(1, fadeIn ? frame / fadeIn : 1, fadeOut ? (length - frame) / fadeOut : 1)}/>
  </Sequence>;
}
