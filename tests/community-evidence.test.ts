import { expect, test } from 'vitest';
import { embedUrl, externalHttps, type EvidenceMedia } from '../lib/community-evidence';
const video: EvidenceMedia = {id:'test',kind:'YOUTUBE',source_url:'https://youtube.com/watch?v=5GCzrX0CNkc',media_url:'https://youtube.com/watch?v=5GCzrX0CNkc',alt_text:'Demo',rights_basis:'PLATFORM_EMBED',rights_verified_at:'2026-09-03T00:00:00Z'};
test('only verified allowlisted videos can become privacy-enhanced embeds', () => {
  expect(embedUrl(video)).toBe('https://www.youtube-nocookie.com/embed/5GCzrX0CNkc');
  expect(embedUrl({...video,rights_basis:'LINK_ONLY'})).toBeNull();
  expect(embedUrl({...video,rights_verified_at:null})).toBeNull();
  expect(embedUrl({...video,media_url:'https://youtube.com.attacker.example/watch?v=5GCzrX0CNkc'})).toBeNull();
});
test('unsafe external media URLs are rejected', () => {
  for (const url of ['javascript:alert(1)','http://example.com/a','https://127.0.0.1/a','https://user:pass@example.com/a','https://localhost/a']) expect(externalHttps(url)).toBeNull();
});
