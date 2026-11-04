import { validateProductDetails } from '@/lib/gemini/product-editor';
import { boundedBody, VoiceError, writer } from '@/lib/voice/server';
import { isManagedGemini, parseActivationLinks } from '@/lib/gemini/shared';
import { geminiCatalog, geminiFailure, privateHeaders, requireGeminiAdmin, selectedGeminiProduct } from '@/lib/gemini/server';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    await requireGeminiAdmin();
    const product = await selectedGeminiProduct(new URL(request.url).searchParams.get('product'));
    const db = writer();
    const [catalog, links, orders] = await Promise.all([
      geminiCatalog(),
      db.from('windi_gemini_links').select('id,product_sku,valid_until,disabled,created_at').eq('product_sku', product.sku).order('created_at', { ascending: false }).limit(100),
      db.from('windi_gemini_orders').select('delivery_mode,product_title,id,product_sku,duration_months,user_id,status,amount_vnd,payment_code,activation_id,created_at,paid_at').eq('product_sku', product.sku).order('created_at', { ascending: false }).limit(100),
    ]);
    if (links.error) throw links.error;
    if (orders.error) throw orders.error;
    const linkIds = (links.data || []).map(link => link.id);
    const reservations = linkIds.length ? await db.from('windi_gemini_orders').select('activation_id,status').eq('product_sku', product.sku).in('activation_id', linkIds) : { data: [], error: null };
    if (reservations.error) throw reservations.error;
    const reserved = new Map((reservations.data || []).map(order => [order.activation_id, order.status]));
    const inventory = (links.data || []).map(link => ({ ...link, allocation: reserved.get(link.id) ?? null }));
    const ids = [...new Set((orders.data || []).filter(order => order.status === 'PAID' && order.activation_id).map(order => order.activation_id as string))];
    const assigned = ids.length ? await db.from('windi_gemini_links').select('id,activation_url').eq('product_sku', product.sku).in('id', ids) : { data: [], error: null };
    if (assigned.error) throw assigned.error;
    const urls = new Map((assigned.data || []).map(link => [link.id, link.activation_url]));
    const orderRows = (orders.data || []).map(order => ({ ...order, activation_url: order.status === 'PAID' && order.activation_id ? urls.get(order.activation_id) ?? null : null }));
    return Response.json({ ...catalog, selectedProduct: product.sku, links: inventory, orders: orderRows }, { headers: privateHeaders });
  } catch (error) { return geminiFailure(error); }
}
export async function POST(request: Request) {
  try {
    await requireGeminiAdmin(request);
    const body = await (await boundedBody(request, 110000)).json().catch(() => { throw new VoiceError('Dữ liệu không hợp lệ.'); });
    if (body?.action === 'create' || body?.action === 'save-product') {
      if (typeof body.product !== 'string' || !/^[a-z0-9][a-z0-9-]{2,79}$/.test(body.product)) throw new VoiceError('Mã sản phẩm gồm 3–80 chữ thường, số và dấu gạch ngang.');
      let details;
      try { details = validateProductDetails(body.details); } catch (error) { throw new VoiceError((error as Error).message); }
      if (body.action === 'create' && details.deliveryMode !== 'manual') throw new VoiceError('Sản phẩm mới sử dụng hình thức admin bàn giao sau thanh toán.');
      const result = await writer().rpc('windi_shop_save_product', { p_sku: body.product, p_details: details, p_create: body.action === 'create' });
      if (result.error) {
        if (result.error.message.includes('SHOP_SKU_EXISTS')) throw new VoiceError('Mã sản phẩm đã tồn tại. Chọn mã khác.',409);
        throw result.error;
      }
      return Response.json({ sku: body.product }, { status: body.action === 'create' ? 201 : 200, headers: privateHeaders });
    }
    if (body?.action === 'archive-product' || body?.action === 'restore-product') {
      if (typeof body.product !== 'string' || !/^[a-z0-9][a-z0-9-]{2,79}$/.test(body.product)) throw new VoiceError('Mã sản phẩm không hợp lệ.');
      const result = await writer().rpc('windi_shop_archive_product', { p_sku: body.product, p_archive: body.action === 'archive-product' });
      if (result.error) throw result.error;
      return Response.json({ sku: body.product, archived: body.action === 'archive-product' }, { headers: privateHeaders });
    }
    const product = await selectedGeminiProduct(body?.product);
    const db = writer();
    if (body?.action === 'pricing') {
      const { price, originalPrice } = body;
      if (!Number.isSafeInteger(price) || price < 1000 || price > 100000000 || !Number.isSafeInteger(originalPrice) || originalPrice < price || originalPrice > 100000000) {
        throw new VoiceError('Giá bán phải là số nguyên từ 1.000 đến 100.000.000₫; giá gốc phải từ giá bán trở lên.');
      }
      const result = await db.rpc('windi_gemini_product_pricing', { p_sku: product.sku, p_price: price, p_original_price: originalPrice });
      if (result.error) throw result.error;
      return Response.json({ price, originalPrice }, { headers: privateHeaders });
    }
    if (body?.action === 'import') {
      if (!isManagedGemini(product.sku) && ('deliveryMode' in product && product.deliveryMode === 'manual')) throw new VoiceError('Gói nâng chính chủ được admin xử lý sau thanh toán.');
      let urls: string[];
      try { urls = parseActivationLinks(body.links, product.sku); } catch (error) { throw new VoiceError((error as Error).message); }
      const validUntil = isManagedGemini(product.sku) && !body.validUntil ? Date.parse('9999-12-31T00:00:00Z') : Date.parse(body.validUntil);
      if (!Number.isFinite(validUntil) || validUntil <= Date.now() + 600000) throw new VoiceError('Hạn sử dụng link phải cách hiện tại hơn 10 phút.');
      const result = await db.rpc('windi_gemini_import', { p_urls: urls, p_valid_until: new Date(validUntil).toISOString(), p_sku: product.sku });
      if (result.error) throw result.error;
      return Response.json({ added: result.data, skipped: urls.length - result.data }, { headers: privateHeaders });
    }
    if (body?.action === 'settings' && typeof body.enabled === 'boolean') {
      if (body.enabled && !isManagedGemini(product.sku) && !('deliveryMode' in product && product.deliveryMode === 'manual')) {
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
