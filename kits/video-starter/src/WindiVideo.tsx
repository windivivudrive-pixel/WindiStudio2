import {Audio} from '@remotion/media';
import {AbsoluteFill,CanvasImage,Easing,Sequence,interpolate,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {ding,mouseClick,pageTurn,uiSwitch,whoosh} from '@remotion/sfx';
import {WorkflowMapScene} from './WorkflowMapScene';
import {CaptionLayer} from './CaptionLayer';
import {WS1Video} from './WS1Video';
import type {WindiBeat,WindiLayoutProfile,WindiSceneComposition,WindiVideoProps} from './types';

const fallbackProfile=(dark:boolean):WindiLayoutProfile=>({
  id:dark?'dark-cinematic':'paper-editorial',name:dark?'Dark Cinematic':'Paper Editorial',basePreset:dark?'dark-cinematic':'paper-editorial',
  palette:dark?{background:'#0d1212',surface:'#182020',text:'#f7f0dd',accent:'#f05482',border:'#f1e9d4'}:{background:'#d3e9f8',surface:'#fff9e8',text:'#26342f',accent:'#4aa36f',border:'#2d3832'},
  captions:{position:'bottom',style:'boxed'},sceneTypes:[{id:'full-frame',role:'Default',composition:dark?'full-bleed':'framed',textPosition:'bottom',imageFit:'cover'}],
});

const sfxVolume=Math.pow(10,-8/20);
type SfxSource=string;
function SfxCue({at,src}:{at:number;src:SfxSource}){return <Sequence from={at} durationInFrames={75}><Audio src={src} volume={sfxVolume}/></Sequence>;}

function Waveform({profile}:{profile:WindiLayoutProfile}){
  const frame=useCurrentFrame(),p=profile.palette;
  return <div style={{position:'absolute',left:126,right:126,bottom:330,height:92,display:'flex',alignItems:'center',justifyContent:'center',gap:7,pointerEvents:'none',opacity:.88}}>
    {Array.from({length:42},(_,index)=>{
      const pulse=(Math.sin(frame*.24+index*.81)+Math.sin(frame*.071+index*1.7)+2)/4;
      const height=14+pulse*72;
      return <div key={index} style={{width:7,height,background:index%7===0?p.text:p.accent,borderRadius:99,boxShadow:index%7===0?`0 0 12px ${p.text}88`:`0 0 12px ${p.accent}99`}}/>;
    })}
  </div>;
}

function ThumbnailScene({beat,profile,index}:{beat:WindiBeat;profile:WindiLayoutProfile;index:number}){
  const frame=useCurrentFrame(),{fps}=useVideoConfig();const duration=Math.max(1,(beat.endMs-beat.startMs)/1000*fps);const progress=interpolate(frame,[0,duration],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});const enter=interpolate(frame,[0,Math.min(13,duration*.35)],[0,1],{extrapolateRight:'clamp',easing:Easing.out(Easing.cubic)});const isHook=index===0,isCta=beat.layout==='cta-thumbnail';const titleEnter=isHook?1:enter;const p=profile.palette;const scale=1.015+progress*.045;const titleLines=beat.onScreenText.split('\n');
  return <AbsoluteFill style={{background:p.background,overflow:'hidden'}}>
    <AbsoluteFill style={{backgroundImage:'radial-gradient(circle at 9% 8%, rgba(240,201,106,.16), transparent 27%), radial-gradient(circle at 91% 70%, rgba(119,51,76,.22), transparent 35%), linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)',backgroundSize:'auto, auto, 38px 38px, 38px 38px'}}/>
    <div style={{position:'absolute',inset:'48px 42px 42px',border:`2px solid ${p.border}aa`,borderRadius:34,background:'rgba(18,20,23,.82)',boxShadow:'0 26px 68px rgba(0,0,0,.38)',overflow:'hidden'}}>
      <div style={{height:70,borderBottom:`2px solid ${p.border}88`,display:'flex',alignItems:'center',padding:'0 26px',fontSize:18,letterSpacing:2.1,fontWeight:900,color:'#bcb6aa'}}><span style={{display:'inline-flex',gap:9,alignItems:'center'}}><span style={{width:10,height:10,borderRadius:'50%',background:p.accent,boxShadow:`0 0 14px ${p.accent}`}}/>WINDI / WORKFLOW</span><span style={{marginLeft:'auto',color:p.accent}}>SCENE {String(index+1).padStart(2,'0')}</span></div>
      <div style={{position:'absolute',top:104,left:34,right:34,zIndex:2,opacity:titleEnter,transform:`translateY(${(1-titleEnter)*22}px)`}}>
        {isHook&&<div style={{display:'inline-flex',alignItems:'center',border:`1px solid ${p.accent}aa`,background:'rgba(240,201,106,.12)',borderRadius:999,padding:'8px 14px',fontSize:17,fontWeight:900,letterSpacing:1.5,color:p.accent,marginBottom:15}}>VIDEO AI · CÓ QUY TRÌNH</div>}
        <div style={{fontSize:isCta?58:64,lineHeight:.92,fontWeight:950,letterSpacing:'-.07em',color:p.text,textTransform:'uppercase'}}>{titleLines.map((line,lineIndex)=><div key={line} style={{color:isHook&&lineIndex===0?p.accent:p.text}}>{line}</div>)}</div>
      </div>
      <div style={{position:'absolute',left:34,right:34,top:isHook?330:294,height:556,borderRadius:24,overflow:'hidden',border:`2px solid ${p.border}99`,background:'#0b0d10'}}><CanvasImage src={staticFile(beat.image)} style={{width:'100%',height:'100%',objectFit:'cover',scale,translate:`${(progress-.5)*-18}px 0`}}/><div style={{position:'absolute',inset:0,background:'linear-gradient(180deg, rgba(0,0,0,.02), rgba(0,0,0,.20))'}}/></div>
      <div style={{position:'absolute',left:34,right:34,top:isHook?914:878,height:isCta?235:166,borderTop:`2px solid ${p.border}88`,paddingTop:22,display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:20}}>
        <div style={{fontSize:20,lineHeight:1.35,color:'#c8c0b3',maxWidth:620}}>{isCta?'Duyệt từng bước. Làm video tiếp theo nhanh hơn.':'FLOW · SCRIPT · IMAGE · VOICE · RENDER'}</div>
        <div style={{padding:'7px 11px',border:`1px solid ${p.border}99`,fontSize:15,fontWeight:900,color:p.accent,whiteSpace:'nowrap'}}>{isCta?'BẮT ĐẦU':'ĐÃ DUYỆT'}</div>
      </div>
      {isCta&&<div style={{position:'absolute',left:34,right:34,bottom:52,border:`2px solid ${p.accent}`,borderRadius:16,padding:'15px 18px',background:'rgba(240,201,106,.08)',display:'flex',alignItems:'baseline',gap:13}}><span style={{fontSize:44,fontWeight:950,letterSpacing:'-.06em',color:p.accent}}>299K</span><span style={{fontSize:17,fontWeight:900,color:p.text}}>100 TÀI KHOẢN ĐẦU · +20K VOICE CREDIT</span></div>}
    </div>
  </AbsoluteFill>;
}

function Scene({beat,profile,index}:{beat:WindiBeat;profile:WindiLayoutProfile;index:number}){
  const frame=useCurrentFrame(),{fps}=useVideoConfig(),duration=Math.max(1,(beat.endMs-beat.startMs)/1000*fps);const progress=interpolate(frame,[0,duration],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});const enter=interpolate(frame,[0,.5*fps],[0,1],{extrapolateRight:'clamp',easing:Easing.bezier(.16,1,.3,1)});
  if(profile.id==='windi-workflow-map-v03'||profile.id==='windi-workflow-map-v04')return <WorkflowMapScene beat={beat} profile={profile} index={index}/>;
  if(profile.id==='windi-dark-thumbnail-editorial')return <ThumbnailScene beat={beat} profile={profile} index={index}/>;
  const scene=profile.sceneTypes.find(item=>item.id===beat.layout)??profile.sceneTypes[0];const composition:WindiSceneComposition=scene?.composition??'full-bleed';const p=profile.palette;const image=<CanvasImage src={staticFile(beat.image)} style={{width:'100%',height:'100%',objectFit:scene?.imageFit??'cover',scale:1+progress*.065,translate:`${(progress-.5)*-16}px 0`}}/>;const headingStyle={opacity:enter,translate:`0 ${34-enter*34}px`,fontSize:92,lineHeight:.96,fontWeight:950,letterSpacing:'-.065em',textTransform:'uppercase' as const,color:p.text};

  if(composition==='framed')return <AbsoluteFill style={{background:p.background,padding:42,overflow:'hidden'}}><div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(${p.surface}88 2px,transparent 2px),linear-gradient(90deg,${p.surface}88 2px,transparent 2px)`,backgroundSize:'44px 44px'}}/><div style={{position:'relative',height:'100%',border:`4px solid ${p.border}`,borderRadius:34,background:p.surface,boxShadow:`13px 13px 0 ${p.border}33`,overflow:'hidden'}}><div style={{height:78,borderBottom:`4px solid ${p.border}`,background:index%2?p.accent:p.background,display:'flex',alignItems:'center',padding:'0 25px',fontSize:24,fontWeight:900}}>WINDI STORYBOARD <span style={{marginLeft:'auto'}}>{String(index+1).padStart(2,'0')}</span></div><div style={{position:'absolute',left:42,right:42,top:122,height:1030,border:`4px solid ${p.border}`,borderRadius:26,overflow:'hidden',background:p.background}}>{image}</div><div style={{position:'absolute',left:44,right:44,bottom:330,...headingStyle}}>{beat.onScreenText}</div></div></AbsoluteFill>;

  if(composition==='split')return <AbsoluteFill style={{background:p.surface,color:p.text,overflow:'hidden'}}><div style={{height:'61%',overflow:'hidden'}}>{image}</div><div style={{position:'absolute',left:58,right:58,top:'57%',bottom:280,border:`4px solid ${p.border}`,background:p.surface,padding:'58px 46px',display:'flex',alignItems:scene?.textPosition==='top'?'flex-start':scene?.textPosition==='center'?'center':'flex-end'}}><div style={headingStyle}>{beat.onScreenText}</div></div></AbsoluteFill>;

  if(composition==='text-led'||composition==='quote'||composition==='cta')return <AbsoluteFill style={{background:p.background,color:p.text,overflow:'hidden'}}><AbsoluteFill style={{opacity:composition==='text-led'?.22:.38,filter:'saturate(.65) contrast(1.08)'}}>{image}</AbsoluteFill><AbsoluteFill style={{background:`linear-gradient(180deg,${p.background}44,${p.background}dd)`}}/><div style={{position:'absolute',left:64,right:64,top:composition==='cta'?520:390,border:composition==='quote'?`4px solid ${p.border}`:'none',background:composition==='quote'?`${p.surface}ee`:'transparent',padding:composition==='quote'?'58px 48px':0,textAlign:'center',...headingStyle}}>{composition==='quote'?'“':''}{beat.onScreenText}{composition==='quote'?'”':''}</div>{composition==='cta'&&<div style={{position:'absolute',left:220,right:220,bottom:430,height:18,background:p.accent}}/>}</AbsoluteFill>;

  if(composition==='comparison'){
    const parts=beat.onScreenText.split(/\s*(?:\||\/|VS)\s*/i);return <AbsoluteFill style={{background:p.background,color:p.text,overflow:'hidden'}}><div style={{position:'absolute',inset:'0 50% 0 0',overflow:'hidden',borderRight:`5px solid ${p.accent}`}}>{image}</div><div style={{position:'absolute',inset:'0 0 0 50%',overflow:'hidden',filter:'hue-rotate(28deg) saturate(.72)'}}>{image}</div><div style={{position:'absolute',left:40,right:40,top:180,display:'grid',gridTemplateColumns:'1fr 1fr',gap:40,textAlign:'center',...headingStyle}}><span>{parts[0]??beat.onScreenText}</span><span>{parts[1]??'SO SÁNH'}</span></div></AbsoluteFill>;
  }

  return <AbsoluteFill style={{background:p.background,overflow:'hidden'}}>{image}<AbsoluteFill style={{background:`linear-gradient(180deg,${p.background}11,${p.background}22 40%,${p.background}dd)`}}/><div style={{position:'absolute',top:120,left:58,padding:'12px 17px',border:`2px solid ${p.border}`,background:p.accent,color:p.text,fontSize:26,fontWeight:900}}>SCENE {String(index+1).padStart(2,'0')}</div><div style={{position:'absolute',left:64,right:64,...(scene?.textPosition==='top'?{top:260}:scene?.textPosition==='center'?{top:720}:{bottom:420}),...headingStyle}}>{beat.onScreenText}</div></AbsoluteFill>;
}

export function WindiVideo(props:WindiVideoProps){
  if(props.layoutProfile?.renderer==='ws1-reference-hybrid-flow'||props.layoutProfile?.id==='ws1-reference-hybrid-flow')return <WS1Video {...props}/>;
  if(/\bws1\b/i.test(`${props.layoutProfile?.id} ${props.layoutProfile?.name}`))throw new Error('WS1_RENDERER_REQUIRED: refusing generic-layout fallback');
  return <GenericWindiVideo {...props}/>;
}
function GenericWindiVideo(props:WindiVideoProps){const {fps}=useVideoConfig(),profile=props.layoutProfile??fallbackProfile(props.layout==='dark-cinematic');const cues:Array<{beat:number;offset:number;src:SfxSource}>= [{beat:0,offset:0,src:whoosh},{beat:0,offset:9,src:mouseClick},{beat:3,offset:0,src:whoosh},{beat:4,offset:7,src:ding},{beat:5,offset:0,src:uiSwitch},{beat:6,offset:0,src:pageTurn},{beat:7,offset:0,src:mouseClick},{beat:7,offset:14,src:ding},{beat:9,offset:0,src:uiSwitch},{beat:10,offset:0,src:ding},{beat:12,offset:0,src:whoosh},{beat:12,offset:20,src:ding}];return <AbsoluteFill style={{fontFamily:'"SVN-Calling Code", "Calling Code", ui-monospace, monospace',color:profile.palette.text}}>{props.beats.map((beat,index)=><Sequence key={beat.id} from={Math.floor(beat.startMs/1000*fps)} durationInFrames={Math.max(1,Math.ceil((beat.endMs-beat.startMs)/1000*fps))}><Scene beat={beat} profile={profile} index={index}/></Sequence>)}<Waveform profile={profile}/>{cues.map((cue,index)=>{const beat=props.beats[cue.beat];return beat?<SfxCue key={`${cue.beat}-${cue.offset}-${index}`} at={Math.floor(beat.startMs/1000*fps)+cue.offset} src={cue.src}/>:null;})}<Audio src={staticFile(props.audio)}/><CaptionLayer captions={props.captions} profile={profile}/></AbsoluteFill>}
