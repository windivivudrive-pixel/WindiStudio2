'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="vi">
      <body style={{ margin: 0, background: '#cfe7fa', color: '#28332f', fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <section style={{ width: 'min(620px, 100%)', background: '#fff9ea', border: '2px solid #32483e', borderRadius: 14, boxShadow: '6px 6px 0 rgba(50,72,62,.24)', padding: 24 }}>
            <p style={{ fontSize: 11, letterSpacing: '.12em', marginTop: 0 }}>WINDI SYSTEM ERROR</p>
            <h1 style={{ fontSize: 'clamp(28px, 6vw, 48px)', lineHeight: 1, margin: '18px 0 12px' }}>Trang đang gặp trục trặc.</h1>
            <p style={{ lineHeight: 1.6, color: '#62706a' }}>Phiên hiển thị bị gián đoạn. Bạn có thể thử tải lại ngay.</p>
            <button type="button" onClick={() => reset()} style={{ border: '2px solid #32483e', borderRadius: 9, padding: '10px 14px', background: '#468e65', color: '#1d2924', font: '700 13px inherit', cursor: 'pointer' }}>Thử tải lại</button>
          </section>
        </main>
      </body>
    </html>
  );
}
