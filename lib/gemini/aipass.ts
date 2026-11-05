// Server-side integration with AIPass. Never log inputs, raw responses or exceptions
// containing account details; a timeout is an unknown outcome, not a failed task.
export type AipassPlan = 'sub6' | 'sub12' | 'sub24';
export type AipassTaskStatus = 'Submitting' | 'Pending' | 'Running' | 'Uncertain' | 'Success' | 'Failed' | 'Cancelled';
export class AipassError extends Error {
  constructor(public kind: 'invalid' | 'rejected' | 'unknown', public code?: string) { super('AIPass request could not be completed'); }
}
type SubmitInput = { cdkey: string; requestId: string; email: string; password: string; twofa: string; recoveryEmail?: string; plan: AipassPlan };
type AipassResponse = Record<string, any>;
const endpoint = 'https://aipass.plus/api/openapi';
function checkKey(key: string, plan?: AipassPlan) {
  const match = /^(GEM6|GEM12|GEM24)-[A-Z0-9]{16,128}$/.exec(key);
  const expected = match && ({ GEM6: 'sub6', GEM12: 'sub12', GEM24: 'sub24' } as const)[match[1] as 'GEM6' | 'GEM12' | 'GEM24'];
  if (!match || (plan && expected !== plan)) throw new AipassError('invalid');
}
async function call(payload: Record<string, string>, fetcher: typeof fetch = fetch): Promise<AipassResponse> {
  let response: Response;
  try { response = await fetcher(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), cache: 'no-store', signal: AbortSignal.timeout(90000) }); }
  catch { throw new AipassError('unknown'); }
  let data: AipassResponse;
  try { data = await response.json(); } catch { throw new AipassError('unknown'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new AipassError('unknown');
  if (data.submission_uncertain === true || data.association_pending === true || response.status >= 500 || response.status === 429) throw new AipassError('unknown');
  if (!response.ok || data.success !== true) throw new AipassError('rejected', typeof data.code === 'string' && /^[A-Z_]{1,80}$/.test(data.code) ? data.code : undefined);
  return data;
}
export async function aipassBalance(cdkey: string, fetcher?: typeof fetch) {
  checkKey(cdkey);
  const r = await call({ action: 'get_balance', cdkey }, fetcher);
  if (!Number.isInteger(r.remaining_uses) || r.remaining_uses < 0 || !['sub6', 'sub12', 'sub24'].includes(r.plan_type)) throw new AipassError('unknown');
  return { remainingUses: r.remaining_uses as number, plan: r.plan_type as AipassPlan, cardStatus: typeof r.card_status === 'string' ? r.card_status : undefined };
}
export async function aipassSubmit(input: SubmitInput, fetcher?: typeof fetch) {
  checkKey(input.cdkey, input.plan);
  if (!/^[A-Za-z0-9:_-]{1,128}$/.test(input.requestId) || !input.email || input.email.length > 320 || !input.password || input.password.length > 4096 || !input.twofa || input.twofa.length > 4096 || (input.recoveryEmail?.length || 0) > 320) throw new AipassError('invalid');
  const body: Record<string, string> = { action: 'submit_task', cdkey: input.cdkey, request_id: input.requestId, email: input.email, password: input.password, twofa: input.twofa, task_type: input.plan };
  if (input.recoveryEmail) body.recovery_email = input.recoveryEmail;
  const r = await call(body, fetcher);
  if (typeof r.client_id !== 'string' || !r.client_id.startsWith('local:') || r.request_id !== input.requestId) throw new AipassError('unknown');
  return { clientId: r.client_id as string, requestId: input.requestId };
}
export async function aipassStatus(cdkey: string, clientId: string, fetcher?: typeof fetch) {
  checkKey(cdkey);
  if (!/^local:[A-Za-z0-9-]{1,100}$/.test(clientId)) throw new AipassError('invalid');
  const r = await call({ action: 'get_status', cdkey, client_id: clientId }, fetcher);
  if (r.data?.client_id !== clientId || !['Submitting', 'Pending', 'Running', 'Uncertain', 'Success', 'Failed', 'Cancelled'].includes(r.data?.status)) throw new AipassError('unknown');
  return { status: r.data.status as AipassTaskStatus, expiry: typeof r.data.sub_expiry === 'string' ? r.data.sub_expiry : null };
}
