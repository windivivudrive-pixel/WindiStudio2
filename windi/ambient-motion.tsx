'use client';

import {useEffect,useRef,useState} from 'react';
import {Pause,Play,Sparkles,Terminal,Film} from 'lucide-react';
import {PixelDuck} from './pixel-duck';
import {makeDuckFall,makeDuckFlight} from '@/lib/ambient-flight';
import {DuckHuntModal} from './duck-hunt-modal';

const preferenceKey='windi:ambient-motion';
export function AmbientMotion(){
  const rootRef=useRef<HTMLDivElement>(null),duckRef=useRef<HTMLButtonElement>(null);
  const toggleRef=useRef<HTMLButtonElement>(null),shootRef=useRef<()=>void>(()=>{});
  const animationRef=useRef<Animation|undefined>(undefined);
  const [phase,setPhase]=useState<'waiting'|'flying'|'hit'|'falling'>('waiting');
  const [hits,setHits]=useState(0);
  const [showHuntModal,setShowHuntModal]=useState(false);
  const [enabled,setEnabled]=useState(false),[ready,setReady]=useState(false),[reduced,setReduced]=useState(false);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>{setReduced(media.matches);};update();
    let saved=true;try{saved=localStorage.getItem(preferenceKey)!=='off';}catch{/* Storage can be unavailable. */}
    setEnabled(saved);setReady(true);media.addEventListener('change',update);
    return()=>media.removeEventListener('change',update);
  },[]);
  const running=ready&&enabled&&!reduced;
  useEffect(()=>{
    const page=rootRef.current?.closest<HTMLElement>('.motion-page'),duck=duckRef.current;
    if(!page||!duck)return;
    let timer:ReturnType<typeof setTimeout>|undefined,disposed=false;
    let stage:typeof phase='waiting';
    const changeStage=(next:typeof phase)=>{stage=next;setPhase(next);};
    const cancelAnimation=()=>{if(animationRef.current){animationRef.current.onfinish=null;animationRef.current.cancel();animationRef.current=undefined;}};
    const stop=()=>{
      if(timer)clearTimeout(timer);
      cancelAnimation();duck.style.opacity='0';
      if(document.activeElement===duck)toggleRef.current?.focus({preventScroll:true});
      changeStage('waiting');
    };
    const queueFlight=(delay:number)=>{
      stop();if(!disposed&&running&&!document.hidden)timer=setTimeout(fly,delay);
    };
    const fly=()=>{
      if(disposed||document.hidden||!running)return;
      const flight=makeDuckFlight(window.innerWidth,window.innerHeight);
      duck.style.setProperty('--duck-direction',String(flight.direction));
      changeStage('flying');
      const animation=duck.animate(flight.points,{duration:flight.duration,easing:'linear',fill:'none'});
      animationRef.current=animation;
      animation.onfinish=()=>queueFlight(flight.delay);
    };
    shootRef.current=()=>{
      // A synchronous guard prevents repeated taps from scoring the same duck twice.
      if(stage!=='flying'||!running||document.hidden||disposed)return;
      const bounds=duck.getBoundingClientRect();
      const field=duck.parentElement!.getBoundingClientRect();
      cancelAnimation();
      duck.style.transform=`translate3d(${bounds.left-field.left}px,${bounds.top-field.top}px,0)`;
      duck.style.opacity='1';changeStage('hit');
      setHits(count => {
        const next = count + 1;
        if (next === 3 || (next > 3 && next % 3 === 0)) {
          setTimeout(() => {
            setShowHuntModal(true);
          }, 850);
        }
        return next;
      });
      timer=setTimeout(()=>{
        if(disposed)return;
        changeStage('falling');
        const animation=duck.animate(makeDuckFall(bounds.left-field.left,bounds.top-field.top,field.height),{duration:1150,easing:'cubic-bezier(.45,0,1,.7)',fill:'forwards'});
        animationRef.current=animation;
        animation.onfinish=()=>queueFlight(2200);
      },180);
    };
    const refresh=()=>{stop();page.dataset.motion=running&&!document.hidden?'running':'paused';if(running&&!document.hidden)timer=setTimeout(fly,800);};
    refresh();document.addEventListener('visibilitychange',refresh);window.addEventListener('resize',refresh);
    return()=>{disposed=true;stop();shootRef.current=()=>{};delete page.dataset.motion;document.removeEventListener('visibilitychange',refresh);window.removeEventListener('resize',refresh);};
  },[running]);
  const toggle=()=>{
    const next=!enabled;setEnabled(next);
    try{localStorage.setItem(preferenceKey,next?'on':'off');}catch{/* Preference is optional. */}
  };
  return <>
    <div ref={rootRef} className="ambient-control">
      <div className="ambient-background" aria-hidden="true"><span className="ambient-star star-one">✦</span><span className="ambient-star star-two">✧</span><span className="ambient-star star-three">+</span></div>
      <div className="duck-playfield">
        <button ref={duckRef} type="button" className="ambient-duck" data-phase={phase} aria-label="Bắn vịt pixel" title="Bấm để bắn · Enter / Space khi dùng bàn phím" tabIndex={running&&phase==='flying'?0:-1} aria-disabled={phase!=='flying'} onClick={()=>shootRef.current()} onFocus={()=>{if(phase==='flying')animationRef.current?.pause();}} onBlur={()=>{if(phase==='flying')animationRef.current?.play();}}>
          <span className="duck-facing"><PixelDuck/></span><span className="duck-impact" aria-hidden="true">✦</span><span className="duck-points" aria-hidden="true">+100</span>
        </button>
      </div>
      <span className="sr-only" role="status">{hits>0?`Trúng vịt! ${hits*100} điểm.`:''}</span>
      <button ref={toggleRef} type="button" className="motion-toggle" disabled={!ready||reduced} aria-pressed={running} onClick={toggle} aria-label={reduced?'Chuyển động đã giảm theo cài đặt thiết bị':running?'Tắt chuyển động trang trí':'Bật chuyển động trang trí'}>{running?<Pause size={12}/>:<Play size={12}/>}<span>{reduced?'Giảm chuyển động':running?'Chuyển động: bật':'Chuyển động: tắt'}</span>{hits>0&&<span className="duck-score">{hits*100} PTS</span>}</button>
    </div>
    <DuckHuntModal isOpen={showHuntModal} onClose={() => setShowHuntModal(false)} />
  </>;
}

export function FloatingDetails({kind='hero'}:{kind?:'hero'|'kit'}){
  return <div className={`floating-details floating-${kind}`} aria-hidden="true"><span className="floating-chip">{kind==='hero'?<Terminal size={16}/>:<Film size={16}/>}<span>{kind==='hero'?'MAKE SOMETHING':'FRAME BY FRAME'}</span></span><span className="floating-spark"><Sparkles size={27}/></span><span className="pixel-cross">+</span></div>;
}
