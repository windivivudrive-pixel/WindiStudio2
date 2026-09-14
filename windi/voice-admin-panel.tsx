'use client';

import { useState } from 'react';
import type { StudioVoice } from '@/lib/voice/shared';

export function VoiceAdminPanel({onSelect}:{onSelect:(voice:StudioVoice)=>void}) {
  const [id,setId]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [voices,setVoices]=useState<StudioVoice[]>([]);
  const [cursor,setCursor]=useState<string|null>(null);
  const [loaded,setLoaded]=useState(false);
  async function read(query='') {
    const r=await fetch(`/api/voice/admin${query}`,{cache:'no-store'});
    const data=await r.json();
    if(!r.ok) throw new Error(data.error||'Chưa tải được dữ liệu.');
    return data;
  }
  async function selectId() {
    setBusy(true);setError('');
    try {const data=await read(`?voice=${encodeURIComponent(id.trim())}`);onSelect(data.voice);}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function load() {
    setBusy(true);setError('');
    try {const data=await read(`?view=voices${cursor?`&cursor=${encodeURIComponent(cursor)}`:''}`);setVoices(old=>[...new Map([...old,...data.voices].map(v=>[v.id,v])).values()]);setCursor(data.hasMore?data.nextPage:null);setLoaded(true);}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <section className="voice-admin-panel" aria-label="Quản trị Clone Pro 2.1">
    <strong>Quản trị Clone Pro 2.1</strong>
    <div className="voice-admin-controls">
      <input aria-label="Clone Pro 2.1 Voice ID" placeholder="Nhập Clone Pro 2.1 Voice ID" value={id} onChange={e=>setId(e.target.value)}/>
      <button type="button" className="voice-btn" disabled={busy||!id.trim()} onClick={()=>void selectId()}>Dùng giọng này</button>
      <button type="button" className="voice-btn" disabled={busy||(loaded&&!cursor)} onClick={()=>void load()}>{loaded?'Tải thêm giọng':'Mở thư viện Clone Pro 2.1'}</button>
    </div>
    {!!voices.length&&<select aria-label="Thư viện Clone Pro 2.1" defaultValue="" onChange={e=>{const v=voices.find(v=>v.id===e.target.value);if(v){onSelect(v);setId(v.id);}}}>
      <option value="" disabled>Chọn giọng ({voices.length})</option>
      {voices.map(v=><option key={v.id} value={v.id}>{v.name} · {v.language} · {v.id}</option>)}
    </select>}
    {error&&<p role="alert">{error}</p>}
    <p>Admin dùng quota của tài khoản Clone Pro 2.1 đang kết nối. Mỗi lần tạo vẫn được ghi vào lịch sử.</p>
  </section>;
}
