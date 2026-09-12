'use client';
import {useEffect,useRef} from 'react';
import {Application,Assets,Container,Graphics,Sprite,Text,Texture} from 'pixi.js';
import {createArcadeDog} from './arcade-dog';
import type {ArcadeState} from './arcade-state';

type Props={state:ArcadeState;running:boolean;onReady:()=>void;onFailure:()=>void};
const W=360,H=540;
export default function ArcadeCanvas(props:Props){
  const host=useRef<HTMLDivElement>(null),latest=useRef(props);latest.current=props;
  useEffect(()=>{
    if(!host.current)return;const mount=host.current;
    let disposed=false,initialized=false,app:Application|undefined,scene:Container|undefined;
    let revision=-1,stage=-1,theme='',choice=-1,time=0,sceneTime=0,lastState:ArcadeState|undefined;
    let animate:((t:number,s:ArcadeState)=>void)|undefined;
    const render=()=>{if(!app||!initialized||disposed||!birdFrames.length)return;const p=latest.current;
      const currentTheme=document.documentElement.dataset.theme||'light';
      const selection=p.state.choices[3]||0;
      if(revision!==p.state.revision||stage!==p.state.stage||theme!==currentTheme||choice!==selection){
        scene?.destroy({children:true});scene=new Container();app.stage.addChild(scene);
        stage=p.state.stage;revision=p.state.revision;theme=currentTheme;choice=selection;sceneTime=time;
        animate=buildScene(scene,stage,theme==='dark',selection,birdFrames);
      }
      animate?.(time-sceneTime,p.state);app.render();lastState=p.state;
    };
    let birdFrames:Texture[]=[];
    const observer=new ResizeObserver(()=>{if(app&&initialized&&!disposed){const width=mount.clientWidth;app.renderer.resize(width,width*1.5);app.stage.scale.set(width/W);render();}});observer.observe(mount);
    const themeObserver=new MutationObserver(render);themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    async function init(){try{
      app=new Application();await app.init({width:mount.clientWidth||W,height:(mount.clientWidth||W)*1.5,backgroundAlpha:0,antialias:false,resolution:Math.min(devicePixelRatio||1,2),autoDensity:true,autoStart:false,sharedTicker:false,preference:'webgl'});initialized=true;
      if(disposed){app.destroy(true,{children:true});return;}
      app.stage.scale.set((mount.clientWidth||W)/W);mount.appendChild(app.canvas);
      birdFrames=await Promise.all(['/arcade/bird-up.svg','/arcade/bird-down.svg'].map(src=>Assets.load<Texture>({src,data:{scaleMode:'nearest'}})));
      if(disposed)return;
      render();latest.current.onReady();
      app.ticker.maxFPS=40;
      app.ticker.add(ticker=>{if(latest.current.running){time+=Math.min(ticker.deltaMS,50)/1000;render();}});
      if(latest.current.running)app.start();
    }catch{if(!disposed)latest.current.onFailure();}}
    void init();
    // Synchronize React state without reinitializing the renderer or allocating per frame.
    const sync=setInterval(()=>{if(!initialized||disposed||!birdFrames.length)return;if(latest.current.state!==lastState)render();if(latest.current.running)app?.start();else app?.stop();},80);
    return()=>{disposed=true;clearInterval(sync);observer.disconnect();themeObserver.disconnect();if(initialized&&app)app.destroy(true,{children:true});};
  },[]);
  return <div ref={host} className="arcade-canvas" aria-hidden="true"/>;
}

function buildScene(root:Container,index:number,dark:boolean,layout:number,birds:Texture[]){
  const ink=dark?0xdad8c8:0x304739,paper=dark?0x263a35:0xf4f0d9,wall=dark?0x182d28:0xdde4c8,green=0xabc581,orange=0xec996e,blue=0x9fbcc4;
  const moving:Array<(t:number,s:ArcadeState)=>void>=[];
  const box=(x:number,y:number,w:number,h:number,color:number,parent:Container=root)=>{const g=new Graphics().rect(0,0,w,h).fill(color);g.position.set(x,y);parent.addChild(g);return g;};
  const line=(x:number,y:number,w:number,color=ink)=>box(x,y,w,2,color);
  const label=(text:string,x:number,y:number,size=12,color=ink,parent:Container=root)=>{const t=new Text({text,style:{fontFamily:'monospace',fontSize:size,fontWeight:'bold',fill:color}});t.position.set(x,y);parent.addChild(t);return t;};
  const frame=(x:number,y:number,w:number,h:number,color=paper)=>{box(x+4,y+5,w,h,dark?0x10201c:0x9ba88e);box(x,y,w,h,ink);return box(x+3,y+3,w-6,h-6,color);};
  const plant=(x:number,y:number)=>{box(x+5,y+20,22,24,orange);box(x+14,y,5,25,green);box(x,y+5,16,9,green);box(x+17,y-5,15,10,green);};
  box(0,0,W,H,wall);if(index===3&&layout===1)box(115,128,220,185,0x182d28);box(0,350,W,190,dark?0x233730:0xc9d0b5);line(0,350,W);
  for(let x=0;x<W;x+=40)box(x,352,1,188,dark?0x2d443a:0xb7c2a5);
  for(let y=370;y<H;y+=40)line(0,y,W,dark?0x2d443a:0xb7c2a5);
  frame(24,135,85,103,blue);box(63,138,4,97,ink);line(27,183,78);box(34,154,18,8,paper);box(77,204,22,8,paper);plant(302,320);
  const dogRig=createArcadeDog(),dog=dogRig.view;root.addChild(dog);
  const bird=new Sprite(birds[0]);bird.anchor.set(.5);bird.width=65;bird.height=65;bird.position.set(90,299);root.addChild(bird);
  moving.push((t,s)=>{bird.texture=birds[Math.floor(t*6)%2];bird.y=299+Math.sin(t*3)*7;bird.x=90+Math.sin(t)*8;});
  const desk=()=>{
    // Chair and cast shadow sit behind the character; the desk front is drawn last.
    box(190,388,140,11,0x14251e).alpha=.25;
    box(218,279,72,68,0x26372d);box(224,285,60,57,0x637f65);
  };
  const miniPicture=(x:number,y:number,w:number,h:number,seed:number)=>{frame(x,y,w,h,seed%2?blue:green);box(x+9,y+9,12,12,0xf4d790);const mountain=new Graphics().poly([x+5,y+h-5,x+w*.4,y+h*.42,x+w*.63,y+h*.7,x+w-5,y+h*.25,x+w-5,y+h-5]).fill(seed%2?0x5b796b:0x7a9161);root.addChild(mountain);};
  if(index===0){desk();frame(132,150,180,61);label('VIDEO WORKFLOW',149,166,18);label('CHỐT HƯỚNG KỂ',158,190,11);const folder=box(75,310,37,25,orange);moving.push(t=>{folder.x=75+Math.sin(t)*8;folder.y=310+Math.sin(t*3)*7;});}
  if(index===1||index===2){
    for(let i=0;i<3;i++){const sheet=new Container();root.addChild(sheet);sheet.position.set(127+i*62,161+(i%2)*10);box(3,4,53,71,ink,sheet);box(0,0,53,71,paper,sheet);label('0'+(i+1),8,9,16,ink,sheet);for(let j=0;j<3;j++)box(8,35+j*8,36-j*6,2,green,sheet);moving.push((t,s)=>{sheet.y=161+(i%2)*10+Math.sin(t*2+i)*5;sheet.scale.set(index===2&&(s.choices[2]||0)===i?1.12:1);sheet.alpha=index===1?Math.min(1,.3+t*.5-i*.15):1;});}desk();
  }
  if(index===3){
    const colors=[paper,0x263132,blue];for(let i=0;i<3;i++){const x=123+i*66;frame(x,143,58,112,colors[i]);label(['Aa','◒','REF'][i],x+9,165,19,i===1?0xe4d9bd:ink);box(x+9,204,38,3,i===1?orange:green);box(x+9,214,27,3,i===1?orange:green);}
    const selector=new Graphics().rect(119+layout*66,139,66,120).stroke({color:orange,width:3});root.addChild(selector);desk();
  }
  if(index===4){frame(122,137,206,110);for(let i=0;i<4;i++){box(134+i*47,154,38,44,i%2?orange:green);label(['HOOK','BEAT','BEAT','END'][i],134+i*47,207,10);}const cursor=box(133,229,36,4,orange);moving.push(t=>cursor.x=134+(Math.floor(t*1.5)%4)*47);desk();}
  if(index===5){for(let i=0;i<4;i++)miniPicture(130+(i%2)*98,132+Math.floor(i/2)*94,85,80,i);dog.x=272;dog.y=399;moving.push(t=>{bird.x=90+Math.sin(t*1.2)*20;bird.y=255+Math.cos(t*2)*25;dog.y=399;});label('ASSETS / 04',140,337,12);}
  if(index===6){
    box(119,128,210,173,dark?0x10201c:0xb8c5aa);for(let i=0;i<7;i++)for(let j=0;j<5;j++)box(124+i*29,134+j*32,24,27,dark?0x263a32:0xa7b69b);
    frame(171,146,115,26,orange);label('● ON AIR',190,153,12,0x26372f);box(150,243,6,93,ink);box(138,229,29,45,ink);box(141,232,23,36,blue);box(131,334,46,5,ink);
    for(let i=0;i<19;i++){const bar=box(124+i*10,202,5,20,green);moving.push(t=>{bar.height=5+Math.abs(Math.sin(t*4+i*.8))*28;bar.y=208-bar.height/2;});}
    moving.push(t=>{bird.position.set(97,274+Math.sin(t*3)*4);dog.x=277;dog.y=405;});
  }
  if(index===7||index===8){
    frame(120,132,208,145,dark?0x132720:paper);for(let row=0;row<3;row++)for(let col=0;col<4;col++)box(133+col*46,150+row*29,40,20,[green,blue,orange][row]);
    const playhead=box(132,145,2,104,ink);moving.push((t,s)=>playhead.x=132+(index===8?s.progress:(t*.2)%1)*182);
    label(index===8?'RENDER / LOCAL':'VOICE + CAPTIONS',135,254,11);
    if(index===7){const words=['Từng','từ','đúng','nhịp.'].map((word,i)=>label(word,40+i*75,397,16));moving.push(t=>words.forEach((word,i)=>word.alpha=Math.floor(t*2)%4===i?1:.3));}desk();
  }
  if(index===9){
    frame(129,131,108,192,layout===1?0x1b2924:paper);miniPicture(137,140,92,109,layout);label('CÂU CHUYỆN',143,263,10,layout===1?0xe7e2ce:ink);label('CỦA BẠN.',143,280,12,layout===1?0xe7e2ce:ink);
    for(let i=0;i<3;i++){const check=label(['✓ VIDEO','✓ VOICE','✓ CAPTION'][i],251,157+i*24,11);moving.push((t,s)=>check.alpha=s.progress>i*.25?1:.25);}
    moving.push((t,s)=>{dog.x=254;dog.y=405-(s.acting?Math.abs(Math.sin(t*4))*30:0);bird.position.set(75+Math.sin(t*2)*25,289+Math.cos(t*2)*22);});
    for(let i=0;i<24;i++){const confetti=box((i*73)%W,140+(i*47)%240,4,7,[orange,green,blue][i%3]);moving.push((t,s)=>{confetti.visible=true;confetti.y=130+((t*40+i*47)%270);confetti.rotation=t+i;});}
  }
  root.addChild(dog,bird);
  const atDesk=[0,1,2,3,4,7,8].includes(index);
  if(atDesk){
    // A substantial wooden desktop, front panel, drawers and feet read at phone size.
    box(166,330,166,15,0x33271e);box(170,333,158,6,0xe1b97e);
    box(174,345,150,48,0x493329);box(179,347,140,39,0x966044);
    box(181,391,12,14,0x33271e);box(307,391,12,14,0x33271e);
    box(284,351,29,14,0x684832);box(294,357,10,3,0xe1b97e);
    box(284,369,29,13,0x684832);box(294,374,10,3,0xe1b97e);
    box(184,350,92,29,0x33271e);box(187,353,86,23,0xf4ddb0);
    const nameplate=new Text({text:'BẠN QUYẾT',resolution:2,style:{fontFamily:'Arial, sans-serif',fontSize:13,fontWeight:'bold',fill:0x33271e,padding:4}});
    nameplate.anchor.set(.5);nameplate.position.set(230,364);root.addChild(nameplate);
    box(179,320,31,10,0xf4f0d9);box(183,316,29,5,0xffffff);
    box(307,312,14,18,0x577f67);box(311,306,3,13,0xf4ddb0);
  }
  const shadow=new Graphics().ellipse(0,0,40,6).fill({color:0x12291f,alpha:.23});
  shadow.position.set(atDesk?248:277,atDesk?400:407);root.addChildAt(shadow,root.getChildIndex(dog));
  const reaction=label('',315,278,23,0xe4b35a);
  moving.push((t,state)=>{
    const approved=[2,3,4].includes(index)&&(state.approved[index]||state.progress>.65);
    const celebrate=index===9;
    const pose=Math.floor(t*6)%12;
    const bounce=celebrate?[0,0,0,6,18,24,18,6,0,0,0,0][pose]:0;
    dog.position.set(atDesk?249:273,(atDesk?355:406)-bounce);
    dog.rotation=0;
    dogRig.update(t,celebrate?'celebrate':approved?'approve':[2,3,4].includes(index)?'review':'idle');
    shadow.x=dog.x;shadow.scale.x=1-bounce/120;
    reaction.text=celebrate?'★':approved?'✓':[2,3,4].includes(index)?'?':'';
    reaction.position.set(dog.x+49,dog.y-125);
  });
  if(![2,3,4,7,8,9].includes(index)){
    frame(25,423,310,67,paper);
    label(['MỘT Ý TƯỞNG. MỘT VIDEO ĐÁNG XEM.','CHỌN GÓC KỂ GIỮ NGƯỜI XEM Ở LẠI.','','','','TỪ PROMPT ĐÃ CHỐT ĐẾN ĐÚNG KHUNG HÌNH.','GIỌNG ĐÚNG BIẾN LỜI THOẠI THÀNH CẢM XÚC.'][index]||'WINDI VIDEO WORKFLOW',40,439,11);
    label('WINDI SẴN SÀNG CÙNG BẠN',40,463,12);
  }
  // Pixel platforms and moving floor highlights connect each room to the game world.
  for(let i=0;i<12;i++){box(i*30,512,28,8,0x718661);box(i*30,521,28,19,0x344b35);box(i*30+4,526,8,4,0x506e49);}
  const floorSpark=box(20,504,7,5,0xe4b35a);
  moving.push(t=>{floorSpark.x=20+(t*34)%310;floorSpark.alpha=.35+Math.abs(Math.sin(t*3))*.6;});
  // Scene entry slide, with all movement driven by the one application ticker.
  return(t:number,s:ArcadeState)=>{root.x=Math.max(0,1-t*4)*22;for(const update of moving)update(t,s);};
}
