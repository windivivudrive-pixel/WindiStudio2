import 'server-only';

import { timingSafeEqual } from 'node:crypto';
import { boundedBody, paymentConfig, VoiceError, writer } from '@/lib/voice/server';

function transactionTime(value: unknown) {
  if (typeof value !== 'string') return null;
  const vietnam = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  const parsed = Date.parse(vietnam ? `${vietnam[1]}-${vietnam[2]}-${vietnam[3]}T${vietnam[4]}:${vietnam[5]}:${vietnam[6]}+07:00` : value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function missingTransactionTimeArgument(error: unknown) {
  const detail = error as { code?: string; message?: string } | null;
  return detail?.code === 'PGRST202' && String(detail.message || '').includes('p_paid_at');
}

export function parseSepayPaymentCode(content: unknown) {
  const raw = String(content ?? '').toUpperCase();
  const matches = [
    ...[...raw.matchAll(/\bWINDI\s*([VK])\s*([A-Z0-9]{8})\b/g)].map((match) => ({ kind: match[1] === 'K' ? 'kit' as const : 'voice' as const, code: `WINDI ${match[1]}${match[2]}` })),
    ...[...raw.matchAll(/\bWINDI\s*([A-Z0-9]{8})\b/g)].map((match) => ({ kind: 'voice' as const, code: `WINDI ${match[1]}` })),
    ...[...raw.matchAll(/\bWST\s*([A-Z0-9]{8})\b/g)].map((match) => ({ kind: 'voice' as const, code: `WST ${match[1]}` })),
    ...[...raw.matchAll(/\bWV[A-F0-9]{16}\b/g)].map((match) => ({ kind: 'voice' as const, code: match[0] })),
  ];
  return matches.length === 1 ? matches[0] : null;
}

export async function processSepayWebhook(request: Request) {
  const expected = process.env.SEPAY_API_KEY || process.env.VITE_SEPAY_API_KEY;
  const config = paymentConfig();
  if (!expected || !config) throw new VoiceError('Payment unavailable', 503);
  const supplied = request.headers.get('authorization') || '';
  const left = Buffer.from(supplied);
  const right = Buffer.from(`Apikey ${expected}`);
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new VoiceError('Unauthorized', 401);

  const body = await (await boundedBody(request)).json() as Record<string, unknown>;
  if (body.transferType !== 'in' || String(body.accountNumber) !== config.account) return { success: true, status: 'ignored' };
  if (!Number.isSafeInteger(body.transferAmount) || Number(body.transferAmount) <= 0 || !body.id) throw new VoiceError('Invalid payment', 400);
  const reference = parseSepayPaymentCode(body.content);
  if (!reference) return { success: true, status: 'ignored' };

  const db = writer();
  if (reference.kind === 'kit') {
    const result = await db.rpc('windi_video_kit_pay', {
      p_code: reference.code,
      p_gateway: String(body.id),
      p_amount: Number(body.transferAmount),
      p_payload: body,
    });
    if (result.error) throw result.error;
    return { success: true, status: result.data };
  }

  const paidAt = transactionTime(body.transactionDate);
  let result = await db.rpc('windi_voice_pay', { p_code: reference.code, p_gateway: String(body.id), p_amount: Number(body.transferAmount), p_paid_at: paidAt });
  if (result.error && missingTransactionTimeArgument(result.error)) {
    result = await db.rpc('windi_voice_pay', { p_code: reference.code, p_gateway: String(body.id), p_amount: Number(body.transferAmount) });
  }
  if (result.data === 'ignored' && reference.code.includes(' ')) {
    let compact = await db.rpc('windi_voice_pay', { p_code: reference.code.replace(/\s+/g, ''), p_gateway: String(body.id), p_amount: Number(body.transferAmount), p_paid_at: paidAt });
    if (compact.error && missingTransactionTimeArgument(compact.error)) {
      compact = await db.rpc('windi_voice_pay', { p_code: reference.code.replace(/\s+/g, ''), p_gateway: String(body.id), p_amount: Number(body.transferAmount) });
    }
    if (!compact.error && compact.data && compact.data !== 'ignored') result = compact;
    else if (compact.error) result = compact;
  }
  if (result.error) throw result.error;
  return { success: true, status: result.data };
}
