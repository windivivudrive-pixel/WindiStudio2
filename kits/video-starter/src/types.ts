export type WindiCaption={text:string;startMs:number;endMs:number;timestampMs:number|null;confidence:number|null};
export type WindiBeat={id:string;startMs:number;endMs:number;voiceOver:string;onScreenText:string;visualDescription:string;image:string;motion:string;layout:string;spokenAnchor:string};
export type WindiSceneComposition='full-bleed'|'framed'|'split'|'text-led'|'quote'|'comparison'|'cta';
export type WindiLayoutProfile={
  id:string;
  name:string;
  renderer?:'ws1-reference-hybrid-flow';
  basePreset:'paper-editorial'|'dark-cinematic';
  palette:{background:string;surface:string;text:string;accent:string;border:string};
  captions:{position:'top'|'center'|'bottom';style:'boxed'|'pill'|'plain'};
  sceneTypes:Array<{id:string;role:string;composition:WindiSceneComposition;textPosition:'top'|'center'|'bottom';imageFit:'cover'|'contain'}>;
};
export type WindiVideoProps={title:string;layout:'paper-editorial'|'dark-cinematic';layoutProfile?:WindiLayoutProfile;audio:string;audioEnvelope?:number[];sampleRanges?:Array<{startMs:number;endMs:number}>;presentation?:{eyebrow:string;scenes:Record<string,{titleLines:string[];label:string;tag:string}>};beats:WindiBeat[];captions:WindiCaption[];brand?:string};
