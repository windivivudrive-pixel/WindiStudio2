import React from 'react';
import {AbsoluteFill, Audio, Composition, Img, Sequence, interpolate, registerRoot, staticFile, useCurrentFrame} from 'remotion';
import {Video} from '@remotion/media';
import sample from '../data/video.json';

type Scene = {id:string;duration:number;eyebrow:string;headline:string;caption:string;visualPrompt:string;media:string|null;mediaKind:'image'|'video'};
type Plan = {schemaVersion:number;title:string;brand:string;format:'portrait'|'square';accent:string;background:string;audio:string|null;scenes:Scene[]};
const fps=30;
const total=(plan:Plan)=>Math.round(plan.scenes.reduce((sum,scene)=>sum+scene.duration,0)*fps);
const SceneView:React.FC<{scene:Scene;plan:Plan;number:number}>=({scene,plan,number})=>{
  const frame=useCurrentFrame();
  const enter=interpolate(frame,[0,12],[45,0],{extrapolateRight:'clamp'});
  const opacity=interpolate(frame,[0,8],[0,1],{extrapolateRight:'clamp'});
  const square=plan.format==='square';
  return <AbsoluteFill style={{background:plan.background,color:'#ffffff',fontFamily:'Arial, Helvetica, sans-serif'}}>
    {scene.media ? <AbsoluteFill style={{opacity:.6}}>{scene.mediaKind==='video'
      ? <Video src={staticFile(scene.media)} muted loop objectFit="cover" style={{width:'100%',height:'100%'}}/>
      : <Img src={staticFile(scene.media)} style={{width:'100%',height:'100%',objectFit:'cover',transform:`scale(${1+frame/1200})`}}/>}</AbsoluteFill>
      : <AbsoluteFill style={{overflow:'hidden'}}><div style={{position:'absolute',width:700,height:700,border:`3px solid ${plan.accent}`,borderRadius:350,top:250,left:350,transform:`rotate(${frame/4}deg) scale(${1+frame/900})`}}/><div style={{position:'absolute',width:360,height:360,background:plan.accent,opacity:.17,top:620,left:90,transform:`rotate(${22+frame/6}deg)`}}/></AbsoluteFill>}
    <AbsoluteFill style={{background:'linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.3) 45%,rgba(0,0,0,.85))'}}/>
    <div style={{position:'absolute',top:square?65:125,left:80,right:80,display:'flex',justifyContent:'space-between',fontSize:26,letterSpacing:3,fontWeight:700}}><span>{plan.brand}</span><span style={{color:plan.accent}}>{String(number).padStart(2,'0')}</span></div>
    <div style={{position:'absolute',left:80,right:90,top:square?240:620,transform:`translateY(${enter}px)`,opacity}}>
      <div style={{color:plan.accent,fontSize:26,fontWeight:700,letterSpacing:4,marginBottom:26,textTransform:'uppercase'}}>{scene.eyebrow}</div>
      <div style={{fontSize:square?72:88,lineHeight:1.06,fontWeight:800,letterSpacing:-3,overflowWrap:'break-word'}}>{scene.headline}</div>
    </div>
    <div style={{position:'absolute',left:80,right:80,bottom:square?145:330,fontSize:square?34:42,lineHeight:1.25,fontWeight:600,opacity,whiteSpace:'pre-line'}}>{scene.caption}</div>
    <div style={{position:'absolute',left:80,right:80,bottom:square?90:230,height:5,background:'#ffffff30'}}><div style={{height:'100%',width:`${Math.min(100,frame/(scene.duration*fps)*100)}%`,background:plan.accent}}/></div>
  </AbsoluteFill>;
};
const FlowVideo:React.FC<Plan>=(plan)=>{
  let from=0;
  return <AbsoluteFill>{plan.audio ? <Audio src={staticFile(plan.audio)}/> : null}{plan.scenes.map((scene,index)=>{
    const duration=Math.round(scene.duration*fps);const start=from;from+=duration;
    return <Sequence key={scene.id} from={start} durationInFrames={duration}><SceneView scene={scene} plan={plan} number={index+1}/></Sequence>;
  })}</AbsoluteFill>;
};
const Root=()=> <Composition id="FlowVideoLite" component={FlowVideo} fps={fps} width={1080} height={1920} durationInFrames={total(sample as Plan)} defaultProps={sample as Plan} calculateMetadata={({props})=>({durationInFrames:total(props),width:1080,height:props.format==='square'?1080:1920})}/>;
registerRoot(Root);
