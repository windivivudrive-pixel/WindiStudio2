const messages={GROK_UI_CONTROL_MISSING:'Giao diện Grok đã thay đổi; job dừng trước khi tạo video.',GROK_UI_OPTION_UNAVAILABLE:'Tuỳ chọn video không có trên tài khoản Grok này.',GROK_UI_REFERENCE_NOT_LISTED:'Ảnh đã gửi nhưng chưa xuất hiện trong Uploads. Chưa gửi lệnh tạo video.',GROK_SINGLE_REF_USES_SOURCE_ASPECT:'Một ref dùng tỉ lệ ảnh gốc (aspect auto). Dùng hai ref để chọn tỉ lệ video.',GROK_WEB_CHALLENGE:'Grok yêu cầu xác minh trong tab riêng của extension. Tải lại tab Grok rồi thử lại.',GROK_WEB_PAGE_OUTDATED:'Tab Grok đã cũ. Tải lại tab Grok do Windi quản lý rồi tiếp tục job.',GROK_WEB_EDIT_BLOCKED:'Grok Web đã chặn endpoint tạo ảnh có ref (HTTP 403). Phiên vẫn đăng nhập; thử lại sau khi tải lại tab Grok.',GROK_WEB_VIDEO_REFERENCES_UNSUPPORTED:'Runtime Grok cũ chưa hỗ trợ video ref. Cập nhật Windi Connect 0.6.3 trở lên.',GROK_LOGIN_REQUIRED:'Đăng nhập Grok để tạo ảnh và video.',GROK_ENTITLEMENT_REQUIRED:'Tài khoản chưa có quyền sử dụng API Grok.',GROK_QUOTA_EXCEEDED:'Grok đang giới hạn quota. Hãy thử lại sau.',GROK_JOB_ACTIVE:'Đợi job Grok hoàn tất hoặc huỷ job trước khi làm mới tab.',GROK_OAUTH_PORT_BUSY:'Một phiên đăng nhập Grok khác đang mở. Hoàn tất hoặc đóng phiên đó.',GROK_LOGIN_TIMEOUT:'Hết thời gian đăng nhập. Bấm Đăng nhập để thử lại.',GROK_LOGIN_ALREADY_PENDING:'Hãy hoàn tất đăng nhập trong tab vừa mở.',GROK_RESULT_UNKNOWN:'Chưa xác định kết quả. Windi không gửi lại tự động.'};
export function grokCard(status={}){
  const card=document.createElement('section');card.className=`provider-card ${status.backendConnected&&status.authenticated?'online':'offline'}`;card.style.gridColumn='1 / -1';
  card.innerHTML='<div class="provider-head"><div><i></i><strong>Grok Web</strong></div><span></span></div><p role="status" aria-live="polite"></p><div class="mini-metrics"></div><div class="provider-actions"></div>';
  card.querySelector('.provider-head>span').textContent=!status.backendConnected?'Chưa kết nối máy':status.authPending?'Đang đăng nhập':status.active?'Đang xử lý':status.authenticated?'Đã đăng nhập':'Chưa đăng nhập';
  card.querySelector('p').textContent=status.error?(messages[status.error]||status.error):status.authPending?'Hoàn tất đăng nhập trong tab Grok vừa mở.':!status.backendConnected?'Cài Windi Connect bản mới để kết nối Grok.':status.authenticated?'Ảnh: tối đa 8 ref theo thứ tự @image1…@image8. Video: 1–2 ref, tự lưu MP4; 1 ref giữ tỉ lệ ảnh gốc, 2 ref chọn được 9:16/16:9. Kết quả tự lưu vào project.':'Đăng nhập grok.com trên trình duyệt, rồi kết nối Grok Web.';
  card.querySelector('.mini-metrics').textContent=`${status.complete||0} hoàn tất · ${status.queued||0} chờ · ${status.failed||0} lỗi`;
  const recoverable=['GROK_WEB_CHALLENGE','GROK_WEB_PAGE_OUTDATED','GROK_WEB_EDIT_BLOCKED'].includes(status.error);
  const actions=status.backendConnected?(status.authenticated?(recoverable?[['refresh','Tải lại tab Grok'],['doctor','Kiểm tra']]:[['doctor','Kiểm tra'],['logout','Ngắt kết nối']]):[['login','Đăng nhập Grok'],['reconnect','Kết nối lại']]):[['reconnect','Kết nối lại']];
  for(const [action,label] of actions){
    const button=document.createElement('button');button.textContent=label;
    button.disabled=action==='login'&&status.authPending||['logout','refresh'].includes(action)&&Boolean(status.active);
    button.onclick=()=>{
      button.disabled=true;const note=card.querySelector('p');note.textContent='Đang xử lý…';
      let finished=false;
      const timer=setTimeout(()=>{finished=true;button.disabled=false;note.textContent='Không nhận được phản hồi. Tải lại Windi Connect rồi thử lại.';},25000);
      chrome.runtime.sendMessage({type:'grokAction',action},response=>{
        const error=chrome.runtime.lastError?.message||response?.error;
        if(finished)return;finished=true;clearTimeout(timer);button.disabled=false;
        if(error){note.textContent=messages[error]||error;return;}
        if(response?.ok!==true){note.textContent='Extension chưa phản hồi đúng. Tải lại Windi Connect rồi thử lại.';return;}
        note.textContent=action==='login'?'Đã kết nối phiên Grok Web trong trình duyệt.':action==='doctor'?'Phiên Grok Web đang hoạt động.':action==='refresh'?'Đã tải lại tab Grok do Windi quản lý. Có thể tiếp tục job.':action==='logout'?'Đã ngắt Windi khỏi tab Grok; tài khoản web vẫn đăng nhập.':'Đã kết nối lại với phiên Grok Web.';
      });
    };
    card.querySelector('.provider-actions').append(button);
  }
  return card;
}
