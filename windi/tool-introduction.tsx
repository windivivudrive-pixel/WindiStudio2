'use client';

import { useEffect, useState } from 'react';
import type { WindiResource } from '@/lib/windi-data';
import { toolIntroduction } from '@/lib/tool-editorial';
import { useAuth } from './auth-context';

export function ToolIntroduction({resource}:{resource:WindiResource}) {
  const intro = toolIntroduction(resource);
  const {user} = useAuth();
  const [allowed,setAllowed] = useState(false);
  const [message,setMessage] = useState('');
  const [draft,setDraft] = useState('');
  useEffect(()=>{setDraft('');setMessage('');},[resource.slug,user?.id]);
  useEffect(()=>{
    setAllowed(false);
    if (!user) return;
    const controller = new AbortController();
    fetch('/api/editor/social-copy',{signal:controller.signal,cache:'no-store'})
      .then(r=>r.json()).then(r=>{if(!controller.signal.aborted)setAllowed(r.allowed===true);}).catch(()=>{});
    return ()=>controller.abort();
  },[user?.id]);
  async function copy() {
    try {
      const response=await fetch(`/api/editor/social-copy?slug=${encodeURIComponent(resource.slug)}`,{cache:'no-store'});
      if(!response.ok) throw new Error();
      const {text}=await response.json();
      setDraft(text);
      await navigator.clipboard.writeText(text);
      setMessage('Đã copy bài Facebook, hashtag và link về tool.');
    } catch {setMessage('Chưa copy được. Hãy thử lại.');}
  }
  return <div className="tool-introduction">
    <p className="long-copy"><strong>{intro.hook}</strong></p>
    <p className="long-copy">{intro.summary}</p>
    {!!intro.features.length&&<><h3>Điểm nổi bật</h3><ul>{intro.features.map(f=><li key={f} style={{marginBottom:10,lineHeight:1.6}}>{f}</li>)}</ul></>}
    {!resource.creatorBrief&&intro.example&&<><h3>Thử ngay với công việc của bạn</h3><p className="long-copy">{intro.example}</p></>}
    {intro.detail&&<p className="long-copy" style={{whiteSpace:'pre-line'}}>{intro.detail}</p>}
    {allowed&&<div data-windi-no-translate style={{marginTop:16}}><button type="button" className="retro-button secondary" onClick={copy}>Copy bài Facebook + hashtag</button><p role="status">{message}</p>{draft&&<details><summary>Xem nội dung bài Facebook</summary><textarea aria-label="Bài Facebook kèm hashtag" className="easy-prompt-text" readOnly value={draft} /></details>}</div>}
  </div>;
}
