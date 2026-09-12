'use client';

import {useState} from 'react';
import {ArrowRight,CheckCircle2,Clapperboard,FileText,ImageIcon,LayoutTemplate,Lightbulb,Mic,Monitor,Subtitles,WandSparkles} from 'lucide-react';
import {RetroBadge,RetroWindow} from './ui/retro';

const steps=[
  {name:'Thiết lập',icon:Monitor,title:'Cài một lần, dùng ở mọi project.',copy:'Bộ cài kiểm tra máy, trình duyệt, extension, đăng nhập provider và thư mục đầu ra trước khi làm video.',file:'SETUP',items:['Cài helper và lệnh windi','Kết nối một browser profile','Kiểm tra bằng windi doctor'],tone:'blue'},
  {name:'Ý tưởng',icon:Lightbulb,title:'Chốt góc kể trước khi viết.',copy:'Workflow biến chủ đề, người xem và phong cách thành các idea có mục tiêu rõ để bạn chọn.',file:'IDEA REVIEW',items:['Mục tiêu người xem','Góc kể và hook','Bạn duyệt idea'],tone:'yellow'},
  {name:'Layout',icon:LayoutTemplate,title:'Chọn mẫu trước khi viết beat.',copy:'Chọn Paper Editorial, Dark Cinematic hoặc đưa video mẫu. Windi phân tích frame, transcript và nhịp dựng rồi chờ bạn duyệt layout.',file:'LAYOUT REVIEW',items:['Chọn 1 trong 2 mẫu','Hoặc phân tích video tham chiếu','Bạn duyệt layout'],tone:'orange'},
  {name:'Kịch bản',icon:FileText,title:'Mỗi beat bám layout đã duyệt.',copy:'Storyboard lưu voice-over, chữ màn hình, prompt, chuyển động, scene layout và spoken anchor theo từng beat.',file:'SCRIPT REVIEW',items:['Viết theo nhịp và scene ID','Ước lượng nhịp kể','Bạn duyệt phiên bản script'],tone:'green'},
  {name:'Hình',icon:ImageIcon,title:'Tạo đúng ảnh cho đúng cảnh.',copy:'Windi Connect gửi manifest đã duyệt tới Flow hoặc ChatGPT, giữ đúng workspace và tải ảnh về project.',file:'ASSETS',items:['Request key chống tạo trùng','Không tự đổi provider','Lưu vào assets/windi'],tone:'pink'},
  {name:'Voice',icon:Mic,title:'Voice thật quyết định thời lượng.',copy:'Dùng Windi Voice để nhận audio và word timestamp, hoặc nhập file thu âm để căn chữ cục bộ.',file:'VOICE',items:['Windi Voice hoặc audio riêng','Không tải audio riêng lên cloud','Lưu MP3 theo project'],tone:'orange'},
  {name:'Timestamp',icon:Subtitles,title:'Chữ bám đúng lời đang nói.',copy:'Caption JSON là nguồn thời gian chuẩn. Thời lượng dự kiến trong script không được dùng thay voice thật.',file:'TIMING',items:['Word timestamp từ Voice API','Whisper cục bộ khi cần','Xuất captions.srt'],tone:'blue'},
  {name:'Dựng',icon:Clapperboard,title:'Layout nhận dữ liệu đã duyệt.',copy:'Remotion ghép ảnh, voice, caption và chuyển động vào paper-editorial hoặc dark-cinematic.',file:'RENDER',items:['Dọc 1080 × 1920','30 khung hình mỗi giây','Render ngay trên máy'],tone:'green'},
  {name:'QA',icon:CheckCircle2,title:'Kiểm tra trước khi giao file.',copy:'Workflow xác minh file đầu ra, thời lượng, caption và tài nguyên rồi ghi báo cáo QA cạnh video.',file:'QUALITY',items:['Kiểm tra final.mp4','Tạo cover.png','Lưu qa.json'],tone:'yellow'},
  {name:'Hoàn tất',icon:WandSparkles,title:'Một gói đầu ra có thể dùng ngay.',copy:'Video, cover, caption, source data và báo cáo QA nằm trong project, không phụ thuộc server render.',file:'DELIVERY',items:['final.mp4','cover.png và captions.srt','Source data và qa.json'],tone:'orange'},
] as const;

export function VideoKitPreview(){
  const [selected,setSelected]=useState(0),step=steps[selected],Icon=step.icon;
  return <RetroWindow title="WINDI WORKFLOW / QUY TRÌNH" accent="orange" className="kit-demo">
    <div className="kit-step-nav" role="group" aria-label="Các chặng minh họa">{steps.map((item,index)=><button key={item.name} type="button" aria-pressed={selected===index} aria-controls="kit-step-content" onClick={()=>setSelected(index)}><span>{String(index+1).padStart(2,'0')}</span>{item.name}</button>)}</div>
    <div id="kit-step-content" className="kit-step-content" aria-live="polite" aria-atomic="true">
      <div className="kit-step-copy"><RetroBadge accent={step.tone}>ĐANG XEM: {step.name.toUpperCase()}</RetroBadge><h2>{step.title}</h2><p>{step.copy}</p><span className="kit-demo-note">Ba điểm duyệt luôn cần quyết định của bạn: idea, layout và kịch bản.</span></div>
      <div className={`kit-preview-sheet kit-sheet-${step.tone}`}><div className="kit-file-label"><Icon size={22} aria-hidden="true"/><span>{step.file}</span><span aria-hidden="true">↗</span></div><ol>{step.items.map((item,index)=><li key={item}><span>{String(index+1).padStart(2,'0')}</span>{item}</li>)}</ol><div className="kit-sheet-footer"><span>WINDI STUDIO</span><span>PREVIEW / 01</span></div></div>
    </div>
    <div className="kit-preview-controls"><span>Mỗi artifact được lưu theo phiên bản trong project.</span>{selected<steps.length-1?<button type="button" className="text-link" onClick={()=>setSelected(selected+1)}>Tiếp tục <ArrowRight size={16}/></button>:<button type="button" className="text-link" onClick={()=>setSelected(0)}>Xem lại <ArrowRight size={16}/></button>}</div>
  </RetroWindow>;
}
