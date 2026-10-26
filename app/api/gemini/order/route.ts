import { boundedBody, paymentConfig, VoiceError, writer } from '@/lib/voice/server';
import { GEMINI_TERMS_VERSION } from '@/lib/gemini/shared';
import { geminiIdentity, geminiFailure, geminiOrderColumns, privateHeaders } from '@/lib/gemini/server';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const user = await geminiIdentity(request);
    const body = await (await boundedBody(request, 2000)).json().catch(() => { throw new VoiceError('Dữ liệu không hợp lệ.'); });
    if (body?.termsVersion !== GEMINI_TERMS_VERSION) throw new VoiceError('Vui lòng xác nhận điều kiện kích hoạt trước khi mua.');
    if (!paymentConfig()) throw new VoiceError('Thanh toán chưa được cấu hình.', 503);
    const db = writer();
    const result = await db.rpc('windi_gemini_order', { p_user: user!.id });
    if (result.error) throw result.error;
    // Explicitly exclude reserved inventory IDs and activation links from checkout responses.
    const order = await db.from('windi_gemini_orders').select(geminiOrderColumns).eq('id', result.data.id).eq('user_id', user!.id).single();
    if (order.error) throw order.error;
    return Response.json({ order: order.data }, { status: 201, headers: privateHeaders });
  } catch (error) { return geminiFailure(error); }
}
