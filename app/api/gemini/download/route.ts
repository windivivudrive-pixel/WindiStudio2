import { VoiceError, writer } from '@/lib/voice/server';
import { isUUID } from '@/lib/voice/shared';
import { geminiIdentity, geminiFailure, privateHeaders } from '@/lib/gemini/server';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const user = await geminiIdentity();
    const id = new URL(request.url).searchParams.get('order');
    if (!isUUID(id)) throw new VoiceError('Mã đơn không hợp lệ.');
    const db = writer();
    const order = await db.from('windi_gemini_orders').select('activation_id').eq('id', id).eq('user_id', user!.id).eq('status', 'PAID').maybeSingle();
    if (order.error) throw order.error;
    if (!order.data?.activation_id) throw new VoiceError('File chỉ được mở cho đơn đã thanh toán của bạn.', 404);
    const link = await db.from('windi_gemini_links').select('activation_url').eq('id', order.data.activation_id).single();
    if (link.error) throw link.error;
    return new Response(`${link.data.activation_url}\n`, { headers: {
      ...privateHeaders, 'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="Gemini-3-thang-${id}.txt"`,
      'Referrer-Policy': 'no-referrer',
    } });
  } catch (error) { return geminiFailure(error); }
}
