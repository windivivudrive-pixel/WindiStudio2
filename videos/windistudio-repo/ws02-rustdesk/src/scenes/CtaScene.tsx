import React from 'react';
import {useCurrentFrame} from 'remotion';
import {DotIcon, Eyebrow, Panel} from '../components/Panel';
import {SceneShell} from '../components/SceneShell';
import {COLORS, enter} from '../theme';

export const CtaScene: React.FC<{duration: number}> = ({duration}) => {
  const frame = useCurrentFrame();
  const title = enter(frame, 8, 10);
  const useCases = enter(frame, 82, 10);
  const website = enter(frame, 176, 12);

  return (
    <SceneShell duration={duration} direction={1}>
      <Eyebrow>REPO ĐÁNG LƯU / 002</Eyebrow>
      <div style={{display: 'flex', alignItems: 'center', gap: 30, opacity: title, translate: `${(1 - title) * 36}px 0`}}>
        <DotIcon label="R" color={COLORS.teal} size={122}/>
        <div>
          <div style={{fontSize: 112, lineHeight: .9, fontWeight: 700}}>LƯU</div>
          <div style={{fontSize: 88, lineHeight: 1.05, color: COLORS.pink, fontWeight: 700}}>RUSTDESK</div>
        </div>
      </div>

      <Panel accent={COLORS.yellow} delay={24} style={{marginTop: 55, padding: 32, height: 330}}>
        <div style={{fontSize: 31, color: COLORS.yellow}}>KHI BẠN THƯỜNG XUYÊN:</div>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 26, opacity: useCases}}>
          <div style={{background: COLORS.panelDeep, borderRadius: 14, padding: '24px 22px', fontSize: 31, lineHeight: 1.25}}>SỬA MÁY<br/><span style={{color: COLORS.muted}}>cho người thân</span></div>
          <div style={{background: COLORS.panelDeep, borderRadius: 14, padding: '24px 22px', fontSize: 31, lineHeight: 1.25}}>VÀO MÁY<br/><span style={{color: COLORS.muted}}>ở văn phòng</span></div>
        </div>
      </Panel>

      <div style={{marginTop: 48, borderRadius: 16, background: COLORS.cream, color: '#ce3567', border: `3px solid ${COLORS.border}`, padding: '22px 28px', fontSize: 58, fontWeight: 700, textAlign: 'center', opacity: website, scale: .94 + website * .06}}>WINDISTUDIO.APP</div>
    </SceneShell>
  );
};

