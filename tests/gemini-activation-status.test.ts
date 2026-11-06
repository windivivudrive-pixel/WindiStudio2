import { describe, expect, it } from 'vitest';
import { canSubmitActivation, resolveActivationStatus } from '@/lib/gemini/activation-status';

const success = { requestId: 'old-request', status: 'Success' };
const running = { requestId: 'new-request', status: 'Running' };
const balance = { plan: 'sub6', remainingUses: 0, cardStatus: 'depleted' };

describe('activation status', () => {
  it('allows retries only after a failed or cancelled request has usable balance', () => {
    expect(canSubmitActivation('old-request', 'Failed', 'empty', 'ready')).toBe(true);
    expect(canSubmitActivation('old-request', 'Cancelled', 'empty', 'ready')).toBe(true);
    for (const status of ['Running', 'Uncertain', 'Success']) expect(canSubmitActivation('old-request', status, 'ready', 'ready')).toBe(false);
    for (const state of ['checking', 'error', 'unavailable']) expect(canSubmitActivation('old-request', 'Failed', 'ready', state)).toBe(false);
    expect(canSubmitActivation('', undefined, 'ready', 'checking')).toBe(true);
  });
  it('shows the successful request for a depleted code', () => {
    expect(resolveActivationStatus([success], balance, 'sub6')).toEqual({ kind: 'task', task: success });
  });
  it('tracks an active request before older successes', () => {
    expect(resolveActivationStatus([success, running], balance, 'sub6')).toEqual({ kind: 'task', task: running });
  });
  it('shows an unused code with remaining uses as valid', () => {
    expect(resolveActivationStatus([], { ...balance, remainingUses: 1, cardStatus: 'active' }, 'sub6')).toEqual({ kind: 'ready' });
  });
  it('does not infer success when no successful task exists', () => {
    expect(resolveActivationStatus([], balance, 'sub6')).toEqual({ kind: 'unavailable' });
    expect(resolveActivationStatus([], { ...balance, cardStatus: 'revoked' }, 'sub6')).toEqual({ kind: 'unknown' });
  });
});
