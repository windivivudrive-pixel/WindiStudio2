"use client";

import {useState} from 'react';
import {Check, Copy} from 'lucide-react';
import {isUUID} from '@/lib/voice/shared';

export function VoiceId({id}: {id?:string|null}) {
  const [message,setMessage]=useState('');
  if(!isUUID(id)) return null;
  return <div className="voice-id-field">
    <span>Voice ID</span><code>{id}</code>
    <button type="button" className="voice-btn" aria-label={`Sao chép Voice ID ${id}`} onClick={async event=>{
      event.stopPropagation();
      try {await navigator.clipboard.writeText(id);setMessage('Đã sao chép');}
      catch {setMessage('Chưa sao chép được. Bạn có thể chọn ID để sao chép.');}
    }}>{message==='Đã sao chép'?<Check size={14}/>:<Copy size={14}/>} Sao chép Voice ID</button>
    <small role="status">{message}</small>
  </div>;
}
