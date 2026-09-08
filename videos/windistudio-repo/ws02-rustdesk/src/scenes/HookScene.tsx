import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {DotIcon, Eyebrow, Headline, Panel} from '../components/Panel';
import {SceneShell} from '../components/SceneShell';
import {COLORS, clamp, enter} from '../theme';

export const HookScene: React.FC<{duration: number}> = ({duration}) => {
  const frame = useCurrentFrame();
  const alert = enter(frame, 46, 8);
  const cursorX = interpolate(frame, [8, 40], [90, 535], clamp);
  const cursorY = interpolate(frame, [8, 40], [315, 230], clamp);

  return (
    <SceneShell duration={duration} direction={1}>
      <Eyebrow>NỖI ĐAU AI CŨNG TỪNG GẶP</Eyebrow>
      <Headline accent="BỊ ĐÁ RA?">CHƯA SỬA XONG</Headline>

      <Panel style={{height: 590, marginTop: 42, padding: 28, position: 'relative', overflow: 'hidden'}}>
        <div style={{height: 54, borderBottom: `3px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 12}}>
          <span style={{width: 15, height: 15, borderRadius: 9, background: COLORS.pink}}/>
          <span style={{width: 15, height: 15, borderRadius: 9, background: COLORS.yellow}}/>
          <span style={{width: 15, height: 15, borderRadius: 9, background: COLORS.teal}}/>
          <span style={{fontSize: 24, color: COLORS.muted, marginLeft: 14}}>ĐANG HỖ TRỢ TỪ XA · TEAMVIEWER</span>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: '250px 1fr', gap: 28, paddingTop: 34}}>
          <div style={{background: COLORS.panelDeep, border: `3px solid ${COLORS.border}`, borderRadius: 18, height: 390, padding: 24}}>
            <DotIcon label="MẸ" color={COLORS.yellow} size={82}/>
            <div style={{fontSize: 31, marginTop: 24, fontWeight: 700}}>MÁY CỦA BỐ MẸ</div>
            <div style={{fontSize: 25, color: COLORS.muted, marginTop: 14, lineHeight: 1.35}}>“Máy tự nhiên không mở được file…”</div>
          </div>
          <div style={{background: '#dce7dc', borderRadius: 18, height: 390, padding: 24, color: '#20332a', position: 'relative', overflow: 'hidden'}}>
            <div style={{display: 'flex', gap: 12, marginBottom: 28}}>
              <div style={{width: 130, height: 18, background: '#8fb09f', borderRadius: 9}}/>
              <div style={{width: 90, height: 18, background: '#bad0c3', borderRadius: 9}}/>
            </div>
            <div style={{width: 280, height: 28, background: '#9dbdac', borderRadius: 8, marginBottom: 18}}/>
            <div style={{width: 380, height: 18, background: '#bed3c7', borderRadius: 8, marginBottom: 14}}/>
            <div style={{width: 330, height: 18, background: '#bed3c7', borderRadius: 8}}/>
            <div style={{position: 'absolute', left: cursorX, top: cursorY, fontSize: 58, color: COLORS.pink, textShadow: '3px 3px 0 #fff'}}>➤</div>
          </div>
        </div>

        <div style={{
          position: 'absolute',
          left: 235,
          top: 190,
          width: 420,
          padding: '27px 30px',
          background: '#381e2b',
          border: `4px solid ${COLORS.red}`,
          borderRadius: 18,
          boxShadow: `10px 12px 0 ${COLORS.red}30`,
          opacity: alert,
          scale: .88 + alert * .12,
          textAlign: 'center',
        }}>
          <div style={{fontSize: 24, color: COLORS.red, letterSpacing: 2}}>CONNECTION TIMEOUT</div>
          <div style={{fontSize: 46, fontWeight: 700, marginTop: 12}}>PHIÊN BỊ NGẮT</div>
          <div style={{fontSize: 25, color: COLORS.muted, marginTop: 10}}>Chưa sửa xong…</div>
        </div>
      </Panel>
    </SceneShell>
  );
};

