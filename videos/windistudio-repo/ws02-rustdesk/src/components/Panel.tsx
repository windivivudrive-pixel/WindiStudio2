import React from 'react';
import {useCurrentFrame} from 'remotion';
import {COLORS, enter} from '../theme';

export const Panel: React.FC<React.PropsWithChildren<{
  accent?: string;
  delay?: number;
  style?: React.CSSProperties;
}>> = ({children, accent = COLORS.border, delay = 0, style}) => {
  const frame = useCurrentFrame();
  const progress = enter(frame, delay);

  return (
    <div
      style={{
        background: COLORS.panel,
        border: `3px solid ${accent}`,
        borderRadius: 20,
        boxShadow: `9px 10px 0 ${accent}24`,
        opacity: progress,
        translate: `0 ${(1 - progress) * 28}px`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Eyebrow: React.FC<{children: React.ReactNode; color?: string}> = ({children, color = COLORS.teal}) => (
  <div style={{fontSize: 27, letterSpacing: 3.2, color, marginBottom: 16}}>{children}</div>
);

export const Headline: React.FC<{children: React.ReactNode; accent?: React.ReactNode}> = ({children, accent}) => (
  <div style={{fontSize: 82, lineHeight: 1.02, fontWeight: 700, letterSpacing: -1.5}}>
    {children}
    {accent ? <><br/><span style={{color: COLORS.pink}}>{accent}</span></> : null}
  </div>
);

export const DotIcon: React.FC<{label: string; color?: string; size?: number}> = ({label, color = COLORS.teal, size = 92}) => (
  <div style={{
    width: size,
    height: size,
    borderRadius: 22,
    border: `3px solid ${color}`,
    background: COLORS.panelDeep,
    color,
    display: 'grid',
    placeItems: 'center',
    fontSize: Math.round(size * 0.43),
    lineHeight: 1,
    fontWeight: 700,
  }}>{label}</div>
);

