import React from 'react';
import {useCurrentFrame} from 'remotion';
import captions from '../captions.json';
import {COLORS} from '../theme';

type VideoCaption = {
  text: string;
  startMs: number;
  endMs: number;
  timestampMs: number | null;
  confidence: number | null;
  highlight: string;
};

export const CaptionBar: React.FC = () => {
  const frame = useCurrentFrame();
  const timeMs = frame / 30 * 1000;
  const caption = (captions as VideoCaption[]).find((item) => timeMs >= item.startMs && timeMs < item.endMs);
  if (!caption) return null;

  const splitIndex = caption.text.indexOf(caption.highlight);
  const before = splitIndex >= 0 ? caption.text.slice(0, splitIndex) : caption.text;
  const after = splitIndex >= 0 ? caption.text.slice(splitIndex + caption.highlight.length) : '';

  return (
    <div style={{position: 'absolute', top: 1432, left: 110, width: 800, display: 'flex', justifyContent: 'center'}}>
      <div style={{
        background: 'rgba(7,23,36,.88)',
        color: COLORS.cream,
        borderTop: `3px solid ${COLORS.border}`,
        borderBottom: `3px solid ${COLORS.border}`,
        padding: '17px 28px 15px',
        fontSize: 49,
        lineHeight: 1.16,
        textAlign: 'center',
        fontWeight: 700,
        maxWidth: 800,
      }}>
        {before}<span style={{color: COLORS.pink}}>{caption.highlight}</span>{after}
      </div>
    </div>
  );
};

