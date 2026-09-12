import {Audio} from '@remotion/media';
import {ding,mouseClick,pageTurn,uiSwitch,whoosh} from '@remotion/sfx';
import {AbsoluteFill,CanvasImage,Sequence,interpolate,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import type {WindiVideoProps} from './types';
import {ws1CaptionGroups} from './ws1-captions';

// Channel palette: blue leads; green only marks a supporting state. Pink and
// yellow are intentionally excluded so every episode stays on-brand.
const C={blue:'#081a2a',paper:'#102b3a',ink:'#f3f0df',accent:'#7494bd',border:'#9bc8c3',green:'#5da57c'};
const SFX_VOLUME=Math.pow(10,-8/20);
function SfxCue({src}:{src:string}){const f=useCurrentFrame();const volume=interpolate(f,[0,5,58,75],[0,SFX_VOLUME,SFX_VOLUME,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});return <Sequence durationInFrames={76}><Audio src={src} volume={volume}/></Sequence>}
export function WS1Video(props:WindiVideoProps){
  const f=useCurrentFrame(),{fps,durationInFrames}=useVideoConfig(),ms=f/fps*1000;
  const index=Math.max(0,props.beats.findIndex(b=>ms>=b.startMs&&ms<b.endMs)),beat=props.beats[index];
  const local=(ms-beat.startMs)/1000*fps,progress=Math.min(1,Math.max(0,(ms-beat.startMs)/(beat.endMs-beat.startMs)));
  const enter=interpolate(local,[0,12],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const copy=props.presentation?.scenes[beat.id]??{titleLines:beat.onScreenText.split('\n'),label:beat.onScreenText.split('\n')[0],tag:beat.spokenAnchor};
  const visibleCaptions=props.captions.filter(c=>!(props.sampleRanges??[]).some(r=>c.startMs>=r.startMs&&c.startMs<r.endMs));
  const caps=ws1CaptionGroups(visibleCaptions).find(g=>ms>=g[0].startMs&&ms<=g[g.length-1].endMs+100);
  const amplitude=props.audioEnvelope?.[Math.min((props.audioEnvelope?.length??1)-1,Math.floor(ms/20))]??0;
  return <AbsoluteFill style={{backgroundColor:C.blue,color:C.ink,fontFamily:'"SVN-Calling Code",monospace',backgroundImage:'linear-gradient(rgba(155,214,208,.14) 2px,transparent 2px),linear-gradient(90deg,rgba(155,214,208,.14) 2px,transparent 2px)',backgroundSize:'52px 52px',backgroundPosition:`${f*.42%52}px ${f*.24%52}px`,overflow:'hidden'}}>
    <AbsoluteFill style={{inset:-250,background:'radial-gradient(circle,rgba(91,214,191,.20),transparent 58%)',transform:`translate(${Math.sin(f/92)*250}px,${Math.cos(f/117)*180}px)`}}/>
    <div style={{position:'absolute',top:164,left:80,width:850,border:`3px solid ${C.border}`,background:C.paper,borderRadius:13,padding:'14px 20px',fontSize:32,lineHeight:1.28,boxShadow:`5px 5px 0 ${C.border}25`,whiteSpace:'nowrap'}}>WindiStudio - Sử Dụng AI Hiệu Quả</div>
    <div style={{position:'absolute',top:300,left:80,fontSize:26,letterSpacing:3}}>{props.presentation?.eyebrow??'WINDISTUDIO / AI TOOLBOX'}</div>
    <div style={{position:'absolute',top:368,left:80,width:850,transform:`translate(${Math.sin(f/52)*4}px,${Math.sin(f/38)*9+(1-enter)*22}px) rotate(${Math.sin(f/71)*.45}deg)`}}>
      <div style={{fontSize:86,lineHeight:1.08,letterSpacing:-3.5,fontWeight:800,marginBottom:36}}>{copy.titleLines.map((line,i)=><div key={i} style={{color:i?C.accent:C.ink}}>{line}</div>)}</div>
      <div style={{border:`4px solid ${C.border}`,borderRadius:20,overflow:'hidden',background:C.paper,boxShadow:`9px 10px 0 ${C.border}35`}}>
        <div style={{height:58,background:index%4===1?C.green:C.accent,borderBottom:`3px solid ${C.border}`,display:'flex',alignItems:'center',padding:'0 22px',gap:20,fontSize:27}}><span>● ● ●</span><span>{copy.label}</span><span style={{marginLeft:'auto'}}>×</span></div>
        <div style={{height:410,overflow:'hidden',position:'relative'}}><CanvasImage src={staticFile(beat.image)} style={{width:'100%',height:'100%',objectFit:'cover',transform:`scale(${1.18+progress*.035})`,transformOrigin:'center'}}/></div>
        <div style={{padding:'20px 28px 18px'}}>
          <div style={{height:86,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{Array.from({length:56},(_,i)=><div key={i} style={{width:6,borderRadius:6,height:6+Math.min(1,amplitude*2.5)*(22+52*(.5+.5*Math.sin(i*.8+f*.16))),background:i%8===0?C.ink:C.accent}}/>)}</div>
          <div style={{height:5,background:'#081a2a',marginTop:10}}><div style={{width:`${progress*100}%`,height:'100%',background:C.accent}}/></div>
        </div>
      </div>
      <div style={{display:'inline-block',marginTop:42,padding:'13px 20px',background:C.green,border:`3px solid ${C.border}`,borderRadius:9,fontSize:30,boxShadow:`4px 4px 0 ${C.border}25`}}>{copy.tag}</div>
    </div>
    {caps&&<div style={{position:'absolute',top:1430,left:80,width:850,display:'flex',justifyContent:'center'}}><div style={{background:C.paper,border:`3px solid ${C.border}`,borderRadius:12,padding:'18px 25px',fontSize:44,lineHeight:1.3,textAlign:'center',fontWeight:800,display:'flex',justifyContent:'center',flexWrap:'wrap',gap:'4px 18px',boxShadow:`5px 5px 0 ${C.border}25`}}>{caps.map((c,i)=>{const elapsed=ms-c.startMs;const popup=elapsed<0?1:interpolate(elapsed,[0,110,180],[.82,1.07,1],{extrapolateRight:'clamp'});return <span key={i} style={{display:'inline-block',opacity:1,color:elapsed>=0?C.accent:C.ink,transform:`scale(${popup})`}}>{c.text.trim()}</span>;})}</div></div>}
    <div style={{position:'absolute',left:80,top:1640,width:850,height:12,border:`2px solid ${C.border}`,borderRadius:6,background:C.paper,overflow:'hidden'}}><div style={{width:`${100*f/durationInFrames}%`,height:'100%',background:C.accent}}/></div>
    <div style={{position:'absolute',left:80,top:1682,width:850,fontSize:27,display:'flex',justifyContent:'space-between'}}><span>WINDISTUDIO / AI TOOLBOX</span><span>{String(index+1).padStart(2,'0')} / {String(props.beats.length).padStart(2,'0')}</span></div>
    {[
      [0,0,whoosh],[0,9,mouseClick],[1,0,uiSwitch],[1,18,uiSwitch],[2,0,uiSwitch],[3,0,whoosh],[3,18,ding],[4,0,mouseClick],[4,16,ding],[5,0,uiSwitch],[6,0,pageTurn],[7,0,ding],[7,18,mouseClick],
    ].map(([beat,offset,src],i)=>{const b=props.beats[beat as number];return b?<Sequence key={`${beat}-${offset}-${i}`} from={Math.floor(b.startMs/1000*fps)+(offset as number)}><SfxCue src={src as string}/></Sequence>:null})}
    <Audio src={staticFile(props.audio)}/>
  </AbsoluteFill>;
}
