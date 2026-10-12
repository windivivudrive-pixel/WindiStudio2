const $=selector=>document.querySelector(selector);
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const styles={natural:'Tự nhiên, dễ nghe',faithful:'Sát nghĩa, chính xác',concise:'Ngắn gọn, rõ ý',storytelling:'Kể chuyện, có nhịp'};
const deliveries={conversational:'Gần gũi',calm:'Điềm tĩnh',energetic:'Năng lượng',formal:'Chuyên nghiệp'};
const providerNames={local:'Giọng local',windi:'Windi Voice API',elevenlabs:'ElevenLabs API',openai:'OpenAI / API tương thích'};
const defaults={windi:'https://windistudio.app',elevenlabs:'https://api.elevenlabs.io/v1',openai:'https://api.openai.com/v1'};
let hardware,previewTimer,fonts=[],project,draft,tab='voice',voiceSettings={},apiDrafts={},catalogs=new Map(),busy=false,polling=false,dirty=false,lastJob='',toastTimer,runtimeSettings={whisper:'',vieneu:''};
let lastApi='windi',savedMessage='Đã tải thiết lập đã lưu';
const endpoint=action=>`/api/projects/${project.id}${action?'/'+action:''}`;
const catalogKey=()=>draft.config.ttsProvider+':'+draft.config.mode;
const catalog=()=>catalogs.get(catalogKey())||[];
async function api(path,body,method='POST'){
  const r=await fetch(path,body===undefined?{cache:'no-store'}:{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await r.json();if(!r.ok)throw new Error(data.error||'Chưa kết nối được Windi Dubbing.');return data;
}
function tell(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4000);}
function markDirty(){dirty=true;savedMessage='Có thay đổi chưa lưu';document.querySelectorAll('.speaker audio').forEach(a=>{a.pause();a.hidden=true;});updateSummary();updateStatus();}
function select(key,options){return `<select data-config="${key}">${Object.entries(options).map(([value,label])=>`<option value="${escapeHtml(value)}" ${String(draft.config[key])===value?'selected':''}>${escapeHtml(label)}</option>`).join('')}</select>`;}
function apiDraft(){const provider=draft.config.ttsProvider;return apiDrafts[provider]||={baseUrl:voiceSettings[provider]?.baseUrl||defaults[provider],apiKey:'',clearKey:false};}
function voicePanel(){
  const local=draft.config.ttsProvider==='local',voices=catalog(),count=draft.speakers.length;
  const connection=local?null:apiDraft();
  return `<div class="section-heading"><div><p class="eyebrow">01 / GIỌNG ĐỌC</p><h2>Ai sẽ kể câu chuyện?</h2></div><span class="tag">${local?'Trên máy':'API riêng'}</span></div>
    <div class="field-grid"><label>Số lượng giọng<select id="speakerCount"><option value="1" ${count===1?'selected':''}>Một người đọc</option><option value="2" ${count===2?'selected':''}>Hai người · MC & khách mời</option>${count>2?`<option value="${count}" selected>${count} vai đã nhập</option>`:''}</select></label><label>Nguồn giọng<select id="voiceSource"><option value="local" ${local?'selected':''}>Local · chạy trên máy</option><option value="api" ${local?'':'selected'}>API · tài khoản của bạn</option></select></label></div>
    ${local?'':`<label>Nhà cung cấp${select('ttsProvider',{windi:'Windi Voice API',elevenlabs:'ElevenLabs API',openai:'OpenAI / API tương thích'})}</label><details class="api-settings"><summary>Kết nối API <span>${voiceSettings[draft.config.ttsProvider]?.configured?'Đã có key':'Chưa có key'}</span></summary><label>Base URL<input id="voiceBaseUrl" type="url" value="${escapeHtml(connection.baseUrl)}" autocomplete="off" spellcheck="false"></label><label>API key<input id="voiceApiKey" type="password" autocomplete="new-password" value="${escapeHtml(connection.apiKey)}" placeholder="${voiceSettings[draft.config.ttsProvider]?.configured?'Để trống để giữ key hiện tại':'Nhập key của bạn'}"></label><label class="checkbox-label"><input id="clearApiKey" type="checkbox" ${connection.clearKey?'checked':''}> Xóa key đã lưu khi bấm Lưu thiết lập</label><p class="hint">${draft.config.ttsProvider==='windi'?'URL gốc không có /v1. Chọn thư viện hoặc giọng clone đã có trong tài khoản.':'Base URL có /v1. API cần trả audio trực tiếp.'} Key chỉ lưu riêng trên máy.</p></details>${draft.config.ttsProvider!=='windi'?`<label>Model ID<input data-config="apiModel" value="${escapeHtml(draft.config.apiModel)}" maxlength="200"></label>`:''}`}
    ${local?`<div class="local-model-settings"><label>Model giọng trên máy${select('mode',{v3nano:'Local Voice Lite · nhẹ, cho máy yếu',v3turbo:'Local Voice Pro · ưu tiên chất lượng',standard:'Local Voice Standard · bản cũ, nặng'})}</label><p class="hint">${draft.config.mode==='v3turbo'?'Pro · 48 kHz; trên Mac dùng CPU FP32.':draft.config.mode==='v3nano'?'Lite · 24 kHz; model nhẹ, không tương đương Pro.':'Standard · model cũ.'} Lite tạo voice nhanh hơn, giảm chất lượng nhất là tiếng Anh. Đổi model cần chọn lại giọng. Kiểm tra RAM và ổ đĩa trước khi tải model lần đầu.</p><button id="recommendModels" class="button quiet" type="button">Kiểm tra máy & đề xuất model</button></div>`:''}
    <div class="library-toolbar"><p id="catalogStatus" role="status">${voices.length?`${voices.length} giọng để lựa chọn`:local?'Tải danh sách từ môi trường đã liên kết.':'Lưu kết nối API, rồi tải danh sách giọng.'}</p><button id="loadVoices" class="button quiet" type="button">${voices.length?'Tải lại giọng':'Tải danh sách giọng'}</button></div>
    <div class="speaker-list">${draft.speakers.map((s,i)=>{
      const known=voices.some(v=>v.id===s.voice),file=project.artifacts.samples?.[s.id],meta=project.artifacts.sampleSettings?.[s.id];
      const matching=meta&&meta.provider===draft.config.ttsProvider&&meta.mode===draft.config.mode&&meta.apiModel===draft.config.apiModel&&meta.voice===s.voice&&meta.text===draft.config.sampleText;
      return `<section class="speaker" data-speaker="${escapeHtml(s.id)}"><div class="speaker-heading"><span class="speaker-number">${String(i+1).padStart(2,'0')}</span><label>Tên / vai<input data-speaker-field="name" value="${escapeHtml(s.name)}" maxlength="100"></label></div><label>Giọng đọc<select data-speaker-field="voice"><option value="">Chọn giọng${local?' local':''}</option>${s.voice&&!known?`<option value="${escapeHtml(s.voice)}" selected>${escapeHtml(s.voice)} · đã lưu</option>`:''}${voices.map(v=>`<option value="${escapeHtml(v.id)}" ${s.voice===v.id?'selected':''}>${escapeHtml(v.label)}</option>`).join('')}</select></label>${local?'':`<details><summary>Nhập voice ID thủ công</summary><label>Voice ID<input data-manual-voice value="${escapeHtml(s.voice)}" maxlength="200"></label></details>`}<div class="sample-actions"><button class="button secondary" data-sample="${escapeHtml(s.id)}" type="button" ${s.voice?'':'disabled'}><span aria-hidden="true">▷</span> Nghe thử${local?'':' · dùng credit'}</button><span class="hint">${local?'Tạo mẫu trên máy':'Gửi câu mẫu đến API'}</span></div>${file&&matching?`<audio controls aria-label="Nghe lại giọng ${escapeHtml(s.name)}" src="${endpoint('file/'+encodeURIComponent(file))}?v=${encodeURIComponent(project.updatedAt)}"></audio>`:''}</section>`;
    }).join('')}</div>
    <label>Câu nghe thử<textarea data-config="sampleText" maxlength="1000">${escapeHtml(draft.config.sampleText)}</textarea></label><p class="hint">Cùng một câu cho mọi giọng để dễ so sánh. Audio đã tạo có thể nghe lại.</p><p id="voiceResult" class="feedback" role="status"></p>`;
}
function translationPanel(){return `<div class="section-heading"><div><p class="eyebrow">02 / CÁCH DIỄN ĐẠT</p><h2>Dịch theo cách bạn muốn.</h2></div></div><label>Phong cách dịch${select('translationStyle',styles)}</label><label>Ngữ điệu lời đọc${select('delivery',deliveries)}</label><label>Ghi chú cho Gemini<textarea data-config="translationNotes" maxlength="2000" placeholder="Ví dụ: xưng mình – bạn, giữ nguyên tên sản phẩm, giải thích thuật ngữ ngắn gọn.">${escapeHtml(draft.config.translationNotes)}</textarea></label><p class="hint">Chat dùng các lựa chọn này để viết lời đọc và ngắt câu. Cảm xúc thực tế tùy giọng; giọng local sử dụng cách đọc của preset.</p><details><summary>Nhận diện local dự phòng · cho chat không đọc được video</summary><label>Model nhận diện trên máy${select('whisperModel',{tiny:'Local Decode Quick · nhẹ nhất',base:'Local Decode Base · máy phổ thông',small:'Local Decode Balanced · chính xác hơn',medium:'Local Decode Accurate · cần nhiều RAM'})}</label><p class="hint">Chỉ tải model đã chọn khi agent chạy nhận diện local. Nhận diện và dịch trong Gemini vẫn là luồng chính.</p><button id="recommendModels" class="button quiet" type="button">Kiểm tra máy & đề xuất model</button></details><div class="inline-note"><b>Nhận diện & dịch trong chat</b><p>Gửi video và yêu cầu trong chat Gemini. Agent có quyền dùng kit sẽ đọc thiết lập đã lưu, nhập lời thoại có thời gian và bản dịch vào dự án. Không cần chuyển qua các bước trong giao diện.</p></div>`;}
function appearancePanel(){
  const fontOptions=Object.fromEntries(fonts.map(f=>[f.id,f.label]));
  if(!fontOptions[draft.config.fontFamily])fontOptions[draft.config.fontFamily]='Font đã lưu · chưa có trên máy';
  return `<div class="section-heading"><div><p class="eyebrow">03 / GIAO DIỆN & PHỤ ĐỀ</p><h2>Vừa mắt, dễ đọc.</h2></div></div>
    <label>Giao diện${select('uiTheme',{dark:'Tối · Windi',light:'Sáng · giấy ấm'})}</label>
    <div class="field-grid"><label>Kiểu phụ đề${select('subtitle',{outline:'Chữ viền',box:'Nền hộp',none:'Không gắn vào video'})}</label><label>Font chữ${select('fontFamily',fontOptions)}</label></div>
    <div class="field-grid"><label>Màu chữ<input data-config="color" type="color" value="${escapeHtml(draft.config.color)}"></label><label>Cỡ chữ · tự co theo khung hình<input data-config="fontSize" type="number" min="18" max="100" value="${draft.config.fontSize}"></label></div>
    <div class="background-settings"><div class="field-grid"><label>Màu nền phụ đề<input data-background data-config="backgroundColor" type="color" value="${escapeHtml(draft.config.backgroundColor)}"></label><label for="backgroundOpacity">Độ mờ nền · <output id="backgroundOpacityValue" for="backgroundOpacity">${draft.config.backgroundOpacity}%</output><input id="backgroundOpacity" data-background data-config="backgroundOpacity" type="range" min="0" max="100" step="1" value="${draft.config.backgroundOpacity}" aria-describedby="opacityHint"></label></div><p class="hint" id="opacityHint">0% trong suốt · 100% nền đặc. Chọn kiểu Nền hộp để dùng màu và độ mờ nền.</p></div>
    <div class="karaoke-settings"><label class="checkbox-label"><input data-config="karaoke" type="checkbox" ${draft.config.karaoke?'checked':''}> Bật chữ popup / karaoke</label><div class="field-grid"><label>Kiểu hiện chữ${select('karaokeStyle',{color:'Chỉ tô từ đang đọc · không phóng',highlight:'Tô từ + phóng chữ · cụm 5 từ',popup:'Popup · từng từ'})}</label><label>Màu từ đang đọc<input data-karaoke data-config="karaokeColor" type="color" value="${escapeHtml(draft.config.karaokeColor)}"></label></div><label>Độ phóng từ · <output id="karaokeScaleValue">${draft.config.karaokeScale}%</output><input data-karaoke data-config="karaokeScale" type="range" min="100" max="150" step="1" value="${draft.config.karaokeScale}"></label><p class="hint">Xem trước minh hoạ. Khi xuất MP4, nhịp từng từ ước lượng đều theo thời gian câu đã khớp giọng, chưa căn từng từ theo âm thanh. Font, viền và nền dùng thiết lập ở trên; SRT rời không có hiệu ứng.</p></div>
    <p class="hint">Danh sách font lấy từ máy này, không tải font mới. Chữ tự co theo cả chiều rộng và chiều cao, tối đa 3 dòng mỗi câu để tránh quá khổ trên video dọc. Font đã chọn được dùng khi xuất video; SRT rời chỉ chứa lời và thời gian.</p>
    <div class="field-grid"><label>Độ phân giải mặc định${select('resolution',{'720':'720p','1080':'1080p'})}</label><label>Âm thanh gốc${select('backgroundVolume',{'0':'Tắt · chỉ giọng Việt','0.1':'Giữ 10%','0.2':'Giữ 20%','0.3':'Giữ 30%'})}</label></div><p class="hint">Giữ âm thanh gốc bao gồm cả lời nói gốc ở mức nhỏ. Chat dùng thiết lập này khi bạn yêu cầu xuất video.</p>`;
}
function render(){
  if(!draft)return;
  $('#settingsContent').innerHTML=tab==='voice'?voicePanel():tab==='translation'?translationPanel():appearancePanel();
  document.querySelectorAll('[data-tab]').forEach(b=>{if(b.dataset.tab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  updateSummary();updateStatus();
}
function updateSummary(){
  if(!draft)return;
  document.documentElement.dataset.theme=draft.config.uiTheme;
  $('meta[name="theme-color"]').content=draft.config.uiTheme==='light'?'#f3f1e8':'#25272b';
  const voices=catalog();
  $('#summaryVoice').textContent=draft.speakers.map(s=>voices.find(v=>v.id===s.voice)?.label||s.name).join(' + ');
  $('#summaryStyle').textContent=`${styles[draft.config.translationStyle]} · ${deliveries[draft.config.delivery]}`;
  const caption=$('#captionPreview');caption.style.color=draft.config.color;caption.style.fontSize=Math.min(34,Math.max(12,draft.config.fontSize*.5*Math.min(1,((project.video?.width||1280)/(project.video?.height||720))/1.6)))+'px';
  caption.style.fontFamily='"'+(fonts.find(f=>f.id===draft.config.fontFamily)?.family||'Arial')+'", sans-serif';
  const bg=draft.config.backgroundColor;
  caption.style.backgroundColor=draft.config.subtitle==='box'?`rgba(${parseInt(bg.slice(1,3),16)},${parseInt(bg.slice(3,5),16)},${parseInt(bg.slice(5,7),16)},${draft.config.backgroundOpacity/100})`:'transparent';
  const output=$('#backgroundOpacityValue');if(output)output.textContent=draft.config.backgroundOpacity+'%';
  clearInterval(previewTimer);
  const scaleOutput=$('#karaokeScaleValue');if(scaleOutput)scaleOutput.textContent=draft.config.karaokeScale+'%';
  caption.dataset.style=draft.config.subtitle;caption.textContent=draft.config.subtitle==='none'?'Phụ đề SRT rời':'Một câu chuyện hay,\nqua giọng kể của bạn.';
  if(draft.config.karaoke&&draft.config.subtitle!=='none'){
    let index=0;const words=['Một','câu','chuyện','hay,','qua','giọng','kể','của','bạn.'];
    const paint=()=>{const start=Math.floor(index/5)*5;caption.replaceChildren(...(draft.config.karaokeStyle==='popup'?[words[index]]:words.slice(start,start+5)).flatMap((word,i)=>{const span=document.createElement('span');span.textContent=word;const active=draft.config.karaokeStyle==='popup'||i+start===index;if(active){span.style.color=draft.config.karaokeColor;if(draft.config.karaokeStyle!=='color')span.style.fontSize=draft.config.karaokeScale+'%';}return [span,document.createTextNode(' ')];}));index=(index+1)%words.length;};
    paint();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)previewTimer=setInterval(paint,420);
  }

}
function updateStatus(){
  if(!project)return;const running=project.job?.status==='running',locked=busy||running;
  document.querySelectorAll('#settingsContent input,#settingsContent select,#settingsContent textarea,#settingsContent button,#saveAll,#projectSelect,#newProject,#saveRuntime').forEach(el=>el.disabled=locked);
  document.querySelectorAll('[data-background]').forEach(el=>el.disabled=locked||draft.config.subtitle!=='box');
  document.querySelectorAll('[data-karaoke], [data-config=karaokeStyle]').forEach(el=>el.disabled=locked||!draft.config.karaoke||draft.config.subtitle==='none');
  const scale=$('[data-config=karaokeScale]');if(scale){scale.disabled=locked||!draft.config.karaoke||draft.config.subtitle==='none'||draft.config.karaokeStyle==='color';scale.closest('label').hidden=draft.config.karaokeStyle==='color';}
  document.querySelectorAll('[data-sample]').forEach(el=>el.disabled=locked||!draft.speakers.find(s=>s.id===el.dataset.sample)?.voice);
  $('#saveAll').textContent=busy?'Đang lưu…':'Lưu thiết lập ↗';
  $('#saveState').textContent=savedMessage;$('#saveState').classList.toggle('unsaved',dirty);
  const job=project.job,visible=job&&['voices','sample'].includes(job.step);
  $('#jobPanel').hidden=!visible;
  if(visible){$('#jobMessage').textContent=job.message;$('#jobProgress').value=job.progress||0;$('#cancelJob').hidden=!running;$('#jobPanel').dataset.status=job.status;}
}
async function loadProjects(preferred){
  let projects=await api('/api/projects');
  if(!projects.length){const p=await api('/api/projects',{name:'Thiết lập đầu tiên'});projects=[p];preferred=p.id;}
  const wanted=preferred||localStorage.getItem('windiProject'),id=projects.find(p=>p.id===wanted)?.id||projects[0].id;
  $('#projectSelect').innerHTML=projects.map(p=>`<option value="${p.id}" ${p.id===id?'selected':''}>${escapeHtml(p.name)}</option>`).join('');
  project=await api('/api/projects/'+id);voiceSettings=await api('/api/voice-config');fonts=await api('/api/subtitle-fonts');
  draft={config:structuredClone(project.config),speakers:structuredClone(project.speakers)};
  if(project.config.ttsProvider!=='local')lastApi=project.config.ttsProvider;
  catalogs=new Map();if(project.voices.length)catalogs.set(catalogKey(),project.voices);
  const result=project.job?.catalog;if(result)catalogs.set(result.provider+':'+result.mode,result.voices);
  apiDrafts={};dirty=false;lastJob=project.job?.status||'';savedMessage='Đã tải thiết lập đã lưu';localStorage.setItem('windiProject',id);render();
}
function changeProvider(provider){draft.config.ttsProvider=provider;draft.config.apiModel=provider==='elevenlabs'?'eleven_v3':provider==='openai'?'gpt-4o-mini-tts':'';draft.config.voice='';draft.speakers.forEach(s=>s.voice='');if(provider!=='local')lastApi=provider;markDirty();render();}
function draftPayload(){return {config:draft.config,speakers:draft.speakers,...(draft.speakers.length<=2?{speakerCount:draft.speakers.length}:{})};}
function apiChanged(){if(draft.config.ttsProvider==='local')return false;const d=apiDraft();return Boolean(d.apiKey||d.clearKey||d.baseUrl!==(voiceSettings[draft.config.ttsProvider]?.baseUrl||defaults[draft.config.ttsProvider]));}
async function save(){
  if(busy||project.job?.status==='running')return;
  busy=true;savedMessage='Đang lưu thiết lập…';updateStatus();
  try{
    const payload=draftPayload();if(apiChanged())payload.voiceApi={provider:draft.config.ttsProvider,...apiDraft()};
    project=await api(endpoint('preferences'),payload);
    draft={config:structuredClone(project.config),speakers:structuredClone(project.speakers)};
    dirty=false;apiDrafts={};savedMessage='Đã lưu · sẵn sàng tiếp trong chat';render();
    voiceSettings=await api('/api/voice-config');render();tell('Đã lưu giọng, cách dịch và giao diện.');
  }catch(e){savedMessage='Chưa lưu được · '+e.message;tell(e.message);}finally{busy=false;updateStatus();}
}
async function runVoiceTool(step,speaker){
  if(busy||project.job?.status==='running')return;
  if(apiChanged()){tell('Bấm Lưu thiết lập để lưu kết nối API trước khi dùng giọng.');return;}
  try{project=await api(endpoint('job'),{step,...(speaker?{speaker,text:draft.config.sampleText}:{}),preview:draftPayload()});lastJob='running';updateStatus();}
  catch(e){tell(e.message);}
}
$('#settingsContent').addEventListener('input',e=>{
  const el=e.target;
  if(el.dataset.config){const key=el.dataset.config;draft.config[key]=['fontSize','resolution','backgroundVolume','backgroundOpacity','karaokeScale'].includes(key)?Number(el.value):el.type==='checkbox'?el.checked:el.value;}
  if(el.dataset.speakerField){const s=draft.speakers.find(s=>s.id===el.closest('[data-speaker]').dataset.speaker);s[el.dataset.speakerField]=el.value;}
  if(el.hasAttribute('data-manual-voice')){draft.speakers.find(s=>s.id===el.closest('[data-speaker]').dataset.speaker).voice=el.value;const select=el.closest('[data-speaker]').querySelector('[data-speaker-field=voice]');if(![...select.options].some(o=>o.value===el.value))select.add(new Option(el.value,el.value));select.value=el.value;}
  if(el.id==='voiceBaseUrl')apiDraft().baseUrl=el.value;
  if(el.id==='voiceApiKey')apiDraft().apiKey=el.value;
  if(el.id==='clearApiKey')apiDraft().clearKey=el.checked;
  if(!['voiceSource','speakerCount'].includes(el.id))markDirty();
});
$('#settingsContent').addEventListener('change',e=>{
  const el=e.target;
  if(el.id==='speakerCount'){
    const n=Number(el.value);
    if(n===2&&draft.speakers.length>2){tell('Chuyển về một giọng trước khi chọn hai giọng.');render();return;}
    if(n!==draft.speakers.length){const first=draft.speakers[0];if(n===2&&['Người đọc','Người nói 1'].includes(first.name))first.name='MC';draft.speakers=n===1?[first]:[first,{id:first.id==='guest'?'guest_2':'guest',name:'Khách mời',voice:''}];markDirty();render();}
  }
  if(el.id==='voiceSource')changeProvider(el.value==='local'?'local':lastApi);
  if(el.dataset.config==='ttsProvider')changeProvider(el.value);
  if(el.dataset.config==='mode'){draft.config.voice='';draft.speakers.forEach(s=>s.voice='');markDirty();render();}
  if(el.dataset.speakerField==='voice'){const input=el.closest('[data-speaker]').querySelector('[data-manual-voice]');if(input)input.value=el.value;render();}
});
$('#settingsContent').addEventListener('click',e=>{const b=e.target.closest('button');if(b?.id==='recommendModels'){$('#machineDialog').showModal();checkMachine();}if(b?.id==='loadVoices')runVoiceTool('voices');if(b?.dataset.sample)runVoiceTool('sample',b.dataset.sample);});
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;render();}));
$('#saveAll').addEventListener('click',save);
$('#projectSelect').addEventListener('change',()=>{if(dirty){$('#projectSelect').value=project.id;tell('Lưu thiết lập trước khi đổi dự án.');return;}loadProjects($('#projectSelect').value).catch(e=>tell(e.message));});
$('#newProject').addEventListener('click',async()=>{if(dirty){tell('Lưu thiết lập trước khi tạo dự án.');return;}try{const p=await api('/api/projects',{name:'Dự án '+new Date().toLocaleString('vi-VN')});await loadProjects(p.id);}catch(e){tell(e.message);}});
$('#cancelJob').addEventListener('click',async()=>{try{await api(endpoint('cancel'),{});}catch(e){tell(e.message);}});
$('#copyChat').addEventListener('click',async()=>{
  const c=project.config,voices=project.speakers.map(s=>`${s.name}: ${s.voice||'chưa chọn giọng'}`).join('; ');
  const text=`Dùng skill Windi Dubbing cho dự án ${project.id}. Đọc thiết lập bằng node agent.mjs context ${project.id}. Giọng: ${providerNames[c.ttsProvider]} (${voices}). Phong cách: ${styles[c.translationStyle]}; ngữ điệu: ${deliveries[c.delivery]}.${c.translationNotes?' Ghi chú: '+c.translationNotes:''} Nhận diện và dịch video tôi gửi trong chat này, giữ timestamp và nhãn người nói; nhập kết quả vào kit. Nếu chat không có công cụ truy cập máy, trả JSON có id, start, end, text, translation, speaker để agent nhập. Chỉ xuất video khi tôi yêu cầu.`;
  try{await navigator.clipboard.writeText(text);$('#copyResult').textContent=dirty?'Đã sao chép thiết lập cũ. Lưu thay đổi trước để chat đọc bản mới.':'Đã sao chép. Dán vào chat cùng video của bạn.';}catch{$('#copyResult').textContent=text;}
});
async function checkMachine(){
  $('#runtimeResult').textContent='Đang kiểm tra…';
  try{const r=await api('/api/system-check');hardware=r.hardwarePlan;$('#applyHardware').disabled=false;runtimeSettings=r.runtimeSettings;$('#ttsRuntime').value=runtimeSettings.vieneu;$('#decodeRuntime').value=runtimeSettings.whisper;$('#machineFacts').textContent=`${r.machine.architecture} · ${Math.round(r.machine.ramBytes/1024**3)} GB RAM · ${r.machine.cores} luồng CPU · ${r.machine.freeBytes===null?'chưa đo được ổ đĩa':Math.floor(r.machine.freeBytes/1024**3)+' GB trống'} · FFmpeg ${r.tools.ffmpeg?'đã có':'chưa có'}`;$('#hardwareRecommendation').textContent=`Đề xuất: ${hardware.config.mode==='v3nano'?'Local Voice Lite':'Local Voice Pro'} · Local Decode ${{tiny:'Quick',base:'Base',small:'Balanced',medium:'Accurate'}[hardware.config.whisperModel]} · 720p. ${hardware.description} ${hardware.warnings.join(' ')}`;$('#runtimeResult').textContent=r.tools.vieneu?`Đã tìm thấy bộ giọng local · phiên bản ${r.runtimes.vieneu.versions?.vieneu||'chưa rõ'} · Python ${r.runtimes.vieneu.architecture||'chưa rõ'}. Model được kiểm tra khi nghe thử.`:'Chưa tìm thấy bộ giọng local. Liên kết môi trường đã cài hoặc chọn nguồn API.';}catch(e){$('#runtimeResult').textContent=e.message;}
}
$('#applyHardware').addEventListener('click',()=>{if(!hardware||busy||project.job?.status==='running')return;const changed=draft.config.mode!==hardware.config.mode;Object.assign(draft.config,hardware.config);if(changed){draft.config.voice='';draft.speakers.forEach(s=>s.voice='');}markDirty();render();$('#machineDialog').close();tell('Đã áp dụng đề xuất vào bản nháp. Chọn lại giọng nếu đổi model, rồi Lưu thiết lập.');});
$('#machineButton').addEventListener('click',()=>{$('#machineDialog').showModal();checkMachine();});
$('#closeMachine').addEventListener('click',()=>$('#machineDialog').close());
$('#saveRuntime').addEventListener('click',async()=>{
  $('#saveRuntime').disabled=true;
  try{await api('/api/runtime-config',{whisper:$('#decodeRuntime').value,vieneu:$('#ttsRuntime').value});catalogs.clear();await checkMachine();render();tell('Đã lưu kết nối môi trường.');}catch(e){$('#runtimeResult').textContent=e.message;}finally{$('#saveRuntime').disabled=false;}
});
async function poll(){
  if(!project||polling||busy)return;polling=true;
  try{
    const next=await api(endpoint()),completed=lastJob==='running'&&next.job?.status!=='running';
    project=next;lastJob=next.job?.status||'';
    if(completed){const c=next.job?.catalog;if(c)catalogs.set(c.provider+':'+c.mode,c.voices);if(next.job?.status==='error')tell(next.job.message);render();}
    else updateStatus();
  }catch{/* leave draft editable during temporary connection loss */}finally{polling=false;}
}
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
loadProjects().catch(e=>{$('#settingsContent').textContent=e.message;tell(e.message);});setInterval(poll,1500);
