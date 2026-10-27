import { boundedBody, VoiceError, writer } from '@/lib/voice/server';
import { parseActivationLinks } from '@/lib/gemini/shared';
import { geminiCatalog, geminiFailure, privateHeaders, requireGeminiAdmin, selectedGeminiProduct } from '@/lib/gemini/server';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    await requireGeminiAdmin();
    const product = selectedGeminiProduct(new URL(request.url).searchParams.get('product'));
    const db = writer();
    const [catalog, links, orders] = await Promise.all([
      geminiCatalog(),
      db.from('windi_gemini_links').select('id,product_sku,valid_until,disabled,created_at').eq('product_sku', product.sku).order('created_at', { ascending: false }).limit(100),
      db.from('windi_gemini_orders').select('id,product_sku,duration_months,user_id,status,amount_vnd,payment_code,activation_id,created_at,paid_at').eq('product_sku', product.sku).order('created_at', { ascending: false }).limit(100),
    ]);
    if (links.error) throw links.error;
    if (orders.error) throw orders.error;
    return Response.json({ ...catalog, selectedProduct: product.sku, links: links.data, orders: orders.data }, { headers: privateHeaders });
  } catch (error) { return geminiFailure(error); }
}
export async function POST(request: Request) {
  try {
    await requireGeminiAdmin(request);
    const body = await (await boundedBody(request, 110000)).json().catch(() => { throw new VoiceError('Dữ liệu không hợp lệ.'); });
    const product = selectedGeminiProduct(body?.product);
    const db = writer();
    if (body?.action === 'import') {
      let urls: string[];
      try { urls = parseActivationLinks(body.links, product.sku); } catch (error) { throw new VoiceError((error as Error).message); }
      const validUntil = Date.parse(body.validUntil);
      if (!Number.isFinite(validUntil) || validUntil <= Date.now() + 600000) throw new VoiceError('Hạn sử dụng link phải cách hiện tại hơn 10 phút.');
      const result = await db.rpc('windi_gemini_import', { p_urls: urls, p_valid_until: new Date(validUntil).toISOString(), p_sku: product.sku });
      if (result.error) throw result.error;
      return Response.json({ added: result.data, skipped: urls.length - result.data }, { headers: privateHeaders });
    }
    if (body?.action === 'settings' && typeof body.enabled === 'boolean') {
      if (body.enabled) {
        const stock = await db.rpc('windi_gemini_stock', { p_sku: product.sku });
        if (stock.error) throw stock.error;
        if (!stock.data) throw new VoiceError('Nhập link còn hạn trước khi mở bán.');
        if (!body.verifiedOffer) throw new VoiceError('Xác nhận bạn đã kiểm tra ưu đãi và điều kiện sử dụng của lô link.');
      }
      const result = await db.rpc('windi_gemini_product_settings', { p_sku: product.sku, p_enabled: body.enabled });
      if (result.error) throw result.error;
      return Response.json({ enabled: body.enabled }, { headers: privateHeaders });
    }
    throw new VoiceError('Thao tác không hợp lệ.');
  } catch (error) { return geminiFailure(error); }
}
