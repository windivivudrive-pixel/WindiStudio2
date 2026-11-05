import { describe, expect, it, vi } from 'vitest';
import { aipassBalance, aipassSubmit, aipassStatus, AipassError } from '@/lib/gemini/aipass';
const key = 'GEM12-0123456789ABCDEF';
const input = { cdkey: key, requestId: 'order-123', email: 'test@example.org', password: 'example', twofa: '00123456', plan: 'sub12' as const };
const reply = (data: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })) as any;
describe('AIPass integration', () => {
  it('preserves the same idempotency key and does not treat acceptance as success', async () => {
    const f = reply({ success: true, request_id: input.requestId, client_id: 'local:1234-5678' });
    expect(await aipassSubmit(input, f)).toEqual({ clientId: 'local:1234-5678', requestId: input.requestId });
    expect(JSON.parse(f.mock.calls[0][1].body)).toMatchObject({ request_id: input.requestId, task_type: 'sub12' });
  });
  it('rejects a plan mismatch before sending sensitive data', async () => {
    const f = reply({}); await expect(aipassSubmit({ ...input, plan: 'sub6' }, f)).rejects.toMatchObject({ kind: 'invalid' }); expect(f).not.toHaveBeenCalled();
  });
  it('treats uncertain submission as unknown, with no automatic retry', async () => {
    const f = reply({ success: true, submission_uncertain: true });
    await expect(aipassSubmit(input, f)).rejects.toMatchObject({ kind: 'unknown' }); expect(f).toHaveBeenCalledOnce();
  });
  it('does not expose provider error text that could contain credentials', async () => {
    const f = reply({ success: false, message: 'example secret', code: 'CARD_DEPLETED' }, 409);
    const error = await aipassBalance(key, f).catch(e => e);
    expect(error).toBeInstanceOf(AipassError); expect(error.code).toBe('CARD_DEPLETED'); expect(String(error)).not.toContain('example secret');
  });
  it('checks returned task identity and accepts only known states', async () => {
    await expect(aipassStatus(key, 'local:1234', reply({ success: true, data: { client_id: 'local:1234', status: 'Success', sub_expiry: '2027-01-01' } }))).resolves.toEqual({ status: 'Success', expiry: '2027-01-01' });
    await expect(aipassStatus(key, 'local:1234', reply({ success: true, data: { client_id: 'local:9999', status: 'Success' } }))).rejects.toMatchObject({ kind: 'unknown' });
  });
});
