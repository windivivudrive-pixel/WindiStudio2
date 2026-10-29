import { expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('../lib/voice/server', () => ({ providerReady: () => true, failure: () => new Response(null, { status: 500 }) }));

import { GET } from '../app/api/voice/voices/route';
import { CURATED_PUBLIC_VOICES, STARTER_VOICES, isHeyGenLibraryVoice, type StudioVoice } from '../lib/voice/shared';

test('the public library endpoint returns the curated HeyGen voices only', async () => {
  const response = await GET();
  const result = await response.json();
  expect(response.status).toBe(200);
  expect(result.voices).toEqual(CURATED_PUBLIC_VOICES);
  expect(result.voices).toHaveLength(12);
  expect(result.voices.map((voice: StudioVoice) => voice.name)).toEqual(expect.arrayContaining(['Quỳnh Nhi', 'Lữ Trình', 'Kim Thoa', 'Thanh Thảo', 'Đình Mạnh', 'Thích Tâm Tuệ', 'Thùy Tâm']));
  expect(STARTER_VOICES.some(voice => result.voices.some((item: StudioVoice) => item.id === voice.id))).toBe(false);
});

test('the library includes HeyGen clones and excludes legacy Cartesia clones', () => {
  const clone: StudioVoice = { id: 'a1777309406040f8b90c19158dab5979', name: 'Mine', language: 'vi', description: '', kind: 'clone' };
  expect(isHeyGenLibraryVoice(clone)).toBe(true);
  expect(isHeyGenLibraryVoice({ ...clone, id: '4499b44b-5180-4d65-9d76-e24405138493' })).toBe(false);
  expect(isHeyGenLibraryVoice(STARTER_VOICES[0])).toBe(false);
});
