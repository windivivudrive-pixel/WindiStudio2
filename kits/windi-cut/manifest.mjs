const transform = (x,y,sx=1,sy=sx) => ({'transform.positionX':x-540,'transform.positionY':y-960,'transform.scaleX':sx,'transform.scaleY':sy,'transform.rotate':0,opacity:1,blendMode:'normal'});
const wrap = (text,limit=28) => text.split(/\s+/).reduce((lines,word)=>{const last=lines.length-1;if(lines[last] && lines[last].length+word.length+1>limit)lines.push(word);else lines[last]+=(lines[last]?' ':'')+word;return lines;},['']).join('\n');
export function buildManifest({episodeId,timeline,captions,assets}) {
  const duration=timeline.totalFrames/(timeline.fps||30);
  const layers=[];
  function textLayer(name,items){layers.push({name,type:'text',items:items.map(i=>({type:'text',name:i.name||name,start:i.start||0,duration:i.duration??duration,params:{content:i.content,fontFamily:'Calling',fontSize:(i.size||40)*90/1920,color:i.color||'#28332f',fontWeight:i.bold?'bold':'normal',textAlign:'center',lineHeight:1.15,...transform(i.x??540,i.y),...(i.params||{})}}))});}
  function rect(name,x,y,w,h,fill,stroke='#32483e',start=0,length=duration){return {type:'graphic',definitionId:'rectangle',name,start,duration:length,params:{fill,stroke,strokeWidth:stroke==='transparent'?0:1.5,cornerRadius:0,...transform(x,y,w/1080,h/1080)}};}
  function graphicLayer(name,items){layers.push({name,type:'graphic',items});}
  const beats=timeline.beats.map((b,i)=>({...b,start:b.startFrame/(timeline.fps||30),duration:(b.endFrame-b.startFrame)/(timeline.fps||30),number:i+1}));
  textLayer('Phụ đề',captions.map(c=>({content:wrap(c.text,36),start:c.startMs/1000,duration:(c.endMs-c.startMs)/1000,y:1420,size:38,color:'#fffdf5',params:{'background.enabled':true,'background.color':'#32483e','background.paddingX':45,'background.paddingY':30}})));
  textLayer('Watermark · chữ',[{content:'WindiStudio - Sử Dụng AI Hiệu Quả',y:175,size:27,bold:true}]);
  textLayer('Headline',beats.map(b=>({content:wrap(b.headline),start:b.start,duration:b.duration,y:305,size:50,bold:true})));
  textLayer('Dòng nhấn',beats.map(b=>({content:wrap(b.spokenPill,37),start:b.start,duration:b.duration,y:443,size:28,bold:true})));
  textLayer('Nhãn nội dung',beats.map(b=>({content:b.category,start:b.start,duration:b.duration,y:235,size:24,color:'#468e65'})));
  textLayer('Tiêu đề cửa sổ',beats.map(b=>({content:'● ● ●   '+(b.windowTitle||b.category),start:b.start,duration:b.duration,y:565,size:23})));
  textLayer('Footer / số cảnh',beats.map(b=>({content:'WINDISTUDIO                       '+String(b.number).padStart(2,'0')+' / '+String(beats.length).padStart(2,'0'),start:b.start,duration:b.duration,y:1755,size:24})));
  const clips=assets.filter(a=>a.type==='video');
  layers.push({name:'Media từng cảnh',type:'video',items:beats.slice(0,clips.length).map((b,i)=>{const a=clips[i], contain=Math.min(1080/a.width,1920/a.height), fit=Math.min(850/a.width,900/a.height)/contain;return {type:'video',name:'Cảnh '+b.number+' · '+a.name,start:b.start,duration:Math.min(b.duration,a.duration),asset:a.name,params:{...transform(540,1050,fit),volume:0}};})});
  graphicLayer('Thanh tiêu đề cửa sổ',beats.map(b=>rect('Chrome '+b.number,540,565,920,58,b.accentColor||'#73a4df','#32483e',b.start,b.duration)));
  graphicLayer('Khung nội dung',beats.map(b=>rect('Khung cảnh '+b.number,540,1020,920,965,'#fffdf5','#32483e',b.start,b.duration)));
  graphicLayer('Nền dòng nhấn',[rect('Nền nhấn',540,443,940,90,'#f5c558')]);
  graphicLayer('Khung watermark',[rect('Khung watermark',540,175,940,66,'#fff9ea')]);
  graphicLayer('Tiến độ / trang trí',[rect('Thanh tiến độ',230,1680,300,8,'#468e65','transparent')]);
  graphicLayer('Đường footer',[rect('Đường chân trang',540,1710,940,3,'#32483e','transparent')]);
  const grid=[];
  for(let x=0;x<=1080;x+=90)grid.push(rect('Grid dọc '+x,x,960,1,1920,'#bed4e2','transparent'));
  for(let y=0;y<=1920;y+=90)grid.push(rect('Grid ngang '+y,540,y,1080,1,'#bed4e2','transparent'));
  graphicLayer('Grid nền · từng đường',grid);
  for(const a of assets.filter(a=>a.type==='audio'))layers.push({name:a.name==='voice.mp3'?'Giọng đọc':'Nhạc nền',type:'audio',items:[{type:'audio',name:a.name,start:0,duration:Math.min(a.duration,duration),asset:a.name,params:{volume:a.name==='voice.mp3'?1:0.14}}]});
  return {schemaVersion:1,episodeId,duration,fps:timeline.fps||30,layers,assets:assets.map(a=>({name:a.name,url:'/windi-media/'+encodeURIComponent(a.name)})),limitations:['Remotion animations/3D not converted','Word karaoke not converted']};
}
