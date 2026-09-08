'use client';
import {useEffect} from 'react';
import {RetroWindow} from '@/windi/ui/retro';
export default function ErrorPage({error,reset}:{error:Error & {digest?:string};reset:()=>void}) {
  useEffect(()=>{console.error('ErrorBoundary caught:', error);},[error]);
  return (
    <div className="page narrow-page">
      <RetroWindow title="THỬ LẠI NHÉ" accent="orange">
        <h1>Chưa tải được trang</h1>
        <p>Bạn thử tải lại sau một lát nhé.</p>
        {error?.message && (
          <p style={{ fontSize: 12, opacity: 0.85, fontFamily: 'var(--font-geist-mono)', background: 'var(--surface-2)', padding: '8px 12px', borderRadius: 6, border: '1.5px solid var(--border)', margin: '12px 0', wordBreak: 'break-word' }}>
            Chi tiết: {error.message}
          </p>
        )}
        <button className="retro-button primary" onClick={()=>reset()}>Thử lại</button>
      </RetroWindow>
    </div>
  );
}
