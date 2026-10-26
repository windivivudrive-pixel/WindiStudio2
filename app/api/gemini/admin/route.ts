import { boundedBody, VoiceError, writer } from '@/lib/voice/server';
import { parseActivationLinks } from '@/lib/gemini/shared';
import { geminiCatalog, geminiFailure, privateHeaders, requireGeminiAdmin } from '@/lib/gemini/server';
export const runtime = 'nodejs';
export async function GET() {
  try {
    await requireGeminiAdmin();
    const db = writer();
    const [catalog, links, orders] = await Promise.all([
      geminiCatalog(),
      db.from('windi_gemini_links').select('id,valid_until,disabled,created_at').order('created_at', { ascending: false }).limit(100),
      db.from('windi_gemini_orders').select('id,user_id,status,amount_vnd,payment_code,activation_id,created_at,paid_at').order('created_at', { ascending: false }).limit(100),
    ]);
    if (links.error) throw links.error;
    if (orders.error) throw orders.error;
    return Response.json({ ...catalog, links: links.data, orders: orders.data }, { headers: privateHeaders });
  } catch (error) { return geminiFailure(error); }
}
export async function POST(request: Request) {
  try {
    await requireGeminiAdmin(request);
    const body = await (await boundedBody(request, 110000)).json().catch(() => { throw new VoiceError('Dữ liệu không hợp lệ.'); });
    const db = writer();
    if (body?.action === 'import') {
      let urls: string[];
      try { urls = parseActivationLinks(body.links); } catch (error) { throw new VoiceError((error as Error).message); }
      const validUntil = Date.parse(body.validUntil);
      if (!Number.isFinite(validUntil) || validUntil <= Date.now() + 600000) throw new VoiceError('Hạn sử dụng link phải cách hiện tại hơn 10 phút.');
      const result = await db.rpc('windi_gemini_import', { p_urls: urls, p_valid_until: new Date(validUntil).toISOString() });
      if (result.error) throw result.error;
      return Response.json({ added: result.data, skipped: urls.length - result.data }, { headers: privateHeaders });
    }
    if (body?.action === 'settings' && typeof body.enabled === 'boolean') {
      if (body.enabled) {
        const stock = await db.rpc('windi_gemini_stock');
        if (stock.error) throw stock.error;
        if (!stock.data) throw new VoiceError('Nhập link còn hạn trước khi mở bán.');
        if (!body.verifiedOffer) throw new VoiceError('Xác nhận bạn đã kiểm tra ưu đãi và điều kiện sử dụng của lô link.');
      }
      const result = await db.from('windi_gemini_settings').update({ enabled: body.enabled, updated_at: new Date().toISOString() }).eq('id', true);
      if (result.error) throw result.error;
      return Response.json({ enabled: body.enabled }, { headers: privateHeaders });
    }
    throw new VoiceError('Thao tác không hợp lệ.');
  } catch (error) { return geminiFailure(error); }
}
