import { describe, expect, it } from 'vitest';
import { calculateWindiScore } from '@/lib/score';

const valid = { utility: 50, setup: 10, originality: 20, adoption: 20 };

describe('calculateWindiScore', () => {
  it('adds the independently stored score components to 100', () => {
    expect(calculateWindiScore(valid)).toBe(100);
  });

  it('rejects component values beyond the documented maximum', () => {
    expect(() => calculateWindiScore({ ...valid, utility: 51 })).toThrow('utility');
    expect(() => calculateWindiScore({ ...valid, setup: 11 })).toThrow('setup');
    expect(() => calculateWindiScore({ ...valid, originality: 21 })).toThrow('originality');
    expect(() => calculateWindiScore({ ...valid, adoption: 21 })).toThrow('adoption');
  });
});
