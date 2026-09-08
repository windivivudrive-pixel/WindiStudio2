'use client';
import { Command, CornerDownLeft, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { WindiResource } from '@/lib/windi-data';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WindiResource[]>([]);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen(true); }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => { cancelAnimationFrame(frame); requestAnimationFrame(() => previous?.isConnected ? previous.focus() : triggerRef.current?.focus()); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setResults([]); setMessage('Đang tìm kiếm…');
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {signal:controller.signal});
        if (!response.ok) throw new Error('Database unavailable');
        const body = await response.json();
        if (!controller.signal.aborted) { setResults(body.data.slice(0,6)); setMessage(body.data.length ? '' : 'Chưa có công cụ được duyệt phù hợp.'); }
      } catch { if (!controller.signal.aborted) setMessage('Chưa tải được danh mục. Vui lòng thử lại.'); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [open,query]);
  if (!open) return <button ref={triggerRef} aria-label="Tìm kiếm Windi" className="command-trigger" onClick={() => setOpen(true)}><Search size={16} /> Tìm kiếm <kbd>⌘ K</kbd></button>;
  return <div className="dialog-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
    <section ref={dialogRef} className="command-dialog" role="dialog" aria-modal="true" aria-label="Tìm kiếm Windi" onMouseDown={event => event.stopPropagation()} onKeyDown={event => {
      const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('input,button,a[href]') || []);
      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); }
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault(); const index = items.indexOf(document.activeElement as HTMLElement);
        items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
      }
    }}>
      <div className="command-input"><Search size={19} /><input ref={inputRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm Skills, MCPs, workflows..." aria-label="Tìm trong Windi" /><button onClick={() => setOpen(false)} aria-label="Đóng tìm kiếm"><X size={18} /></button></div>
      <div className="command-list"><p role="status" aria-live="polite">{message || `${results.length} kết quả`}</p>{results.map(item => <a key={item.slug} href={item.type === 'STACK' ? `/stack/${item.slug}` : `/tool/${item.slug}`}><span className="command-mark">{item.name.slice(0,1)}</span><span><strong>{item.name}</strong><small>{item.type.replace('_',' ')}</small></span><CornerDownLeft size={15} /></a>)}</div>
      <footer><Command size={14} /> Tab / phím mũi tên để chọn · Esc để đóng.</footer>
    </section>
  </div>;
}
