import type {Caption} from '@remotion/captions';
import {AbsoluteFill,Easing,Sequence,interpolate,useCurrentFrame,useVideoConfig} from 'remotion';
import type {WindiLayoutProfile} from './types';

export function CaptionLayer({captions,profile}:{captions:Caption[];profile:WindiLayoutProfile}){
  const {fps}=useVideoConfig();
  if(profile.id==='windi-workflow-map-v03'||profile.id==='windi-workflow-map-v04')return <PhraseCaptions captions={captions} profile={profile}/>;
  return <AbsoluteFill>{captions.map((caption,index)=>{const next=captions[index+1];const from=Math.floor(caption.startMs/1000*fps);const until=Math.min(next?.startMs??caption.endMs+260,caption.endMs+360);const duration=Math.max(4,Math.ceil((until-caption.startMs)/1000*fps));return <Sequence key={`${caption.startMs}-${index}`} from={from} durationInFrames={duration}><CaptionWord text={caption.text} profile={profile}/></Sequence>;})}</AbsoluteFill>;
}
function CaptionWord({text,profile}:{text:string;profile:WindiLayoutProfile}){
  const frame=useCurrentFrame(),{fps}=useVideoConfig(),p=profile.palette,thumbnail=profile.id==='windi-dark-thumbnail-editorial';const enter=interpolate(frame,[0,Math.min(6,fps*.2)],[.72,1],{extrapolateRight:'clamp',easing:Easing.out(Easing.back(1.35))});const plain=profile.captions.style==='plain';const position=profile.captions.position;
  return <AbsoluteFill style={{justifyContent:position==='top'?'flex-start':position==='center'?'center':'flex-end',alignItems:'center',padding:position==='top'?'210px 68px 0':position==='bottom'?(thumbnail?'0 72px 108px':'0 68px 210px'):'0 68px',pointerEvents:'none'}}><div style={{maxWidth:thumbnail?760:900,padding:plain?0:(thumbnail?'14px 24px':'18px 26px'),borderRadius:profile.captions.style==='pill'?999:22,border:plain?'none':`3px solid ${p.border}`,background:plain?'transparent':`${p.surface}ee`,boxShadow:plain?'none':'8px 8px 0 rgba(0,0,0,.18)',fontSize:thumbnail?48:58,lineHeight:1,fontWeight:950,textAlign:'center',textTransform:'uppercase',letterSpacing:thumbnail?'-.04em':undefined,textShadow:plain?'0 4px 18px rgba(0,0,0,.65)':'none',color:p.accent,transform:`scale(${enter}) translateY(${(1-enter)*18}px)`}}>{text}</div></AbsoluteFill>;
}

function PhraseCaptions({captions,profile}:{captions:Caption[];profile:WindiLayoutProfile}){
 const frame=useCurrentFrame(),{fps}=useVideoConfig(),ms=frame/fps*1000;
 const sentences:Caption[][]=[];let current:Caption[]=[];
 captions.forEach((c,i)=>{current.push(c);if(/[.!?]$/.test(c.text)||i===captions.length-1){sentences.push(current);current=[];}});
 const groups:Caption[][]=[];
 sentences.forEach(sentence=>{if(sentence.length<3&&groups.length&&groups[groups.length-1].length+sentence.length<=9){groups[groups.length-1].push(...sentence);return;}const count=Math.ceil(sentence.length/7);let offset=0;for(let i=0;i<count;i++){const size=Math.ceil((sentence.length-offset)/(count-i));groups.push(sentence.slice(offset,offset+size));offset+=size;}});
 const group=groups.find((g,i)=>ms>=g[0].startMs&&ms<(groups[i+1]?.[0].startMs??g[g.length-1].endMs+160));if(!group)return null;
 return <div style={{position:'absolute',left:76,right:220,bottom:390,minHeight:92,display:'flex',alignItems:'center',justifyContent:'center',flexWrap:'wrap',gap:'8px 11px',padding:'14px 18px',background:'#191d1df5',border:'2px solid #66604b',borderRadius:16}}>{group.map((word,i)=>{const elapsed=ms-word.startMs;const pop=interpolate(elapsed,[0,130],[.8,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.out(Easing.back(1.3))});return <span key={i} style={{display:'inline-block',fontSize:34,lineHeight:1.25,fontWeight:900,color:elapsed>=0?profile.palette.accent:'#a9a99c',opacity:elapsed>=0?1:.38,transform:`scale(${elapsed>=0?pop:1})`}}>{word.text}</span>;})}</div>;
}
