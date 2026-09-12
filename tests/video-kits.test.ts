import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,test} from 'vitest';
import {VideoKitPreview} from '../windi/video-kit-preview';
import {VideoKitFeature} from '../windi/video-kit-feature';

test('Video workflow preview shows the complete approval-gated local pipeline',()=>{
  const html=renderToStaticMarkup(createElement(VideoKitPreview));
  expect(html).toContain('WINDI WORKFLOW / QUY TRÌNH');
  expect(html).toContain('Ba điểm duyệt luôn cần quyết định của bạn');
  expect(html).toContain('>Layout</button>');
  expect(html).toContain('Mỗi artifact được lưu theo phiên bản trong project.');
  expect(html.match(/aria-pressed=/g)).toHaveLength(10);
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
  expect(html).not.toMatch(/\bdownload=|href=".*\.zip|<iframe|<video/);
});
test('prominent homepage feature leads to its separate preview route',()=>{
  const html=renderToStaticMarkup(createElement(VideoKitFeature));
  expect(html).toContain('href="/video-kits"');
  expect(html).toContain('WINDI VIDEO KITS');
  expect(html).not.toContain('SẮP RA MẮT');
});
