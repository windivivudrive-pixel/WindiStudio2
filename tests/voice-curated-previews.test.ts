import { expect, test } from 'vitest';
import { CURATED_PUBLIC_VOICES } from '../lib/voice/shared';
import { CURATED_PREVIEW_SCRIPTS, CURATED_PREVIEW_VERSION } from '../lib/voice/preview-scripts';

test('each curated voice has a distinct, appropriately sized preview script', () => {
  expect(CURATED_PREVIEW_VERSION).toBe('v2-curated-20261029');
  const scripts = CURATED_PUBLIC_VOICES.map(voice => CURATED_PREVIEW_SCRIPTS[voice.id]);
  expect(scripts.every(text => text && [...text].length >= 400 && [...text].length <= 600)).toBe(true);
  expect(new Set(scripts).size).toBe(scripts.length);
});
