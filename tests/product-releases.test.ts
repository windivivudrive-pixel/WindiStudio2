import { describe, expect, test } from 'vitest';
import { latestProductRelease } from '@/lib/products/releases';

describe('latestProductRelease', () => {
  test('prefers semantic version over created_at', () => {
    const release = latestProductRelease([
      { id: 'newer-row', version: '0.5.9', created_at: '2026-09-16T00:00:00Z' },
      { id: 'older-row', version: '0.5.10', created_at: '2026-09-15T00:00:00Z' },
    ]);
    expect(release?.version).toBe('0.5.10');
  });

  test('prefers stable over a prerelease of the same version', () => {
    const release = latestProductRelease([
      { version: '0.5.10-rc.1' },
      { version: '0.5.10' },
    ]);
    expect(release?.version).toBe('0.5.10');
  });
});
