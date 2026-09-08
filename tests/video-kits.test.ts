import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,test} from 'vitest';
import {VideoKitPreview} from '../windi/video-kit-preview';
import {VideoKitFeature} from '../windi/video-kit-feature';

test('Video Kits is a clearly labeled preview, not a downloadable or paid workflow',()=>{
  const html=renderToStaticMarkup(createElement(VideoKitPreview));
  expect(html).toContain('BẢN XEM TRƯỚC');
  expect(html).toContain('Minh họa định hướng, chưa phải quy trình phát hành.');
  expect(html).toContain('Không tải xuống, không chạy tool, không phát sinh phí.');
  expect(html.match(/aria-pressed=/g)).toHaveLength(7);
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
  expect(html).not.toMatch(/\bdownload=|href=".*\.zip|<iframe|<video/);
});
test('prominent homepage feature leads to its separate preview route',()=>{
  const html=renderToStaticMarkup(createElement(VideoKitFeature));
  expect(html).toContain('href="/video-kits"');
  expect(html).toContain('SẮP RA MẮT');
});
