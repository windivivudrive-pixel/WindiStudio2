import {AbsoluteFill,CanvasImage,interpolate,staticFile,useCurrentFrame,useVideoConfig,Easing} from 'remotion';
import type {WindiBeat,WindiLayoutProfile} from './types';
const nodes=[['IDEA','Chủ đề riêng · duyệt trước'],['LAYOUT','Tùy biến theo video mẫu'],['SCRIPT','Rõ lời · hình · nhịp'],['FLOW / GPT','Tạo ảnh → lưu về dự án'],['VOICE','Có nhấn · có khoảng nghỉ'],['RENDER','Hình · lời · caption khớp']];
const focus=[-1,-1,4,-1,0,1,2,3,4,5,-1,-1,-1];
const notes=[
 ['MỘT LỆNH CHỈ LÀ KHỞI ĐẦU','Một quy trình rõ ràng mới giúp bạn đi đến video hoàn chỉnh.'],
 ['SỬA ĐÚNG CHỖ ĐANG SAI','Giữ lại phần đã duyệt. Bớt vòng lặp tạo lại cả dự án.'],
 ['GIỌNG ĐỌC CẦN NHỊP KỂ','Câu ngắn, chỗ nghỉ và điểm nhấn được tính từ kịch bản.'],
 ['MỌI BƯỚC CÓ ĐƯỜNG ĐI','Biết đang ở đâu, chờ gì và tiếp tục từ bước nào.'],
 ['IDEA RIÊNG CHO TỪNG CHỦ ĐỀ','Duyệt góc khai thác trước để tránh lặp lại hướng nội dung cũ.'],
 ['LAYOUT LINH HOẠT','Chọn mẫu có sẵn hoặc phân tích video tham khảo theo ý bạn.'],
 ['MỖI BEAT ĐỀU CÓ MỤC ĐÍCH','Lời nói, hình ảnh, chữ và chuyển động cùng một kịch bản.'],
 ['TẠO HÌNH LIỀN MẠCH','Flow / GPT → lưu đúng thư mục. Flow có bước làm sạch watermark.'],
 ['VOICE BÁM KỊCH BẢN ĐÃ DUYỆT','Có khoảng nghỉ, nhấn đúng ý. Dễ nghe như đang kể chuyện.'],
 ['ĐỠ CĂN TIMELINE THỦ CÔNG','Timestamp nối hình, lời và phụ đề vào cùng nhịp.'],
 ['DỪNG ĐƯỢC · TIẾP TỤC ĐƯỢC','Sửa riêng một cảnh rồi đi tiếp. Phần tốt không phải làm lại.'],
 ['BỚT NỐI TOOL. THÊM VIDEO.','Thời gian tiết kiệm được dành cho ý tưởng và video tiếp theo.'],
 ['QUY TRÌNH DÙNG CHO VIDEO SAU','Bắt đầu với Windi. Tự duyệt từng bước, làm chủ thành phẩm.']];
export function WorkflowMapScene({beat,profile,index}:{beat:WindiBeat;profile:WindiLayoutProfile;index:number}){
 const f=useCurrentFrame(),{fps}=useVideoConfig(),p=profile.palette;const global=f+beat.startMs/1000*fps;
 const t=interpolate(f,[0,24],[0,1],{extrapolateRight:'clamp',easing:Easing.inOut(Easing.cubic)});const active=focus[index];const zoom=active<0?1:1+t*.25;
 const positions=nodes.map((_,i)=>({x:60+(i%2)*430,y:55+Math.floor(i/2)*178}));const target=active<0?{x:450,y:280}:{x:positions[active].x+175,y:positions[active].y+62};
 const tx=(450-target.x)*t,ty=(295-target.y)*t;
 const mapScale=.83;
 return <AbsoluteFill style={{background:p.background,color:p.text,overflow:'hidden'}}>
 <AbsoluteFill style={{inset:-90,backgroundImage:'radial-gradient(ellipse at 10% 15%,#a78d3935,transparent 45%),radial-gradient(ellipse at 85% 80%,#77334c44,transparent 45%),linear-gradient(#ffffff09 1px,transparent 1px),linear-gradient(90deg,#ffffff09 1px,transparent 1px)',backgroundSize:'auto,auto,40px 40px,40px 40px',transform:`translate(${Math.sin(global/150)*18}px,${Math.cos(global/170)*20}px)`}}/>
 <div style={{position:'absolute',inset:'170px 180px 300px 60px',border:'2px solid #45423d',borderRadius:28,background:'#111416de',overflow:'hidden'}}>
 <div style={{height:54,borderBottom:'1px solid #45423d',padding:'0 24px',display:'flex',alignItems:'center',fontSize:17,letterSpacing:1.8,color:p.accent}}>● WINDI / WORKFLOW <span style={{marginLeft:'auto',color:'#b6b5a7'}}>{String(index+1).padStart(2,'0')} / 13</span></div>
 <div style={{position:'absolute',top:76,left:28,right:28,fontSize:index===0?52:42,lineHeight:1.1,fontWeight:900,letterSpacing:-1.7,whiteSpace:'pre-line',color:index===0?p.accent:p.text}}>{beat.onScreenText}</div>
 <div style={{position:'absolute',left:28,right:28,top:210,height:330,border:'1px solid #555144',borderRadius:18,overflow:'hidden'}}><CanvasImage src={staticFile(beat.image)} style={{width:'100%',height:'100%',objectFit:'cover',transform:`scale(${1.02+f/2200})`}}/></div>
 <div style={{position:'absolute',top:565,left:28,right:28,height:530,border:'1px solid #555144',borderRadius:16,overflow:'hidden',background:'#121919'}}>
 <div style={{position:'relative',zIndex:1,height:42,padding:'10px 16px',fontSize:16,color:p.accent,borderBottom:'1px solid #45423d',background:'#121919'}}>PRODUCTION MAP / {active<0?'TOÀN BỘ QUY TRÌNH':nodes[active][0]}</div>
 <div style={{position:'absolute',top:42,left:0,right:0,height:488,overflow:'hidden'}}><div style={{width:920,height:590,transform:`translate(${tx*mapScale}px,${ty*mapScale-(1-mapScale)*295}px) scale(${mapScale*zoom})`,transformOrigin:'450px 295px'}}>
 <svg width="920" height="590" style={{position:'absolute',inset:0}}><defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#b8a56e"/></marker></defs>{[[0,1],[1,2],[2,3],[3,4],[4,5]].map(([a,b])=>{const s=positions[a],e=positions[b];return <path key={a} d={a%2===0?`M${s.x+350} ${s.y+62} H${e.x-8}`:`M${s.x+175} ${s.y+124} V${s.y+151} H${e.x+175} V${e.y-8}`} fill="none" stroke="#b8a56e" strokeWidth="2" markerEnd="url(#arr)" strokeDasharray="8 5" strokeDashoffset={-global*.35}/>;})}</svg>
 {nodes.map(([label,detail],i)=>{const selected=i===active;return <div key={label} style={{position:'absolute',left:positions[i].x,top:positions[i].y,width:350,height:124,border:`2px solid ${selected?p.accent:'#59615a'}`,borderRadius:9,background:selected?'#3b3523':'#1c2423',boxShadow:selected?'0 0 25px #e7bf4e30':'5px 5px 0 #0005',padding:'17px 19px',opacity:active<0||selected?1:.6}}><div style={{fontSize:25,color:selected?p.accent:p.text,marginBottom:12}}><span style={{fontSize:17,color:'#b0aa8c'}}>{String(i+1).padStart(2,'0')} / </span>{label}</div><div style={{fontSize:18,color:'#cfcec0'}}>{detail}</div></div>;})}</div></div></div>
 <div style={{position:'absolute',top:1124,left:30,right:30,borderLeft:`4px solid ${p.accent}`,padding:'2px 18px'}}><div style={{fontSize:24,color:p.accent,marginBottom:9,fontWeight:900}}>{notes[index][0]}</div><div style={{fontSize:21,lineHeight:1.42,color:'#d5d1c5'}}>{notes[index][1]}</div></div>
 </div></AbsoluteFill>;
}
