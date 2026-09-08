import React from 'react';
import {useCurrentFrame} from 'remotion';
import {DotIcon, Eyebrow, Headline, Panel} from '../components/Panel';
import {SceneShell} from '../components/SceneShell';
import {COLORS, enter} from '../theme';

export const SolutionScene: React.FC<{duration: number}> = ({duration}) => {
  const frame = useCurrentFrame();
  const compare = enter(frame, 78, 10);
  const server = enter(frame, 142, 10);

  return (
    <SceneShell duration={duration} direction={-1}>
      <Eyebrow>MỘT LỰA CHỌN ĐÁNG LƯU</Eyebrow>
      <Headline accent="CHỦ ĐỘNG HƠN">REMOTE</Headline>

      <div style={{marginTop: 40}}>
        <Panel accent={COLORS.red} style={{height: 185, padding: 27, display: 'flex', alignItems: 'center', gap: 24, background: '#2b1e2a'}}>
          <DotIcon label="!" color={COLORS.red} size={86}/>
          <div>
            <div style={{fontSize: 25, color: COLORS.red, letterSpacing: 2}}>NỖI ĐAU QUEN THUỘC</div>
            <div style={{fontSize: 46, fontWeight: 700, marginTop: 9}}>BỊ NGẮT GIỮA CHỪNG</div>
          </div>
        </Panel>

        <Panel accent={COLORS.teal} delay={18} style={{height: 370, marginTop: 26, padding: 30, background: '#12392f', position: 'relative', overflow: 'hidden'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
            <DotIcon label="R" color={COLORS.teal}/>
            <div>
              <div style={{fontSize: 29, color: COLORS.teal}}>RUSTDESK</div>
              <div style={{fontSize: 55, fontWeight: 700, marginTop: 5}}>ĐIỀU KHIỂN TỪ XA</div>
            </div>
          </div>
          <div style={{height: 3, background: COLORS.teal, opacity: .45, margin: '26px 0'}}/>
          <div style={{display: 'flex', gap: 16}}>
            <div style={{flex: 1, padding: '17px 20px', borderRadius: 13, background: COLORS.panelDeep, fontSize: 28, opacity: compare}}>NHÌN &amp; THAO TÁC</div>
            <div style={{flex: 1.2, padding: '17px 20px', borderRadius: 13, background: COLORS.cream, color: COLORS.bg, fontSize: 28, fontWeight: 700, opacity: server}}>SERVER DO BẠN QUẢN LÝ</div>
          </div>
        </Panel>
      </div>
    </SceneShell>
  );
};

