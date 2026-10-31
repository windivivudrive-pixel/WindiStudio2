import { readFile, writeFile } from 'node:fs/promises';
import { createElement as h } from 'react';
import { ImageResponse } from 'next/og.js';

const root = new URL('../', import.meta.url);
const font = await readFile(new URL('public/SVN-Calling Code Bold.otf', root));
const ink = '#263d34';
const wave = [32, 58, 86, 50, 112, 148, 78, 180, 128, 64, 106, 152, 92, 46, 72];
const element = h('div', {
  style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '56px 64px', background: '#f8f1e7', color: ink, fontFamily: 'Calling Code', border: `12px solid ${ink}` },
},
  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 22 } },
    h('span', null, 'WINDI STUDIO / VOICE STUDIO'),
    h('span', { style: { padding: '10px 16px', border: `2px solid ${ink}`, borderRadius: 6, background: '#f4c55b', fontSize: 16 } }, 'CLONE PRO 3.0'),
  ),
  h('div', { style: { display: 'flex', alignItems: 'center', gap: 32 } },
    h('div', { style: { display: 'flex', flexDirection: 'column', width: 750 } },
      h('div', { style: { fontSize: 64, lineHeight: 1.2, letterSpacing: '-3px' } }, 'Clone giọng.'),
      h('div', { style: { fontSize: 64, lineHeight: 1.2, letterSpacing: '-3px' } }, 'Voice AI'),
      h('div', { style: { fontSize: 64, lineHeight: 1.2, letterSpacing: '-3px', color: '#3b7657' } }, 'giàu cảm xúc.'),
    ),
    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: 240, height: 240, border: `2px solid ${ink}`, borderRadius: 16, background: '#f4c55b', boxShadow: `8px 8px 0 ${ink}` } },
      ...wave.map((height, i) => h('div', { key: i, style: { width: 6, height, borderRadius: 4, background: ink } })),
    ),
  ),
  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `2px solid ${ink}`, paddingTop: 22, fontSize: 19 } },
    h('span', null, 'Giọng AI tiếng Việt · Video · Podcast · Kể chuyện'),
    h('span', null, 'windistudio.app'),
  ),
);

const response = new ImageResponse(element, {
  width: 1200,
  height: 630,
  fonts: [{ name: 'Calling Code', data: font, weight: 700, style: 'normal' }],
});
if (!response.ok) throw new Error(`Image generation failed: ${response.status}`);
await writeFile(new URL('public/voice-studio-og.png', root), Buffer.from(await response.arrayBuffer()));
console.log('Generated public/voice-studio-og.png (1200 × 630)');
