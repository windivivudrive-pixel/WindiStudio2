import { aipassBalance, aipassSubmit, AipassError, type AipassPlan } from '@/lib/gemini/aipass';

export const maxDuration = 60;
const headers = { 'Cache-Control': 'no-store' };
const rejectionMessages: Record<string, string> = {
  CARD_DEPLETED: 'Mã đã hết lượt sử dụng.',
  CARD_REVOKED: 'Mã đã bị vô hiệu hóa. Vui lòng liên hệ hỗ trợ.',
  CARD_EXPIRED: 'Mã đã hết hạn. Vui lòng liên hệ hỗ trợ.',
  EMAIL_ACTIVE_TASK: 'Tài khoản này đã có yêu cầu đang xử lý.',
  INVALID_PARAMETER: 'AIPass từ chối thông tin được gửi. Vui lòng kiểm tra lại thông tin.',
  PLAN_MISMATCH: 'Gói không khớp với mã kích hoạt.',
  SERVICE_MAINTENANCE: 'AIPass đang bảo trì. Vui lòng thử lại sau.',
};
const respond = (body: object, status = 200) => Response.json(body, { status, headers });
const validKey = (s: unknown): s is string => typeof s === 'string' && /^(GEM6|GEM12|GEM24)-[A-Z0-9]{16,128}$/.test(s);
// Suppress messages that may contain account details or credentials.
function safeProviderMessage(message: unknown): string | null {
  if (typeof message !== 'string') return null;
  const text = message.trim();
  if (!text || text.length > 500 || /[\w.+-]+@[\w.-]+\.[a-z]{2,}|GEM(?:6|12|24)-[A-Z0-9]+|\b\d{8,}\b|\b[A-Z2-7]{16,}\b|(?:password|passwd|密码|twofa|2fa|secret|密钥|密码|backup\s*code)\s*[:：=]\s*\S+/i.test(text)) return null;
  return text;
}
function failureReason(message: unknown): 'credentials' | 'twofa' | null {
  if (typeof message !== 'string') return null;
  if (/(?:二次验证(?:码)?错误|验证码错误|验证代码错误|两步验证(?:码)?错误|2fa.{0,25}(?:incorrect|invalid|wrong|failed|错误|无效)|(?:incorrect|invalid|wrong).{0,20}(?:2fa|verification code|authenticator)|(?:mã|khóa).{0,20}(?:2fa|xác thực).{0,20}(?:sai|không đúng))/i.test(message)) return 'twofa';
  if (/(?:密码.{0,12}(?:错误|不正确|无效)|账号或密码错误|用户名或密码错误|(?:incorrect|wrong|invalid).{0,20}(?:password|credentials)|password.{0,20}(?:incorrect|wrong|invalid)|mật khẩu.{0,20}(?:sai|không đúng))/i.test(message)) return 'credentials';
  return null;
}

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin || !request.headers.get('content-type')?.startsWith('application/json')) return respond({ error: 'Yêu cầu không hợp lệ.' }, 403);
  if (Number(request.headers.get('content-length') || 0) > 16000) return respond({ error: 'Dữ liệu quá lớn.' }, 413);
  try {
    const input = await request.json();
    if (!input || !validKey(input.cdkey)) return respond({ error: 'Mã kích hoạt không đúng định dạng. Vui lòng kiểm tra lại.', notSubmitted: true }, 400);
    if (input.action === 'balance') return respond(await aipassBalance(input.cdkey));
    if (input.action === 'history') {
      const response = await fetch('https://aipass.plus/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cdkey: input.cdkey }), cache: 'no-store', signal: AbortSignal.timeout(15000) });
      const data = await response.json();
      if (!response.ok || data?.success !== true || !Array.isArray(data.tasks)) throw new AipassError('unknown');
      const tasks = data.tasks.slice(0, 100).filter((task: Record<string, unknown>) => typeof task.request_id === 'string' && typeof task.client_id === 'string' && ['Submitting', 'Pending', 'Running', 'Uncertain', 'Success', 'Failed', 'Cancelled'].includes(String(task.status))).map((task: Record<string, unknown>) => ({ requestId: task.request_id, clientId: task.client_id, status: task.status, expiry: typeof task.sub_expiry === 'string' ? task.sub_expiry : null, failureReason: task.status === 'Failed' ? failureReason(task.message) : null, providerMessage: task.status === 'Failed' ? safeProviderMessage(task.message) : null }));
      return respond({ tasks });
    }
    if (input.action === 'submit') {
      if (typeof input.requestId !== 'string' || typeof input.email !== 'string' || typeof input.password !== 'string' || typeof input.twofa !== 'string' || (input.recoveryEmail !== undefined && typeof input.recoveryEmail !== 'string')) return respond({ error: 'Vui lòng kiểm tra thông tin.', notSubmitted: true }, 400);
      const plan = ({ GEM6: 'sub6', GEM12: 'sub12', GEM24: 'sub24' } as Record<string, AipassPlan>)[input.cdkey.split('-')[0]];
      const result = await aipassSubmit({ cdkey: input.cdkey, requestId: input.requestId, email: input.email, password: input.password, twofa: input.twofa, recoveryEmail: input.recoveryEmail, plan });
      return respond(result);
    }
    return respond({ error: 'Yêu cầu không hợp lệ.' }, 400);
  } catch (error) {
    if (error instanceof AipassError && error.kind === 'invalid') return respond({ error: 'Vui lòng kiểm tra thông tin đã nhập.', notSubmitted: true }, 400);
    if (error instanceof AipassError && error.kind === 'rejected') return respond({ error: rejectionMessages[error.code || ''] || 'AIPass từ chối yêu cầu. Hãy kiểm tra mã và thông tin hoặc liên hệ hỗ trợ.', code: error.code }, 400);
    return respond({ error: 'Chưa xác định được kết quả. Hãy tra cứu trạng thái trước khi gửi lại.', uncertain: true }, 503);
  }
}
