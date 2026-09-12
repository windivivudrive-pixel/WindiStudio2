import {type CalculateMetadataFunction,Composition} from 'remotion';
import {defaultData} from './default-data';
import type {WindiVideoProps} from './types';
import {WindiVideo} from './WindiVideo';

const calculateMetadata:CalculateMetadataFunction<WindiVideoProps>=({props})=>{const end=Math.max(1000,...props.beats.map(beat=>beat.endMs),...props.captions.map(caption=>caption.endMs));return {durationInFrames:Math.ceil(end/1000*30),props};};
export const MyComposition=()=> <Composition id="WindiVideo" component={WindiVideo} durationInFrames={150} fps={30} width={1080} height={1920} defaultProps={defaultData} calculateMetadata={calculateMetadata}/>;
