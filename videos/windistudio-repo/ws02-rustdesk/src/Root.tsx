import './index.css';
import {Composition} from 'remotion';
import {Video} from './Composition';
import timeline from './timeline.json';

export const RemotionRoot = () => (
  <Composition
    id="WS02"
    component={Video}
    durationInFrames={timeline.frames}
    fps={30}
    width={1080}
    height={1920}
  />
);
