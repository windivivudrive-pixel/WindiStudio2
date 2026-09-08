import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {DotIcon, Eyebrow, Headline, Panel} from '../components/Panel';
import {SceneShell} from '../components/SceneShell';
import {COLORS, clamp, enter} from '../theme';

export const OfficeScene: React.FC<{duration: number}> = ({duration}) => {
  const frame = useCurrentFrame();
  const move = enter(frame, 72, 24);
  const arrived = enter(frame, 104, 8);
  const folderX = interpolate(move, [0, 1], [190, 660], clamp);

  return (
    <SceneShell duration={duration} direction={-1}>
      <Eyebrow>VÍ DỤ 02 · LÚC ĐANG Ở NGOÀI</Eyebrow>
      <Headline accent="Ở VĂN PHÒNG">FILE KHÁCH HÀNG</Headline>

      <Panel style={{height: 590, marginTop: 42, padding: 34, position: 'relative', overflow: 'hidden'}}>
        <div style={{display: 'flex', justifyContent: 'space-between'}}>
          <div style={{width: 300}}>
            <DotIcon label="▤" color={COLORS.yellow}/>
            <div style={{fontSize: 34, fontWeight: 700, marginTop: 20}}>MÁY VĂN PHÒNG</div>
            <div style={{fontSize: 25, color: COLORS.muted, marginTop: 10}}>File nằm ở đây</div>
          </div>
          <div style={{width: 300, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
            <DotIcon label="R" color={COLORS.teal}/>
            <div style={{fontSize: 34, fontWeight: 700, marginTop: 20}}>MÁY CỦA BẠN</div>
            <div style={{fontSize: 25, color: COLORS.muted, marginTop: 10}}>Đang ở ngoài</div>
          </div>
        </div>

        <div style={{position: 'absolute', left: 170, right: 170, top: 350, height: 5, background: COLORS.teal, opacity: .35}}/>
        <div style={{position: 'absolute', left: folderX, top: 310, width: 92, height: 72, borderRadius: 12, background: COLORS.yellow, color: COLORS.bg, display: 'grid', placeItems: 'center', fontSize: 40, fontWeight: 700, boxShadow: `7px 8px 0 ${COLORS.yellow}2c`}}>FILE</div>
        <div style={{position: 'absolute', left: 285, right: 285, bottom: 50, border: `3px solid ${COLORS.green}`, borderRadius: 14, padding: '17px 22px', textAlign: 'center', fontSize: 30, color: COLORS.green, opacity: arrived}}>ĐÃ LẤY ĐƯỢC FILE</div>
      </Panel>
    </SceneShell>
  );
};

