import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Eyebrow, Headline, Panel} from '../components/Panel';
import {SceneShell} from '../components/SceneShell';
import {COLORS, enter} from '../theme';

const itemData = [
  {label: 'CÀI ĐẶT', note: 'Cần người biết cấu hình', color: COLORS.yellow},
  {label: 'CẬP NHẬT', note: 'Theo dõi phiên bản', color: COLORS.teal},
  {label: 'CHI PHÍ', note: 'Máy chạy riêng', color: COLORS.pink},
];

export const TradeoffScene: React.FC<{duration: number}> = ({duration}) => {
  const frame = useCurrentFrame();
  const answer = enter(frame, 132, 10);

  return (
    <SceneShell duration={duration} direction={-1}>
      <Eyebrow>LƯU Ý TRƯỚC KHI TỰ DỰNG</Eyebrow>
      <Headline accent="BẮT BUỘC">SERVER RIÊNG KHÔNG</Headline>

      <Panel accent={COLORS.yellow} style={{height: 510, marginTop: 42, padding: 30, background: '#2c2a26'}}>
        <div style={{fontSize: 31, color: COLORS.yellow, marginBottom: 24}}>MÁY CHỦ RIÊNG CẦN:</div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 17}}>
          {itemData.map((item, index) => {
            const progress = enter(frame, 24 + index * 32, 9);
            return (
              <div key={item.label} style={{height: 220, padding: '24px 18px', borderRadius: 16, background: COLORS.panelDeep, border: `3px solid ${item.color}`, opacity: progress, translate: `0 ${(1 - progress) * 24}px`}}>
                <div style={{fontSize: 25, color: item.color}}>0{index + 1}</div>
                <div style={{fontSize: 34, fontWeight: 700, marginTop: 22}}>{item.label}</div>
                <div style={{fontSize: 23, color: COLORS.muted, marginTop: 14, lineHeight: 1.25}}>{item.note}</div>
              </div>
            );
          })}
        </div>

        <div style={{marginTop: 27, background: COLORS.cream, color: COLORS.bg, borderRadius: 14, padding: '20px 24px', fontSize: 35, fontWeight: 700, textAlign: 'center', opacity: answer, translate: `${(1 - answer) * 30}px 0`}}>DÙNG THỬ TRƯỚC → TỰ DỰNG SAU</div>
      </Panel>
    </SceneShell>
  );
};

