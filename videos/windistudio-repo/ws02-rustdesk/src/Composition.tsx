import {AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {ding, mouseClick, pageTurn, recordScratch, uiSwitch, whoosh} from '@remotion/sfx';
import {loadFont} from '@remotion/fonts';
import timeline from './timeline.json';
import {CaptionBar} from './components/CaptionBar';
import {HookScene} from './scenes/HookScene';
import {SolutionScene} from './scenes/SolutionScene';
import {FamilyScene} from './scenes/FamilyScene';
import {OfficeScene} from './scenes/OfficeScene';
import {RouteScene} from './scenes/RouteScene';
import {TradeoffScene} from './scenes/TradeoffScene';
import {CtaScene} from './scenes/CtaScene';
import {COLORS} from './theme';

loadFont({family: 'Calling', url: staticFile('regular.otf'), weight: '400'});
loadFont({family: 'Calling', url: staticFile('bold.otf'), weight: '700'});

const visualScenes = [HookScene, SolutionScene, FamilyScene, OfficeScene, RouteScene, TradeoffScene, CtaScene];
const voiceFiles = ['hook.mp3', 'solution.mp3', 'family.mp3', 'office.mp3', 'route.mp3', 'tradeoff.mp3', 'cta.mp3'];

const sfxCues = [
  {id: 'hook-impact', from: 100, src: recordScratch, volume: 0.16, duration: 24},
  {id: 'solution-switch', from: 163, src: uiSwitch, volume: 0.13, duration: 18},
  {id: 'family-click', from: 448, src: mouseClick, volume: 0.16, duration: 14},
  {id: 'office-ding', from: 600, src: ding, volume: 0.12, duration: 20},
  {id: 'route-whoosh', from: 762, src: whoosh, volume: 0.13, duration: 22},
  {id: 'tradeoff-page', from: 910, src: pageTurn, volume: 0.12, duration: 24},
  {id: 'cta-ding', from: 1144, src: ding, volume: 0.14, duration: 20},
] as const;

export const Video = ({cover = false}: {cover?: boolean}) => {
  const frame = useCurrentFrame();
  const gridX = (frame * 0.22) % 56;
  const gridY = (frame * 0.12) % 56;
  const glowX = Math.sin(frame / 118) * 190;
  const glowY = Math.cos(frame / 145) * 120;

  return (
    <AbsoluteFill style={{
      backgroundColor: COLORS.bg,
      color: COLORS.cream,
      fontFamily: 'Calling',
      overflow: 'hidden',
      backgroundImage: 'linear-gradient(rgba(111,191,191,.11) 2px,transparent 2px),linear-gradient(90deg,rgba(111,191,191,.11) 2px,transparent 2px)',
      backgroundSize: '56px 56px',
      backgroundPosition: `${gridX}px ${gridY}px`,
    }}>
      <div style={{position: 'absolute', inset: -300, background: 'radial-gradient(circle,rgba(61,199,181,.18),transparent 56%)', translate: `${glowX}px ${glowY}px`, filter: 'blur(24px)'}}/>
      <div style={{position: 'absolute', inset: -260, background: 'radial-gradient(circle,rgba(255,111,157,.12),transparent 48%)', translate: `${-glowY}px ${glowX * .45}px`, filter: 'blur(32px)'}}/>

      <div style={{position: 'absolute', top: 34, left: 80, width: 920, height: 10, background: COLORS.panel, border: `2px solid ${COLORS.border}`, borderRadius: 7, overflow: 'hidden'}}>
        <div style={{height: '100%', width: `${Math.min(100, frame / Math.max(1, timeline.frames - 1) * 100)}%`, background: COLORS.pink}}/>
      </div>

      <div style={{position: 'absolute', top: 104, left: 80, width: 920, height: 92, background: COLORS.panel, border: `3px solid ${COLORS.border}`, borderRadius: 15, display: 'grid', placeItems: 'center', boxShadow: `7px 8px 0 ${COLORS.border}24`, fontSize: 34, whiteSpace: 'nowrap'}}>
        <b>WindiStudio - Sử Dụng AI Hiệu Quả</b>
      </div>

      <div style={{position: 'absolute', top: 250, left: 80, fontSize: 25, letterSpacing: 3, color: COLORS.muted}}>
        REPO ĐÁNG THỬ / 002 <span style={{color: COLORS.pink}}>●</span> RUSTDESK
      </div>

      <Audio src={staticFile('musicbg.mp3')} volume={1} loop/>
      {timeline.scenes.map((scene, index) => (
        <Sequence key={`voice-${scene.id}`} from={scene.fromFrame} durationInFrames={scene.audioFrames}>
          <Audio src={staticFile(voiceFiles[index])}/>
        </Sequence>
      ))}

      {sfxCues.map((cue) => (
        <Sequence key={cue.id} from={cue.from} durationInFrames={cue.duration}>
          <Audio
            src={cue.src}
            volume={(f) => interpolate(f, [0, 2, cue.duration - 3, cue.duration], [0, cue.volume, cue.volume, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
          />
        </Sequence>
      ))}

      {timeline.scenes.map((scene, index) => {
        const Scene = visualScenes[index];
        const nextStart = timeline.scenes[index + 1]?.fromFrame ?? timeline.frames;
        const visualDuration = nextStart - scene.fromFrame;
        return (
          <Sequence key={scene.id} from={scene.fromFrame} durationInFrames={visualDuration}>
            <Scene duration={visualDuration}/>
          </Sequence>
        );
      })}

      {!cover && <CaptionBar/>}

      <div style={{position: 'absolute', top: 1732, left: 80, fontSize: 25, color: COLORS.muted, letterSpacing: 2}}>WINDISTUDIO.APP · AI TOOLBOX</div>
      <div style={{position: 'absolute', width: 18, height: 18, borderRadius: 10, background: COLORS.yellow, left: 920 + Math.sin(frame / 42) * 5, top: 1770 + Math.sin(frame / 37) * 4}}/>
      <div style={{position: 'absolute', width: 13, height: 13, borderRadius: 8, background: COLORS.teal, left: 964 + Math.cos(frame / 51) * 4, top: 1805 + Math.sin(frame / 44) * 4}}/>
    </AbsoluteFill>
  );
};
