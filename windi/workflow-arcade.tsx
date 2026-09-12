'use client';
import {useEffect,useReducer,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {arcadeReducer,arcadeStages,initialArcadeState} from './arcade-state';
import {PixelDuck} from './pixel-duck';
const ArcadeCanvas=dynamic(()=>import('./arcade-canvas'),{ssr:false});
export function WorkflowArcade(){
  const [state,dispatch]=useReducer(arcadeReducer,initialArcadeState);
  const [systemReduced,setSystemReduced]=useState(false),[quiet,setQuiet]=useState(false),[visible,setVisible]=useState(false),[foreground,setForeground]=useState(true),[failed,setFailed]=useState(false),[ready,setReady]=useState(false);
  const reduced=systemReduced||quiet;
  const root=useRef<HTMLDivElement>(null);const stage=arcadeStages[state.stage];
  useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>{setSystemReduced(media.matches);setReady(false);if(media.matches)dispatch({type:'manual'});};update();media.addEventListener('change',update);const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting));if(root.current)observer.observe(root.current);const foreground=()=>setForeground(!document.hidden);foreground();document.addEventListener('visibilitychange',foreground);return()=>{media.removeEventListener('change',update);observer.disconnect();document.removeEventListener('visibilitychange',foreground);};},[]);
  useEffect(()=>{if(!visible||!foreground||reduced||state.paused||(!state.auto&&!state.acting))return;let previous=performance.now();const id=setInterval(()=>{const now=performance.now();dispatch({type:'tick',dt:now-previous});previous=now;},50);return()=>clearInterval(id);},[visible,foreground,reduced,state.auto,state.acting,state.paused]);
  const action=()=>{dispatch({type:'act',instant:reduced});};
  return <div ref={root} className="workflow-arcade" data-windi-no-translate data-stage={state.stage} data-mode={state.auto?'auto':'manual'} onKeyDown={e=>{if((e.target as HTMLElement).closest('a'))return;const actions:Record<string,()=>void>={ArrowLeft:()=>dispatch({type:'move',direction:-1}),ArrowRight:()=>dispatch({type:'move',direction:1}),ArrowUp:()=>dispatch({type:'choose',direction:-1}),ArrowDown:()=>dispatch({type:'choose',direction:1}),a:action,A:action,b:()=>dispatch({type:'reset'}),B:()=>dispatch({type:'reset'})};if(actions[e.key]){e.preventDefault();actions[e.key]();}}}>
    <div className="arcade-brand"><span>WINDI<span className="arcade-brand-light"> / VIDEO STUDIO</span></span><span className="arcade-power"/> </div>
    <div className="arcade-bezel"><div className="arcade-screen" role="group" aria-label="Quy trình làm video cùng Windi">
      {!reduced&&!failed&&<ArcadeCanvas state={state} running={visible&&foreground&&!state.paused} onReady={()=>setReady(true)} onFailure={()=>setFailed(true)}/>}
      {(reduced||failed||!ready)&&<div className="arcade-fallback"><PixelDuck/><div className="fallback-folder">{state.stage===9?'✓':'W'}</div><strong>{stage.name}</strong><p>{stage.copy}</p></div>}
      <div className="arcade-hud"><span>{stage.room}</span></div>
      <div className="arcade-dialogue" aria-live="polite" aria-atomic="true"><span>{[2,3,4,9].includes(state.stage)?'BẠN':'WINDI'}</span><strong>{stage.title}</strong>{state.approved[state.stage]&&<b className="arcade-approved">✓ ĐÃ DUYỆT</b>}</div>
      {!!stage.choices.length&&<div className="arcade-choices" role="group" aria-label={`Lựa chọn ${stage.name}`}>{stage.choices.map((choice,i)=><button type="button" key={choice} aria-pressed={(state.choices[state.stage]||0)===i} onClick={()=>dispatch({type:'select',index:i})}>{(state.choices[state.stage]||0)===i?'▸':'·'} {choice}</button>)}</div>}
      {state.stage===8&&<div className="arcade-render-progress" role="progressbar" aria-label="Tiến độ dựng minh họa" aria-valuenow={Math.round(state.progress*100)} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${state.progress*100}%`}}/><b>{Math.round(state.progress*100)}%</b></div>}
    </div></div>
    <div className="arcade-controls"><div className="arcade-dpad" role="group" aria-label="Xem các bước làm video"><button className="dpad-up" aria-label="Lựa chọn trước" onClick={()=>dispatch({type:'choose',direction:-1})}>▴</button><button className="dpad-left" aria-label="Bước trước" onClick={()=>dispatch({type:'move',direction:-1})}>◂</button><span className="dpad-center"/><button className="dpad-right" aria-label="Bước tiếp" onClick={()=>dispatch({type:'move',direction:1})}>▸</button><button className="dpad-down" aria-label="Lựa chọn tiếp" onClick={()=>dispatch({type:'choose',direction:1})}>▾</button></div><div className="arcade-ab"><div><button aria-label="Chọn lại bước này" onClick={()=>dispatch({type:'reset'})}>B</button><span>CHỌN LẠI</span></div><div><button className="arcade-a" aria-label={`A: ${stage.action}`} onClick={action}>A</button><span>{[2,3,4].includes(state.stage)?'DUYỆT':'TIẾP TỤC'}</span></div></div></div>
    <div className="arcade-bottom"><span className="arcade-speaker"/><button disabled={reduced} aria-pressed={state.auto} onClick={()=>dispatch({type:'toggle'})}>{state.auto?'Ⅱ TẠM DỪNG':'▶ XEM TIẾP'}</button><button onClick={()=>{dispatch({type:'replay'});if(reduced)dispatch({type:'manual'});}}>↺ XEM LẠI</button><span className="arcade-speaker"/></div>
    <button className="arcade-motion" disabled={systemReduced} aria-pressed={reduced} onClick={()=>{setQuiet(!quiet);setReady(false);dispatch({type:'manual'});}}>{reduced?'✓ Giảm chuyển động':'Giảm chuyển động'}</button>
  </div>;
}
