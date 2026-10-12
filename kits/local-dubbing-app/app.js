const labels={environment:{crumb:'KIỂM TRA MÁY',title:'Kiểm tra môi trường',desc:'Mình kiểm tra các công cụ cần thiết để bạn biết máy đã sẵn sàng lồng tiếng chưa.'},video:{crumb:'CHỌN VIDEO',title:'Chọn video cần lồng tiếng',desc:'Chọn file trên máy hoặc dán đường dẫn video. App kiểm tra định dạng và thời lượng trước khi chạy.'},transcript:{crumb:'LỜI THOẠI',title:'Nghe lại lời thoại gốc',desc:'Windi Decode tạo các câu có thời gian bắt đầu và kết thúc. Bạn có thể sửa nội dung và thời gian từng câu trước khi dịch.'},translation:{crumb:'DỊCH LỜI THOẠI',title:'Dịch bằng subscription của bạn',desc:'Chọn Codex hoặc Antigravity. App gửi lời thoại cần dịch, nhận từng câu về và giữ các mốc thời gian của video.'},voice:{crumb:'GIỌNG ĐỌC & PHỤ ĐỀ',title:'Chọn giọng và style phụ đề',desc:'Gán giọng riêng cho MC và khách mời. Nghe thử từng vai trước khi tạo tiếng toàn bộ video.'},export:{crumb:'XEM THỬ & XUẤT',title:'Kiểm tra video trước khi xuất',desc:'Xem lại tiếng, phụ đề và độ khớp. Chọn MP4, SRT hoặc file WAV để lưu trên máy.'}};
const stepButtons=[...document.querySelectorAll('[data-step]')];
const checkList=document.querySelector('#checkList');
const toast=document.querySelector('#toast');
let toastTimer;

function tell(message){toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2800)}

const toolSpecs=[
  ['python','Python','Python có sẵn trong PATH'],
  ['ffmpeg','FFmpeg','Xử lý âm thanh và video'],
  ['ffprobe','Kiểm tra video','Đọc định dạng và thời lượng'],
  ['ytDlp','Tải video từ link','Tùy chọn — cần khi dùng YouTube/TikTok/X'],
  ['whisper','Windi Decode','Nhận diện lời thoại và thời gian'],
  ['vieneu','Windi TTS','Tạo giọng Việt trên máy'],
  ['ai','Codex / Antigravity','Đã tìm thấy ít nhất một CLI'],
];

async function refreshEnvironment(){
  document.querySelector('#checkSummary').textContent='Đang kiểm tra công cụ và môi trường đã chọn.';
  document.querySelector('#machineSummary').textContent='Đang kiểm tra…';
  try{
    const response=await fetch('/api/system-check',{cache:'no-store'});
    if(!response.ok) throw new Error('Không nhận được kết quả kiểm tra.');
    const result=await response.json();
    displayEnvironment(result);
  }catch(error){
    document.querySelector('#checkSummary').textContent='Chưa kết nối được bridge local. '+error.message;
    document.querySelector('#machineSummary').textContent='Bridge chưa sẵn sàng';
    document.querySelector('#previewStatus').textContent='Chưa kết nối được bridge local.';
  }
}

const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function displayEnvironment(result){
    document.querySelector('#decodeRuntime').value=result.runtimeSettings.whisper;
    document.querySelector('#ttsRuntime').value=result.runtimeSettings.vieneu;
    const t=result.tools;
    const rows=[t.python,t.ffmpeg,t.ffprobe,t.whisper,t.vieneu,t.codex||t.antigravity];
    checkList.innerHTML=toolSpecs.map(([key,title,description])=>{
      const ready=key==='ai'?Boolean(t.codex||t.antigravity):Boolean(t[key]);
      const value=key==='ai'?[t.codex&&'Codex CLI',t.antigravity&&'Antigravity CLI'].filter(Boolean).join(' · '):t[key];
      const status=ready?'found':'missing';
      const runtime=result.runtimes[key];
      const detail=runtime?.error || (ready?(value||description):description);
      return `<div class="check-row"><span class="tool-icon ${key==='ffmpeg'?'ff':key==='whisper'?'wh':key==='vieneu'?'vi':key==='ai'?'ai':''}">${key==='python'?'Py':key==='ffmpeg'?'F':key==='ffprobe'?'FP':key==='ytDlp'?'DL':key==='whisper'?'WD':key==='vieneu'?'WT':'AI'}</span><span><b>${title}</b><small>${escapeHtml(detail)}</small>${runtime?.executable?`<small class="runtime-path" title="${escapeHtml(runtime.executable)}">${escapeHtml(runtime.executable)}</small>`:''}</span><span class="status ${status}"><i></i>${ready?'Đã tìm thấy':key==='ytDlp'?'Tùy chọn':'Cần chuẩn bị'}</span></div>`;
    }).join('');
    const facts=[result.machine.os,result.machine.architecture,`${Math.round(result.machine.ramBytes/1024**3)} GB RAM`,result.machine.freeBytes===null?'Ổ đĩa: chưa đọc được':`${Math.round(result.machine.freeBytes/1024**3)} GB trống`];
    document.querySelector('#machineFacts').innerHTML=facts.map(item=>`<span>${escapeHtml(item)}</span>`).join('');
    const missing=rows.filter(item=>!item).length;
    document.querySelector('#machineSummary').textContent=missing?`${missing} mục cần chuẩn bị`:'Đủ công cụ cơ bản';
    document.querySelector('#checkSummary').textContent=`${missing?`${missing} mục đang thiếu hoặc cần xác minh.`:'Các công cụ được nhận diện.'} Model được kiểm tra khi chạy tác vụ.`;
    document.querySelector('#previewStatus').textContent=missing?'Cần chuẩn bị công cụ còn thiếu ở bước kiểm tra.':'Đã phát hiện công cụ cơ bản. Sẵn sàng chọn video.';
    document.querySelector('#engineIndicator').className=`engine-indicator ${missing?'pending':'ok'}`;
}

async function saveRuntimes(reset=false){
  const buttons=[...document.querySelectorAll('#runtimeForm button')];
  buttons.forEach(button=>button.disabled=true);
  const feedback=document.querySelector('#runtimeResult');
  feedback.textContent='Đang kiểm tra môi trường…';feedback.classList.remove('error');
  try{
    const response=await fetch('/api/runtime-config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({whisper:reset?'':document.querySelector('#decodeRuntime').value,vieneu:reset?'':document.querySelector('#ttsRuntime').value})});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'Chưa lưu được môi trường.');
    displayEnvironment(result);
    feedback.textContent=reset?'Đã chuyển về Python mặc định.':'Đã lưu liên kết. Các lần kiểm tra sau sẽ dùng môi trường đã chọn; các tác vụ tiếp theo sẽ dùng môi trường này.';
  }catch(error){feedback.textContent=error.message;feedback.classList.add('error');}
  finally{buttons.forEach(button=>button.disabled=false);}
}
document.querySelector('#runtimeForm').addEventListener('submit',event=>{event.preventDefault();saveRuntimes();});
document.querySelector('#resetRuntime').addEventListener('click',()=>saveRuntimes(true));

let voiceSettings={}, sourceStop, localVoiceAttempt='', pendingSampleSpeaker='', lastApiProvider='windi';
let project, currentStep='environment', polling=false, lastJobStatus='', dirty=false, voiceSettingsBusy=false;
async function api(path,body,method='POST'){
  const response=await fetch(path,body!==undefined?{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Không kết nối được bridge.');return result;
}
const projectApi=action=>`/api/projects/${project.id}${action?'/'+action:''}`;
const artifactUrl=file=>projectApi('file/'+encodeURIComponent(file));
async function loadProjects(preferred){
  const projects=await api('/api/projects');
  if(!projects.length){const created=await api('/api/projects',{name:'Dự án đầu tiên'});return loadProjects(created.id);}
  const select=document.querySelector('#projectSelect');select.innerHTML=projects.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  const wanted=preferred||localStorage.getItem('windiProject');select.value=projects.some(p=>p.id===wanted)?wanted:projects[0].id;
  project=await api('/api/projects/'+select.value);voiceSettings=await api('/api/voice-config');localVoiceAttempt='';if(project.config.ttsProvider!=='local')lastApiProvider=project.config.ttsProvider;localStorage.setItem('windiProject',project.id);dirty=false;renderStep();updateStatus();
}
function selectConfig(key,options){return `<select data-config="${key}" id="config-${key}">${options.map(([value,label])=>`<option value="${escapeHtml(value)}" ${String(project.config[key])===String(value)?'selected':''}>${escapeHtml(label)}</option>`).join('')}</select>`;}
function button(step,label){return `<button class="button primary" data-job="${step}">${label}</button>`;}
function segmentTable(){return `<div class="table-scroll"><table class="segments-table"><thead><tr><th>Câu / thời gian</th><th>Người nói</th><th>Lời thoại gốc</th><th>Bản dịch Việt</th></tr></thead><tbody>${project.segments.map(s=>`<tr data-segment="${escapeHtml(s.id)}"><td><b>${escapeHtml(s.id)}</b><label>Bắt đầu<input type="number" min="0" step="0.01" data-field="start" value="${s.start}"></label><label>Kết thúc<input type="number" min="0" step="0.01" data-field="end" value="${s.end}"></label>${s.ratio?`<small class="${s.ratio<.8||s.ratio>1.2?'timing-bad':'timing-ok'}">Tỷ lệ ${s.ratio.toFixed(2)}×</small>`:''}</td><td><label>Người nói<select data-field="speaker" aria-label="Người nói câu ${escapeHtml(s.id)}">${project.speakers.map(v=>`<option value="${escapeHtml(v.id)}" ${s.speaker===v.id?'selected':''}>${escapeHtml(v.name)}</option>`).join('')}</select></label>${project.video?.audio?`<button class="button secondary" data-source="${escapeHtml(s.id)}">Nghe gốc</button>`:''}</td><td><textarea data-field="text" aria-label="Lời thoại câu ${escapeHtml(s.id)}">${escapeHtml(s.text)}</textarea></td><td><textarea data-field="translation" aria-label="Bản dịch câu ${escapeHtml(s.id)}">${escapeHtml(s.translation)}</textarea></td></tr>`).join('')}</tbody></table></div><audio id="sourceAudio" controls hidden aria-label="Nghe câu gốc"></audio><button class="button secondary" id="saveSegments">Lưu lời thoại & bản dịch</button>`;}
function renderStep(){
  if(!project)return;clearInterval(sourceStop);document.querySelector('#sourceAudio')?.pause();
  const label=labels[currentStep];document.querySelector('#crumbCurrent').textContent=label.crumb;document.querySelector('#pageTitle').textContent=label.title;document.querySelector('#pageDescription').textContent=label.desc;
  stepButtons.forEach(b=>{if(!b.classList.contains('step-button'))return;const active=b.dataset.step===currentStep;b.classList.toggle('is-active',active);if(active)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  document.querySelector('#environmentPanel').hidden=currentStep!=='environment';const panel=document.querySelector('#workflowPanel');panel.hidden=currentStep==='environment';
  if(currentStep==='video')panel.innerHTML=`<div class="workflow-content"><h2>Video đầu vào</h2><label class="file-drop">Chọn video trên máy<input id="videoUpload" type="file" accept="video/*"></label><p>File tối đa 4GB. App tạo bản sao trong dữ liệu dự án.</p><label>Hoặc link YouTube / TikTok / X<input id="videoUrl" type="url" placeholder="https://..."></label>${button('download','Tải video từ link')}<details><summary>Dùng đường dẫn file có sẵn</summary><label>Đường dẫn đầy đủ<input id="videoPath" type="text" placeholder="/Users/ban/video.mp4 hoặc C:\\Video\\clip.mp4"></label><button id="importPath" class="button secondary">Nhập video</button></details>${project.video?`<p><b>Đã chọn:</b> ${escapeHtml(project.video.file)} · ${Math.round(project.video.duration)} giây · ${project.video.width}×${project.video.height}</p><button class="button primary" data-next="transcript">Tiếp tục →</button>`:''}</div>`;
  if(currentStep==='transcript')panel.innerHTML=`<div class="workflow-content"><h2>Windi Decode</h2><label>Model nhận diện ${selectConfig('whisperModel',[['tiny','Local Decode Quick — thử nhanh'],['base','Local Decode Base'],['small','Local Decode Balanced — cân bằng'],['medium','Local Decode Accurate — cần nhiều RAM']])}</label><label>Ngôn ngữ gốc ${selectConfig('language',[['','Tự nhận diện'],['en','Tiếng Anh'],['zh','Tiếng Trung'],['ja','Tiếng Nhật'],['ko','Tiếng Hàn'],['vi','Tiếng Việt']])}</label>${button('transcribe','Nhận diện lời thoại')}<label class="import-json">Đã có timestamp? Nhập JSON<input id="transcriptUpload" type="file" accept=".json"></label><p>Nhận mảng câu hoặc JSON transcript gồm start, end, text. Nhập lại sẽ thay lời thoại và kết quả voice.</p>${project.segments.length?segmentTable():''}</div>`;
  if(currentStep==='translation')panel.innerHTML=`<div class="workflow-content"><h2>Dịch qua tài khoản của bạn</h2><label>Cách dịch ${selectConfig('provider',[['codex','Codex CLI — ChatGPT subscription'],['antigravity','Antigravity CLI — tài khoản đã đăng nhập'],['chat','LLM trong chat hiện tại — qua skill']])}</label><p>Chỉ lời thoại và thời lượng từng câu được gửi cho LLM. Video và âm thanh xử lý trên máy. Tác vụ dùng quota tài khoản của bạn.</p><p>Codex: chạy <code>codex login</code>. Antigravity: đăng nhập bằng <code>agy</code>. App desktop đang mở chưa bảo đảm CLI đã đăng nhập.</p>${button('translate',project.config.provider==='chat'?'Tạo yêu cầu dịch':'Dịch lời thoại')}${button('rewrite','Viết lại cho khớp thời lượng')}${project.pendingTranslation?`<div class="handoff-note"><p>Yêu cầu đã sẵn sàng. Trong chat, nói: “Dùng skill Windi Dubbing dịch tiếp dự án ${project.id}”.</p><a href="${artifactUrl('translation-request.json')}" download>Tải yêu cầu dịch JSON</a><label>Nhập kết quả từ LLM<input id="translationUpload" type="file" accept=".json"></label></div>`:''}${project.segments.length?segmentTable():'<p>Nhận diện hoặc nhập lời thoại trước.</p>'}</div>`;
  if(currentStep==='voice')panel.innerHTML=voicePanel();
  if(currentStep==='export')panel.innerHTML=`<div class="workflow-content"><h2>Xem thử & xuất</h2><label>Độ phân giải ${selectConfig('resolution',[[720,'720p — nhẹ'],[1080,'1080p']])}</label><label>Giữ âm thanh gốc ${selectConfig('backgroundVolume',[[0,'Tắt — chỉ giọng Việt'],[.1,'10%'],[.2,'20%'],[.3,'30%']])}</label><p>Giữ âm thanh gốc sẽ giữ cả lời nói gốc ở âm lượng nhỏ; đây chưa phải tách nhạc nền. Cross time-stretch có thể thay đổi nhẹ thời lượng video.</p>${button('render','Xuất video MP4')}${project.artifacts.render?`<div class="download-actions">${['mp4','srt','wav'].map(k=>`<a class="button secondary" href="${artifactUrl(project.artifacts.render[k])}?download=1">Tải ${k.toUpperCase()}</a>`).join('')}</div><p>Video ${project.artifacts.render.duration.toFixed(2)} giây đã lưu. Mở player ngoài app để kiểm tra lần cuối.</p>`:'<p>Tạo giọng và xử lý câu lệch thời lượng trước khi xuất.</p>'}</div>`;
  bindPanel();updatePreview();updateStatus();
  if(currentStep==='voice')ensureLocalVoices();
}
function voiceApiForm(){
  const isWindi=project.config.ttsProvider==='windi', settings=voiceSettings[project.config.ttsProvider]||{};
  return `<details class="voice-api-settings"><summary>Cấu hình ${isWindi?'Windi Voice':'API voice'} · ${settings.configured?'Đã lưu key':'Chưa có key'}</summary><label>Base URL<input id="voiceBaseUrl" type="url" value="${escapeHtml(settings.baseUrl||'')}" autocomplete="off"></label><label>${isWindi?'API key Windi':'API key'}<input id="voiceApiKey" type="password" autocomplete="new-password" placeholder="${settings.configured?'Để trống để giữ key hiện tại':isWindi?'windi_voice_… hoặc windi_kit_…':'Dán key của bạn'}"></label><p>${isWindi?'URL mặc định https://windistudio.app (không thêm /v1). Dán key đã tạo trong tài khoản Windi. Cần gói Voice trả phí hoặc giấy phép Workflow hợp lệ.':'Base URL cần gồm /v1. Chỉ nhận API trả audio trực tiếp.'} Key lưu riêng trên máy, không trả lại cho trình duyệt.</p>${isWindi?'<p>Lưu key chưa tạo tiếng. Tải danh sách để chọn thư viện / giọng clone được phép dùng; mỗi lần tạo gửi bản dịch cho Windi. Audio và mã lượt tạo được lưu để nghe lại, retry không tạo trùng.</p>':''}<button id="saveVoiceApi" class="button secondary">Lưu API</button><button id="clearVoiceApi" class="button secondary">Xóa key đã lưu</button><p id="apiResult" role="status"></p></details>`;
}
function voicePanel(){
  const local=project.config.ttsProvider==='local', count=project.speakers.length;
  return `<div class="workflow-content voice-workflow"><h2>Thiết lập giọng đọc</h2>
    <div class="voice-setup-grid"><label for="speakerCount">Số lượng giọng<select id="speakerCount"><option value="1" ${count===1?'selected':''}>1 giọng — một người đọc</option><option value="2" ${count===2?'selected':''}>2 giọng — MC + khách mời</option>${count>2?`<option value="${count}" selected disabled>${count} người — dự án đã nhập</option>`:''}</select></label>
    <label for="voiceSource">Dùng giọng<select id="voiceSource"><option value="local" ${local?'selected':''}>Local — chạy trên máy</option><option value="api" ${local?'':'selected'}>API — tài khoản của bạn</option></select></label></div>
    <p class="field-hint">${count===1?'Toàn bộ lời thoại dùng một giọng.':'Chọn giọng riêng cho MC và khách mời, rồi gán vai cho từng câu ở bước Lời thoại.'} Chuyển về 1 giọng sẽ gán tất cả câu về người đọc đầu tiên.</p>
    ${local?`<label>Model local ${selectConfig('mode',[['v3turbo','Local Voice Pro — chất lượng'],['v3nano','Local Voice Lite — nhẹ hơn'],['standard','Local Voice Standard']])}</label><p class="field-hint">Giọng có sẵn theo model local đã chọn. Lần đầu sử dụng có thể cần tải model.</p>`:
    `<label>Nhà cung cấp API ${selectConfig('ttsProvider',[['windi','Windi Voice API'],['elevenlabs','ElevenLabs API'],['openai','OpenAI / API tương thích OpenAI']])}</label><p class="api-notice">Nghe thử / tạo tiếng gửi bản dịch sang API đã chọn và dùng credit hoặc quota riêng.</p>${voiceApiForm()}${project.config.ttsProvider==='windi'?'<p class="field-hint">Windi Clone Pro 2.1 · không cần nhập model ID.</p>':`<label>Model ID<input data-config="apiModel" value="${escapeHtml(project.config.apiModel)}" placeholder="${project.config.ttsProvider==='elevenlabs'?'eleven_v3':'gpt-4o-mini-tts'}"></label>`}`}
    <div class="voice-library-heading"><span id="voiceCatalogStatus" role="status">${project.voices.length?`${project.voices.length} giọng ${local?'local':'API'} có thể chọn`:local?(project.job?.step==='voices'&&project.job.status==='error'?'Chưa lấy được giọng. Kiểm tra môi trường rồi bấm tải lại.':'Đang lấy danh sách giọng local…'):'Lưu API rồi tải danh sách giọng.'}</span>${button('voices',local?'Tải lại giọng local':'Tải danh sách giọng API')}</div>
    <label for="sampleText">Câu nghe thử<textarea id="sampleText" data-config="sampleText" maxlength="1000">${escapeHtml(project.config.sampleText)}</textarea></label><p class="field-hint">Dùng cùng một câu để so sánh các giọng. Audio được lưu để nghe lại.</p>
    <div class="speaker-list">${speakerRows()}</div><button class="button secondary" id="saveSpeakers">Lưu người nói & giọng</button><p id="voiceResult" role="status"></p>
    <details class="subtitle-settings"><summary>Phụ đề · chỉnh style, màu và cỡ chữ</summary><label>Style ${selectConfig('subtitle',[['outline','Chữ viền'],['box','Nền hộp'],['none','Không gắn sub vào video']])}</label><div class="config-grid"><label>Màu chữ<input data-config="color" type="color" value="${project.config.color}"></label><label>Cỡ chữ<input data-config="fontSize" type="number" min="18" max="100" value="${project.config.fontSize}"></label></div></details>
    <button id="saveConfig" class="button secondary">Lưu lựa chọn</button>${button('tts','Tạo giọng cho toàn bộ câu')}<p class="field-hint">Chưa tự tách người nói. Kiểm tra vai từng câu và tỷ lệ thời lượng trước khi xuất.</p></div>`;
}
async function ensureLocalVoices(){
  if(!project||currentStep!=='voice'||project.config.ttsProvider!=='local'||project.job?.status==='running'||dirty)return;
  const key=project.id+':'+project.config.mode;
  if(localVoiceAttempt===key)return;localVoiceAttempt=key;
  try{project=await api(projectApi('job'),{step:'voices'});lastJobStatus='running';if(currentStep==='voice')renderStep();}
  catch(e){const status=document.querySelector('#voiceCatalogStatus');if(status)status.textContent=e.message;}
}
function speakerRows(){return project.speakers.map(v=>{
  const count=project.segments.filter(s=>s.speaker===v.id).length,local=project.config.ttsProvider==='local',known=project.voices.some(voice=>voice.id===v.voice);
  return `<div class="speaker-row" data-speaker="${escapeHtml(v.id)}"><label>Tên / vai<input data-speaker-field="name" value="${escapeHtml(v.name)}" maxlength="100"></label><div class="speaker-voice"><label>Giọng cho ${escapeHtml(v.name)}<select data-voice-choice ${local&&!project.voices.length?'disabled':''}><option value="">${local?'Chọn giọng local':'Chọn giọng theo tên'}</option>${v.voice&&!known?`<option value="${escapeHtml(v.voice)}" selected>${escapeHtml(v.voice)} · đã chọn</option>`:''}${project.voices.map(voice=>`<option value="${escapeHtml(voice.id)}" ${voice.id===v.voice?'selected':''}>${escapeHtml(voice.label)}</option>`).join('')}</select></label>${local?`<input type="hidden" data-speaker-field="voice" value="${escapeHtml(v.voice)}">`:`<details class="manual-voice"><summary>Nhập voice ID thủ công</summary><label>Voice ID<input data-speaker-field="voice" value="${escapeHtml(v.voice)}" placeholder="Voice ID từ API của bạn" maxlength="200"></label></details>`}</div><small>${count} câu dùng giọng này</small><button class="button secondary" data-sample="${escapeHtml(v.id)}" ${!v.voice?'disabled':''}>Nghe thử ${escapeHtml(v.name)}</button>${project.artifacts.samples?.[v.id]?`<audio controls aria-label="Giọng thử ${escapeHtml(v.name)}" src="${artifactUrl(project.artifacts.samples[v.id])}?v=${encodeURIComponent(project.updatedAt)}"></audio>`:''}</div>`;
}).join('');}
function collectSpeakers(){return [...document.querySelectorAll('[data-speaker]')].map(row=>({id:row.dataset.speaker,...Object.fromEntries([...row.querySelectorAll('[data-speaker-field]')].map(el=>[el.dataset.speakerField,el.value]))}));}
async function saveConfig(){
  const config={};document.querySelectorAll('[data-config]').forEach(el=>config[el.dataset.config]=['fontSize','resolution','backgroundVolume'].includes(el.dataset.config)?Number(el.value):el.value);
  const speakers=document.querySelector('[data-speaker]')?collectSpeakers():undefined;
  if(Object.keys(config).length||speakers)project=await api(projectApi(),{config,...(speakers?{speakers}:{})},'PATCH');
}
async function changeVoiceSettings(work){
  if(voiceSettingsBusy)return;voiceSettingsBusy=true;updateStatus();
  try{await work();}catch(e){tell(e.message);}finally{voiceSettingsBusy=false;updateStatus();}
}
function bindPanel(){
  const panel=document.querySelector('#workflowPanel');panel.querySelectorAll('input,textarea,select').forEach(el=>el.addEventListener('input',()=>{if(!['voiceApiKey','voiceBaseUrl'].includes(el.id))dirty=true;}));
  panel.querySelectorAll('[data-voice-choice]').forEach(select=>select.addEventListener('change',()=>{select.closest('[data-speaker]').querySelector('[data-speaker-field="voice"]').value=select.value;dirty=true;updateStatus();}));
  panel.querySelectorAll('[data-speaker-field="voice"]').forEach(input=>input.addEventListener('input',()=>{const select=input.closest('[data-speaker]').querySelector('[data-voice-choice]');if(select)select.value=input.value;updateStatus();}));
  panel.querySelectorAll('[data-source]').forEach(b=>b.onclick=()=>{
    const segment=project.segments.find(s=>s.id===b.dataset.source),video=document.querySelector('#sourceAudio');
    clearInterval(sourceStop);video.hidden=false;const src=artifactUrl(project.video.file);if(video.getAttribute('src')!==src)video.src=src;video.currentTime=segment.start;video.play().catch(e=>tell(e.message));
    sourceStop=setInterval(()=>{if(video.currentTime>=segment.end||video.paused){video.pause();clearInterval(sourceStop);}},50);
  });
  panel.querySelectorAll('[data-sample]').forEach(b=>b.onclick=async()=>{try{
    const text=panel.querySelector('#sampleText').value;await saveConfig();pendingSampleSpeaker=b.dataset.sample;project=await api(projectApi('job'),{step:'sample',speaker:b.dataset.sample,text});dirty=false;lastJobStatus='running';renderStep();
  }catch(e){panel.querySelector('#voiceResult').textContent=e.message;}});
  panel.querySelector('#saveSpeakers')?.addEventListener('click',async()=>{try{await saveConfig();dirty=false;renderStep();tell('Đã lưu người nói và giọng.');}catch(e){panel.querySelector('#voiceResult').textContent=e.message;}});
  panel.querySelector('#speakerCount')?.addEventListener('change',e=>changeVoiceSettings(async()=>{
    const count=Number(e.target.value);await saveConfig();project=await api(projectApi(),{speakerCount:count},'PATCH');dirty=false;renderStep();
  }));
  async function changeVoiceProvider(value){
    await saveConfig();project=await api(projectApi(),{config:{ttsProvider:value,apiModel:value==='elevenlabs'?'eleven_v3':value==='openai'?'gpt-4o-mini-tts':''}},'PATCH');
    if(value!=='local')lastApiProvider=value;localVoiceAttempt='';dirty=false;renderStep();
  }
  panel.querySelector('#voiceSource')?.addEventListener('change',e=>changeVoiceSettings(()=>changeVoiceProvider(e.target.value==='local'?'local':lastApiProvider)));
  for(const [id,clearKey] of [['saveVoiceApi',false],['clearVoiceApi',true]])panel.querySelector('#'+id)?.addEventListener('click',async()=>{
    const result=panel.querySelector('#apiResult');try{result.textContent='Đang lưu…';voiceSettings=await api('/api/voice-config',{provider:project.config.ttsProvider,baseUrl:panel.querySelector('#voiceBaseUrl').value,apiKey:panel.querySelector('#voiceApiKey').value,clearKey});panel.querySelector('#voiceApiKey').value='';panel.querySelector('.voice-api-settings summary').textContent='Cấu hình '+(project.config.ttsProvider==='windi'?'Windi Voice':'API voice')+' · '+(voiceSettings[project.config.ttsProvider]?.configured?'Đã lưu key':'Chưa có key');result.textContent=clearKey?'Đã xóa key.':'Đã lưu API. Chưa gọi tạo tiếng.';}catch(e){result.textContent=e.message;}
  });
  panel.querySelector('[data-config="ttsProvider"]')?.addEventListener('change',e=>changeVoiceSettings(async()=>{
    const value=e.target.value;e.target.value=project.config.ttsProvider;await changeVoiceProvider(value);
  }));
  panel.querySelector('[data-config="mode"]')?.addEventListener('change',e=>changeVoiceSettings(async()=>{
    const value=e.target.value;e.target.value=project.config.mode;await saveConfig();project=await api(projectApi(),{config:{mode:value}},'PATCH');localVoiceAttempt='';dirty=false;renderStep();
  }));
  panel.querySelectorAll('[data-job]').forEach(b=>b.onclick=async()=>{try{await saveConfig();project=await api(projectApi('job'),{step:b.dataset.job,...(b.dataset.job==='download'?{url:panel.querySelector('#videoUrl').value}:{})});dirty=false;lastJobStatus='running';renderStep();}catch(e){tell(e.message);}});
  panel.querySelectorAll('[data-next]').forEach(b=>b.onclick=()=>showStep(b.dataset.next));
  panel.querySelector('#saveConfig')?.addEventListener('click',async()=>{try{await saveConfig();dirty=false;renderStep();tell('Đã lưu lựa chọn.');}catch(e){tell(e.message);}});
  panel.querySelector('[data-config="provider"]')?.addEventListener('change',async()=>{try{await saveConfig();renderStep();}catch(e){tell(e.message);}});
  panel.querySelector('#saveSegments')?.addEventListener('click',async()=>{try{const segments=[...panel.querySelectorAll('[data-segment]')].map(row=>{const s={id:row.dataset.segment};row.querySelectorAll('[data-field]').forEach(el=>s[el.dataset.field]=['start','end'].includes(el.dataset.field)?Number(el.value):el.value);return s;});project=await api(projectApi(),{segments},'PATCH');dirty=false;renderStep();tell('Đã lưu. Voice và video cũ cần tạo lại.');}catch(e){tell(e.message);}});
  panel.querySelector('#importPath')?.addEventListener('click',async()=>{try{project=await api(projectApi('import-video'),{path:panel.querySelector('#videoPath').value});dirty=false;renderStep();}catch(e){tell(e.message);}});
  panel.querySelector('#videoUpload')?.addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{tell('Đang nhập video…');const r=await fetch(projectApi('upload'),{method:'POST',headers:{'Content-Type':'application/octet-stream','X-File-Name':encodeURIComponent(file.name)},body:file});const x=await r.json();if(!r.ok)throw new Error(x.error);project=x;dirty=false;renderStep();}catch(e){tell(e.message);}});
  for(const kind of ['transcript','translation'])panel.querySelector('#'+kind+'Upload')?.addEventListener('change',async e=>{try{const input=JSON.parse(await e.target.files[0].text());project=kind==='translation'?await api(projectApi('translation'),input):await api(projectApi(),{segments:(Array.isArray(input)?input:input.segments).map((s,i)=>({...s,id:String(s.id??i)}))},'PATCH');dirty=false;renderStep();}catch(e){tell(e.message);}});
}
function showStep(id){if(!labels[id])return;if(dirty){tell('Hãy lưu thay đổi trước khi chuyển bước.');return;}currentStep=id;renderStep();}
function updatePreview(){if(!project)return;const video=document.querySelector('#realPreview'),demo=document.querySelector('#demoPreview');const file=project.artifacts.render?.mp4||project.video?.file;video.hidden=!file;demo.hidden=Boolean(file);if(file){const src=artifactUrl(file)+'?v='+encodeURIComponent(project.updatedAt);if(video.dataset.file!==file||video.dataset.revision!==String(project.revision)){video.src=src;video.dataset.file=file;video.dataset.revision=project.revision;}}const caption=document.querySelector('.caption-card>p');caption.textContent=project.segments.find(s=>s.translation)?.translation||'Giọng Việt tự nhiên hơn.';caption.style.color=project.config.color;caption.style.background=project.config.subtitle==='box'?'#18241d':'#3f4c45';}
function updateStatus(){if(!project)return;const job=project.job,busy=job?.status==='running'||voiceSettingsBusy,panel=document.querySelector('#jobPanel');panel.hidden=!job;if(job){document.querySelector('#jobMessage').textContent=job.message;document.querySelector('#jobProgress').value=job.progress||0;document.querySelector('#cancelJob').hidden=job.status!=='running';panel.dataset.status=job.status;}document.querySelectorAll('[data-sample],#speakerCount,#voiceSource,[data-voice-choice],[data-config=ttsProvider],[data-config=mode],#saveSpeakers,#saveVoiceApi,#clearVoiceApi,[data-remove-speaker],[data-job],#saveSegments,#saveConfig,#videoUpload,#importPath,#projectSelect,#newProject,[data-speaker-field],#sampleText').forEach(b=>b.disabled=busy);document.querySelectorAll('[data-sample]').forEach(b=>b.disabled=busy||!b.closest('[data-speaker]').querySelector('[data-speaker-field=voice]').value);document.querySelectorAll('[data-voice-choice]').forEach(b=>b.disabled=busy||(project.config.ttsProvider==='local'&&!project.voices.length));document.querySelector('#previewStatus').textContent=job?job.message:'Dữ liệu được lưu tự động trên máy.';}
async function poll(){if(!project||polling||voiceSettingsBusy)return;polling=true;try{const next=await api(projectApi());const completed=lastJobStatus==='running'&&next.job?.status!=='running';project=next;lastJobStatus=next.job?.status||'';if(completed&&!dirty){renderStep();if(pendingSampleSpeaker){const audio=document.querySelector('[data-speaker="'+pendingSampleSpeaker+'"] audio');pendingSampleSpeaker='';audio?.play().catch(()=>tell('Audio đã sẵn sàng. Bấm phát để nghe thử.'));}}else updateStatus();}catch{}finally{polling=false;}}
stepButtons.forEach(button=>button.addEventListener('click',()=>showStep(button.dataset.step)));
document.querySelector('#checkAgain').addEventListener('click',refreshEnvironment);
document.querySelector('#continueButton').addEventListener('click',()=>showStep('video'));
document.querySelector('#newProject').onclick=async()=>{if(dirty){tell('Hãy lưu thay đổi trước khi tạo dự án khác.');return;}try{const p=await api('/api/projects',{name:'Dự án '+new Date().toLocaleString('vi-VN')});await loadProjects(p.id);}catch(e){tell(e.message);}};
document.querySelector('#projectSelect').onchange=()=>{const select=document.querySelector('#projectSelect');if(dirty){select.value=project.id;tell('Hãy lưu thay đổi trước khi chuyển dự án.');return;}loadProjects(select.value).catch(e=>tell(e.message));};
document.querySelector('#cancelJob').onclick=async()=>{try{await api(projectApi('cancel'),{});tell('Đang hủy tác vụ…');}catch(e){tell(e.message);}};
document.querySelectorAll('[data-toast]').forEach(button=>button.addEventListener('click',()=>tell('Hướng dẫn dùng và cấu hình nằm trong README.md đi kèm kit.')));
refreshEnvironment();loadProjects().catch(e=>tell(e.message));setInterval(poll,1500);
