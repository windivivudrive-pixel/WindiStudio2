import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {DotIcon, Eyebrow, Headline, Panel} from '../components/Panel';
import {SceneShell} from '../components/SceneShell';
import {COLORS, clamp, enter} from '../theme';

export const FamilyScene: React.FC<{duration: number}> = ({duration}) => {
  const frame = useCurrentFrame();
  const typed = Math.max(0, Math.min(9, Math.floor(interpolate(frame, [36, 82], [0, 9], clamp))));
  const connected = enter(frame, 86, 10);
  const code = '824 519 736'.slice(0, typed + Math.floor(typed / 3));

  return (
    <SceneShell duration={duration} direction={1}>
      <Eyebrow>VÍ DỤ 01 · RẤT ĐỜI THƯỜNG</Eyebrow>
      <Headline accent="MÁY LỖI RỒI!">BỐ MẸ GỌI</Headline>

      <Panel style={{height: 590, marginTop: 42, padding: 30}}>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 160px 1fr', alignItems: 'center', gap: 18}}>
          <div style={{height: 235, border: `3px solid ${COLORS.yellow}`, borderRadius: 18, background: COLORS.panelDeep, padding: 24}}>
            <DotIcon label="MẸ" color={COLORS.yellow} size={76}/>
            <div style={{fontSize: 29, fontWeight: 700, marginTop: 22}}>MÁY BỐ MẸ</div>
            <div style={{fontSize: 23, color: COLORS.muted, marginTop: 10}}>Đang cần trợ giúp</div>
          </div>
          <div style={{fontSize: 72, textAlign: 'center', color: COLORS.teal}}>⇄</div>
          <div style={{height: 235, border: `3px solid ${COLORS.teal}`, borderRadius: 18, background: COLORS.panelDeep, padding: 24}}>
            <DotIcon label="BẠN" color={COLORS.teal} size={76}/>
            <div style={{fontSize: 29, fontWeight: 700, marginTop: 22}}>MÁY CỦA BẠN</div>
            <div style={{fontSize: 23, color: COLORS.muted, marginTop: 10}}>Sẵn sàng kết nối</div>
          </div>
        </div>

        <div style={{marginTop: 30, borderRadius: 16, border: `3px solid ${connected ? COLORS.green : COLORS.border}`, background: COLORS.panelSoft, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div>
            <div style={{fontSize: 24, color: COLORS.muted}}>NHẬP MÃ KẾT NỐI</div>
            <div style={{fontSize: 49, letterSpacing: 5, marginTop: 10, minWidth: 320}}>{code || '___ ___ ___'}</div>
          </div>
          <div style={{background: connected ? COLORS.green : COLORS.cream, color: COLORS.bg, borderRadius: 13, padding: '18px 24px', fontSize: 29, fontWeight: 700}}>{connected ? 'ĐÃ THẤY MÀN HÌNH' : 'KẾT NỐI'}</div>
        </div>
      </Panel>
    </SceneShell>
  );
};

