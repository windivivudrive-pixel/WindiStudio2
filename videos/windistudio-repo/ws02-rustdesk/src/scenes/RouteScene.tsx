import React from 'react';
import {useCurrentFrame} from 'remotion';
import {DotIcon, Eyebrow, Headline, Panel} from '../components/Panel';
import {SceneShell} from '../components/SceneShell';
import {COLORS, enter} from '../theme';

export const RouteScene: React.FC<{duration: number}> = ({duration}) => {
  const frame = useCurrentFrame();
  const direct = enter(frame, 18, 22);
  const blocked = enter(frame, 54, 8);
  const relay = enter(frame, 68, 22);

  return (
    <SceneShell duration={duration} direction={1}>
      <Eyebrow>HIỂU CÁCH NÓ HOẠT ĐỘNG</Eyebrow>
      <Headline accent="VẪN ĐI TIẾP">MẠNG CHẶN?</Headline>

      <Panel style={{height: 600, marginTop: 42, position: 'relative', overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 60, top: 210, textAlign: 'center'}}>
          <DotIcon label="A" color={COLORS.teal}/>
          <div style={{fontSize: 28, marginTop: 14}}>MÁY CỦA BẠN</div>
        </div>
        <div style={{position: 'absolute', right: 60, top: 210, textAlign: 'center'}}>
          <DotIcon label="B" color={COLORS.yellow}/>
          <div style={{fontSize: 28, marginTop: 14}}>MÁY CẦN MỞ</div>
        </div>

        <svg width="920" height="600" viewBox="0 0 920 600" style={{position: 'absolute', inset: 0}}>
          <path d="M160 255 L760 255" fill="none" stroke={COLORS.teal} strokeWidth="9" strokeLinecap="round" strokeDasharray="600" strokeDashoffset={(1 - direct) * 600} opacity={1 - blocked * .72}/>
          <path d="M160 285 C260 510 660 510 760 285" fill="none" stroke={COLORS.pink} strokeWidth="9" strokeLinecap="round" strokeDasharray="760" strokeDashoffset={(1 - relay) * 760}/>
        </svg>

        <div style={{position: 'absolute', left: 335, top: 188, width: 250, padding: '14px 18px', background: COLORS.teal, color: COLORS.bg, borderRadius: 12, fontSize: 28, fontWeight: 700, textAlign: 'center', opacity: direct * (1 - blocked)}}>NỐI TRỰC TIẾP</div>
        <div style={{position: 'absolute', left: 374, top: 205, width: 172, padding: '14px 16px', background: '#3a1d2a', border: `3px solid ${COLORS.red}`, color: COLORS.red, borderRadius: 12, fontSize: 29, fontWeight: 700, textAlign: 'center', opacity: blocked, scale: .88 + blocked * .12}}>BỊ CHẶN</div>

        <div style={{position: 'absolute', left: 300, top: 440, width: 320, padding: '18px 20px', borderRadius: 15, background: COLORS.panelSoft, border: `3px solid ${COLORS.pink}`, textAlign: 'center', opacity: relay, translate: `0 ${(1 - relay) * 18}px`}}>
          <div style={{fontSize: 34, fontWeight: 700}}>ĐƯỜNG DỰ PHÒNG</div>
          <div style={{fontSize: 22, color: COLORS.muted, marginTop: 7}}>relay · hbbr</div>
        </div>
      </Panel>
    </SceneShell>
  );
};
