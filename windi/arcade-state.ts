export const arcadeStages = [
  {name:'Bắt đầu', room:'WINDI / VIDEO WORKFLOW', title:'Một chủ đề có thể thành video đáng xem.', copy:'Mọi thứ bắt đầu khi bạn chọn một hướng kể đủ khiến người ta muốn dừng lại.', action:'Bắt đầu', choices:[]},
  {name:'Ý tưởng', room:'01 / CHỐT Ý TƯỞNG', title:'Đừng để một ý tưởng hay trôi qua như mọi ý tưởng khác.', copy:'Windi tìm góc kể, người xem và câu mở đầu để video có lý do được xem tiếp.', action:'Xem ý tưởng', choices:[]},
  {name:'Duyệt ý tưởng', room:'02 / QUYẾT ĐỊNH CỦA BẠN', title:'Chọn câu chuyện xứng đáng được làm.', copy:'Chỉ khi bạn chốt góc kể, Windi mới đưa nó vào sản xuất.', action:'Duyệt ý tưởng', choices:['Một điều ít ai biết','Chuyện thường ngày','Thử một cách mới']},
  {name:'Chọn layout', room:'03 / CHỌN CÁCH KỂ', title:'Một câu chuyện. Nhiều cảm giác khác nhau.', copy:'Chọn layout trước khi viết để từng cảnh có cùng một chất kể.', action:'Duyệt layout', choices:['Paper Editorial','Dark Cinematic','Video tham chiếu']},
  {name:'Kịch bản', room:'04 / CHỐT NHỊP KỂ', title:'Từng câu, từng cảnh đều có chủ đích.', copy:'Hook, lời đọc và cảnh được xếp thành một mạch. Bạn duyệt rồi Windi mới làm tiếp.', action:'Duyệt kịch bản', choices:[]},
  {name:'Tạo hình', room:'05 / TẠO KHUNG HÌNH', title:'Mood bạn chốt bắt đầu thành hình.', copy:'Ảnh được tạo theo từng cảnh và đưa về đúng project để giữ nguyên mạch cảm xúc.', action:'Tạo hình', choices:[]},
  {name:'Voice', room:'06 / TÌM ĐÚNG GIỌNG', title:'Một giọng đúng khiến câu chuyện ở lại lâu hơn.', copy:'Dùng Windi Voice hoặc bản thu của bạn để nhịp kể có cảm xúc thật.', action:'Nghe voice', choices:[]},
  {name:'Phụ đề', room:'07 / CĂN ĐÚNG NHỊP', title:'Từng chữ xuất hiện đúng lúc cần thiết.', copy:'Lời nói, hình ảnh và phụ đề bám cùng một nhịp để không đánh rơi sự chú ý.', action:'Căn phụ đề', choices:[]},
  {name:'Dựng', room:'08 / ĐƯA MỌI THỨ VÀO NHỊP', title:'Mọi quyết định giờ mới thành video.', copy:'Hình, voice, phụ đề và chuyển động được ghép lại thành một mạch kể hoàn chỉnh.', action:'Dựng video', choices:[]},
  {name:'Hoàn tất', room:'09 / SẴN SÀNG LÊN SÓNG', title:'Video đã có lý do để được xem.', copy:'Bạn kiểm tra lần cuối, rồi nhận video, cover và source cho lần xuất bản của mình.', action:'Xem kết quả', choices:[]},
] as const;
export type ArcadeState = {stage:number; auto:boolean; elapsed:number; progress:number; acting:boolean; paused:boolean; approved:Record<number,boolean>; choices:Record<number,number>; revision:number};
export const initialArcadeState:ArcadeState = {stage:0,auto:true,elapsed:0,progress:0,acting:false,paused:false,approved:{},choices:{},revision:0};
export type ArcadeAction = {type:'tick';dt:number}|{type:'move';direction:number}|{type:'choose';direction:number}|{type:'select';index:number}|{type:'act';instant?:boolean}|{type:'reset'}|{type:'toggle'}|{type:'replay'}|{type:'manual'};
const gates=[2,3,4];
export function arcadeReducer(s:ArcadeState,a:ArcadeAction):ArcadeState {
  if(a.type==='manual')return {...s,auto:false};
  if(a.type==='toggle')return {...s,auto:!s.auto,paused:s.auto};
  if(a.type==='replay')return {...initialArcadeState,revision:s.revision+1};
  if(a.type==='move')return {...s,stage:(s.stage+a.direction+arcadeStages.length)%arcadeStages.length,auto:false,paused:false,elapsed:0,progress:0,acting:false,revision:s.revision+1};
  if(a.type==='reset') {const approved={...s.approved};delete approved[s.stage];return {...s,auto:false,paused:false,elapsed:0,progress:0,acting:false,approved,revision:s.revision+1};}
  if(a.type==='choose'||a.type==='select') {
    const n=arcadeStages[s.stage].choices.length;if(!n)return {...s,auto:false};
    const selected=a.type==='select'?a.index:((s.choices[s.stage]||0)+a.direction+n)%n;
    const approved={...s.approved};delete approved[s.stage];
    return {...s,auto:false,paused:false,choices:{...s.choices,[s.stage]:selected},approved,progress:0,acting:false};
  }
  if(a.type==='act'&&a.instant&&s.stage===8)return {...s,stage:9,auto:false,paused:false,acting:false,progress:1,elapsed:0,revision:s.revision+1};
  if(a.type==='act')return {...s,auto:false,paused:false,acting:!a.instant,progress:a.instant?1:0,approved:gates.includes(s.stage)?{...s.approved,[s.stage]:true}:s.approved};
  if(s.paused)return s;
  const dt=Math.min(a.dt,100);
  const elapsed=s.elapsed+(s.auto?dt:0);
  const acting=s.acting||(s.auto&&elapsed>=1200&&s.progress<1);
  const progress=acting?Math.min(1,s.progress+dt/(s.stage===8?4000:1800)):s.progress;
  if(s.stage===8&&progress===1)return {...s,stage:9,elapsed:0,progress:0,acting:true,revision:s.revision+1};
  // Automatic approvals are demonstration only; never mark them as user decisions.
  if(s.auto&&elapsed>=6000)return {...s,stage:(s.stage+1)%arcadeStages.length,elapsed:0,progress:0,acting:false,revision:s.revision+1};
  return {...s,elapsed,acting:acting&&progress<1,progress};
}
