import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/gemini/aipass', () => ({ AipassError: class extends Error { constructor(public kind: string, public code?: string) { super('request failed'); } }, aipassBalance: vi.fn(), aipassSubmit: vi.fn() }));
import { POST } from '@/app/api/gemini/activate/route';
import { aipassSubmit, AipassError } from '@/lib/gemini/aipass';
const key = 'GEM6-0123456789ABCDEF0123456789ABCDEF';
function request(body: object) { return new Request('https://example.com/api/gemini/activate', { method: 'POST', headers: { origin: 'https://example.com', 'content-type': 'application/json' }, body: JSON.stringify(body) }); }
const payload = { action: 'submit', cdkey: key, requestId: 'request-1', email: 'test@example.com', password: 'example', twofa: '12345678' };
beforeEach(() => vi.clearAllMocks());
describe('activation response safety', () => {
  it('marks locally invalid codes as not submitted', async () => { const response = await POST(request({ ...payload, cdkey: 'bad' })); expect(await response.json()).toMatchObject({ notSubmitted: true }); expect(aipassSubmit).not.toHaveBeenCalled(); });
  it('does not claim a rejected task was never submitted', async () => { vi.mocked(aipassSubmit).mockRejectedValue(new AipassError('rejected', 'EMAIL_ACTIVE_TASK')); const data = await (await POST(request(payload))).json(); expect(data.code).toBe('EMAIL_ACTIVE_TASK'); expect(data.notSubmitted).toBeUndefined(); });
  it('keeps an uncertain response distinct from a definite rejection', async () => { vi.mocked(aipassSubmit).mockRejectedValue(new AipassError('unknown')); const response = await POST(request(payload)); expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ uncertain: true }); });
  it('returns receipt without declaring activation complete', async () => { vi.mocked(aipassSubmit).mockResolvedValue({ clientId: 'local:123', requestId: 'request-1' }); const data = await (await POST(request(payload))).json(); expect(data).toEqual({ clientId: 'local:123', requestId: 'request-1' }); });
  it('classifies explicit failure reasons without exposing provider messages', async () => {
    const task = { client_id: 'local:123', request_id: 'request-1', status: 'Failed' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: true, tasks: [
      { ...task, message: '密码错误 secret@example.com' },
      { ...task, message: '2FA code invalid' },
      { ...task, message: '登录：未找到身份验证器(Google Authenticator)选项' },
      { ...task, message: 'unknown error secret@example.com' },
      { ...task, status: 'Running', message: '密码错误' },
    ] })));
    try {
      const data = await (await POST(request({ action: 'history', cdkey: key }))).json();
      expect(data.tasks.map((item: { failureReason: string | null }) => item.failureReason)).toEqual(['credentials', 'twofa', 'authenticator_missing', null, null]);
      expect(JSON.stringify(data)).not.toContain('身份验证器');
      expect(JSON.stringify(data)).not.toContain('secret@example.com');
    } finally { vi.unstubAllGlobals(); }
  });
});
