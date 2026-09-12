import {PROVIDER} from './provider.js';

const $=id=>document.getElementById(id);
const label=PROVIDER==='flow'?'Flow':'ChatGPT';
const displayPath=value=>value?.replace(/^\/Users\/[^/]+/,'~')||'';
const formatWhen=value=>{if(!value)return'';const date=new Date(value);return Number.isNaN(date.valueOf())?'':date.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});};
function renderAssets(status){
  const assets=status.assets||[];const latest=assets[0];$('saved-count').textContent=String(status.complete||0);$('asset-total').textContent=`${status.complete||0} file`;
  $('folder-state').textContent=latest?'Đã lưu':'Chưa có ảnh';$('output-name').textContent=latest?latest.path.split('/').pop():'Chưa có file được lưu';$('output-path').textContent=latest?displayPath(latest.path):'Ảnh gốc sau khi kiểm tra sẽ hiện tại đây.';
  $('assets').replaceChildren();if(!assets.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='Chưa có ảnh được Windi lưu vào project. Khi job hoàn tất, ảnh gốc sẽ xuất hiện ở đây.';$('assets').append(empty);return;}
  for(const item of assets){const row=document.createElement('div');row.className='asset';const name=item.path.split('/').pop();row.innerHTML='<span class="asset-mark">▣</span><div><strong></strong><small></small></div><time></time>';row.querySelector('strong').textContent=name;row.querySelector('small').textContent=displayPath(item.path);row.querySelector('time').textContent=formatWhen(item.created_at);$('assets').append(row);}
}
function render(status){
  $('provider').textContent=label;$('titlebar').style.setProperty('--accent',PROVIDER==='flow'?'var(--green)':'var(--pink)');
  const connected=Boolean(status.connected);$('light').classList.toggle('offline',!connected);$('status-title').textContent=connected?'Backend đã kết nối':'Chưa kết nối backend';
  const pairing=status.error==='PAIRING_REQUIRES_RESET';const oldExtension=status.error==='PROTOCOL_VERSION_MISMATCH';$('status-copy').textContent=oldExtension?'Extension đang là bản cũ. Hãy Reload extension từ folder Windi Connect đã cài.':pairing?'Extension này cần được ghép lại với Windi trên máy.':connected?(status.error||'Sẵn sàng nhận job từ mọi Windi project.'):(status.error||'Hãy kiểm tra bộ cài rồi kết nối lại.');
  const active=status.active;$('operation').textContent=active?`Đang: ${active.status}`:(status.queued?`${status.queued} job đang chờ`:'Chưa có job');$('operation').classList.toggle('active',Boolean(active||status.queued));
  $('sent-count').textContent=String((status.complete||0)+(status.failed||0)+(status.queued||0)+(active?1:0));$('failed-count').textContent=String(status.failed||0);renderAssets(status);
  $('pair').textContent=oldExtension?'Load folder extension ổn định rồi bấm Reload':'Ghép nối tự động theo browser/profile đã chọn';$('reconnect').textContent=pairing?'Ghép lại':'Kết nối lại';$('reconnect').dataset.pairing=String(pairing);
}
async function refresh(){const {status={}}=await chrome.storage.local.get('status');render(status);}
function showError(error){render({connected:false,error:error.message?.includes('context invalidated')?'Extension vừa được nạp lại. Hãy đóng popup rồi mở lại.':error.message||'Đã xảy ra lỗi không xác định.'});}
$('reconnect').onclick=()=>{const type=$('reconnect').dataset.pairing==='true'?'resetPairing':'reconnect';return chrome.runtime.sendMessage({type}).then(refresh).catch(showError);};
$('open').onclick=()=>chrome.runtime.sendMessage({type:'openStatusTab'}).then(refresh).catch(showError);
chrome.storage.onChanged.addListener(()=>void refresh().catch(showError));void refresh().catch(showError);
