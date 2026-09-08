'use client';

import {useState} from 'react';
import {ArrowRight,Clapperboard,FileText,ImageIcon,Lightbulb,Mic,Monitor,Subtitles} from 'lucide-react';
import {RetroBadge,RetroWindow} from './ui/retro';

const steps=[
  {name:'Môi trường',icon:Monitor,title:'Chuẩn bị một lần, dùng cho nhiều video.',copy:'Chỗ dành cho hướng dẫn cài môi trường, kiểm tra máy và mở dự án mẫu. Bộ công cụ và cách cài chính thức sẽ được bổ sung cùng kit.',file:'START-HERE',items:['Kiểm tra yêu cầu máy','Cài các công cụ cần thiết','Mở dự án mẫu'],tone:'blue'},
  {name:'Ý tưởng',icon:Lightbulb,title:'Bắt đầu từ điều người xem cần.',copy:'Minh họa bước chọn chủ đề, đối tượng và mục tiêu của video trước khi viết lời thoại.',file:'BRIEF',items:['Chủ đề & người xem','Góc kể chuyện','Thông điệp chính'],tone:'yellow'},
  {name:'Kịch bản',icon:FileText,title:'Mỗi cảnh đều có nhiệm vụ.',copy:'Kịch bản dự kiến gắn lời thoại với hình ảnh, chữ trên màn hình và mục đích của từng cảnh.',file:'STORYBOARD',items:['01 / Mở câu chuyện','02 / Giải thích & ví dụ','03 / Kết & hành động'],tone:'green'},
  {name:'Hình ảnh',icon:ImageIcon,title:'Giữ một nhận diện xuyên suốt.',copy:'Khu vực minh họa việc chuẩn bị prompt, chọn hình và sắp media theo từng cảnh. Chưa kết nối dịch vụ tạo hình.',file:'VISUALS',items:['Prompt theo cảnh','Hình ảnh đồng nhất','Đối chiếu quyền sử dụng'],tone:'pink'},
  {name:'Voice',icon:Mic,title:'Để lời kể quyết định nhịp.',copy:'Chuẩn bị lời đọc và bản thu cho video. Nhà cung cấp voice, chất giọng và các bước kiểm tra sẽ được chốt trong quy trình chính thức.',file:'VOICE',items:['Lời thoại đã duyệt','Bản thu / giọng tổng hợp','Kiểm tra phát âm & nhịp'],tone:'orange'},
  {name:'Phụ đề',icon:Subtitles,title:'Chữ xuất hiện đúng lúc được nói.',copy:'Minh họa bước dùng Whisper để lấy timestamp từ voice và kiểm tra lại phụ đề trước khi dựng.',file:'CAPTIONS',items:['Voice → timestamp','Kiểm tra chữ & ngắt dòng','Đồng bộ theo lời đọc'],tone:'blue'},
  {name:'Dựng & xuất',icon:Clapperboard,title:'Ghép lại thành một câu chuyện.',copy:'Remotion là một phần trong hướng dựng dự kiến: ghép hình, voice và phụ đề, xem trước rồi xuất video. Chưa có bản render hay gói tải trong demo này.',file:'FINAL CUT',items:['Timeline hình + voice + chữ','Xem trước & kiểm tra','Xuất video hoàn chỉnh'],tone:'green'},
] as const;

export function VideoKitPreview(){
  const [selected,setSelected]=useState(0),step=steps[selected],Icon=step.icon;
  return <RetroWindow title="VIDEO KIT / BẢN XEM TRƯỚC" accent="orange" className="kit-demo">
    <div className="kit-step-nav" role="group" aria-label="Các chặng minh họa">{steps.map((item,index)=><button key={item.name} type="button" aria-pressed={selected===index} aria-controls="kit-step-content" onClick={()=>setSelected(index)}><span>{String(index+1).padStart(2,'0')}</span>{item.name}</button>)}</div>
    <div id="kit-step-content" className="kit-step-content" aria-live="polite" aria-atomic="true">
      <div className="kit-step-copy"><RetroBadge accent={step.tone}>CHẶNG {selected+1} / {steps.length}</RetroBadge><h2>{step.title}</h2><p>{step.copy}</p><span className="kit-demo-note">Minh họa định hướng, chưa phải quy trình phát hành.</span></div>
      <div className={`kit-preview-sheet kit-sheet-${step.tone}`}><div className="kit-file-label"><Icon size={22} aria-hidden="true"/><span>{step.file}</span><span aria-hidden="true">↗</span></div><ol>{step.items.map((item,index)=><li key={item}><span>{String(index+1).padStart(2,'0')}</span>{item}</li>)}</ol><div className="kit-sheet-footer"><span>WINDI STUDIO</span><span>PREVIEW / 01</span></div></div>
    </div>
    <div className="kit-preview-controls"><span>Không tải xuống, không chạy tool, không phát sinh phí.</span>{selected<steps.length-1?<button type="button" className="text-link" onClick={()=>setSelected(selected+1)}>Chặng tiếp theo <ArrowRight size={16}/></button>:<button type="button" className="text-link" onClick={()=>setSelected(0)}>Xem lại từ đầu <ArrowRight size={16}/></button>}</div>
  </RetroWindow>;
}
