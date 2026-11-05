import 'server-only';

import { readSepayWebhook, PaymentError } from '../../kits/qr-payment/src/sepay.js';
import { paymentConfig, VoiceError, writer } from '@/lib/voice/server';

function missingTransactionTimeArgument(error: unknown) {
  const detail = error as { code?: string; message?: string } | null;
  return detail?.code === 'PGRST202' && String(detail.message || '').includes('p_paid_at');
}

export function parseSepayPaymentCode(content: unknown) {
  const raw = String(content ?? '').toUpperCase();
  const matches = [
    ...[...raw.matchAll(/\bWINDI\s*([VKG])\s*([A-Z0-9]{8})\b/g)].map((match) => ({ kind: match[1] === 'G' ? 'gemini' as const : match[1] === 'K' ? 'kit' as const : 'voice' as const, code: `WINDI ${match[1]}${match[2]}` })),
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
  let transfer;
  try { transfer = await readSepayWebhook(request, { apiKey: expected, account: config.account }); }
  catch (error) {
    if (error instanceof PaymentError) throw new VoiceError(error.message, error.status);
    throw error;
  }
  if (!transfer) return { success: true, status: 'ignored' };
  const body = transfer.payload;
  const reference = parseSepayPaymentCode(body.content);
  if (!reference) return { success: true, status: 'ignored' };

  const db = writer();
  if (reference.kind === 'gemini') {
    const result = await db.rpc('windi_gemini_pay', {
      p_code: reference.code,
      p_gateway: String(body.id),
      p_amount: Number(body.transferAmount),
      p_paid_at: transfer.paidAt,
    });
    if (result.error) throw result.error;
    return { success: true, status: result.data };
  }
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

  const paidAt = transfer.paidAt;
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
