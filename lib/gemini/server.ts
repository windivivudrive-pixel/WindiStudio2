import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { VoiceError, writer, paymentConfig } from '@/lib/voice/server';
import { GEMINI_PRICE, geminiProduct, type GeminiProduct } from './shared';

export const geminiOrderColumns = 'delivery_mode,product_title,id,product_sku,duration_months,amount_vnd,status,payment_code,created_at,expires_at,paid_at';
export const privateHeaders = { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff' };
export async function geminiIdentity(request?: Request, optional = false) {
  if (request && request.method !== 'GET') {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) throw new VoiceError('Yêu cầu không hợp lệ.', 403);
  }
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) {
    if (optional) return null;
    throw new VoiceError('Đăng nhập để mua và nhận link kích hoạt.', 401);
  }
  return user;
}
export async function requireGeminiAdmin(request?: Request) {
  const user = await geminiIdentity(request);
  const { data, error } = await writer().from('windi_voice_admins').select('user_id').eq('user_id', user!.id).maybeSingle();
  if (error) throw error;
  if (!data) throw new VoiceError('Chỉ quản trị viên WindiStudio được truy cập kho link.', 403);
  return user!;
}
export function geminiFailure(error: unknown) {
  const message = String((error as { message?: string })?.message || '');
  const detail = message.includes('GEMINI_OUT_OF_STOCK') ? 'Link vừa hết hàng. Vui lòng quay lại sau.'
    : message.includes('SHOP_NOT_READY') ? 'Hoàn thiện giá và bật hiển thị sản phẩm trước khi mở bán.' : message.includes('GEMINI_DISABLED') ? 'Sản phẩm đã hết hàng.' : message.includes('GEMINI_INVALID_PRODUCT') ? 'Sản phẩm Gemini không hợp lệ.' : null;
  return Response.json({ error: detail || (error instanceof VoiceError ? error.message : 'Chưa thể hoàn tất. Vui lòng thử lại sau.') }, {
    status: error instanceof VoiceError ? error.status : detail ? 409 : 503, headers: privateHeaders,
  });
}
export async function selectedGeminiProduct(value: unknown) {
  try { return geminiProduct(value === undefined || value === null ? 'gemini-3m' : value); }
  catch {
    if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{2,79}$/.test(value)) throw new VoiceError('Sản phẩm không hợp lệ.');
    const result = await writer().from('windi_gemini_products').select('*').eq('sku', value).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) throw new VoiceError('Sản phẩm không hợp lệ.');
    return { sku: result.data.sku, title: result.data.title, durationMonths: result.data.duration_months, deliveryMode: result.data.delivery_mode, termsVersion: result.data.terms_version };
  }
}
export async function geminiCatalog() {
  const [result, originalPrices] = await Promise.all([
    writer().rpc('windi_gemini_catalog'),
    writer().from('windi_gemini_products').select('*'),
  ]);
  if (result.error) throw result.error;
  if (originalPrices.error) throw originalPrices.error;
  const originalPriceBySku = new Map((originalPrices.data || []).map(row => [row.sku, row]));
  const products: GeminiProduct[] = (result.data || []).map(row => ({
    sku: row.sku, title: row.title, durationMonths: row.duration_months,
    price: row.price_vnd, originalPrice: originalPriceBySku.get(row.sku)?.original_price_vnd ?? row.price_vnd,
    description: originalPriceBySku.get(row.sku)?.description ?? '', category: originalPriceBySku.get(row.sku)?.category ?? '',
    benefits: originalPriceBySku.get(row.sku)?.benefits ?? [], warrantyStatus: originalPriceBySku.get(row.sku)?.warranty_status ?? 'unspecified',
    warranty: originalPriceBySku.get(row.sku)?.warranty ?? '', notes: originalPriceBySku.get(row.sku)?.notes ?? '',
    thumbnail: originalPriceBySku.get(row.sku)?.thumbnail ?? '', published: originalPriceBySku.get(row.sku)?.published ?? true,
    deliveryMode: originalPriceBySku.get(row.sku)?.delivery_mode ?? 'link', termsVersion: originalPriceBySku.get(row.sku)?.terms_version ?? 'shop-v1',
    priceConfirmed: originalPriceBySku.get(row.sku)?.price_confirmed ?? true, archivedAt: originalPriceBySku.get(row.sku)?.archived_at ?? null, enabled: row.enabled, stock: row.stock,
  }));
  const legacy = products.find(item => item.sku === 'gemini-3m');
  return { products, enabled: legacy?.enabled ?? false, price: legacy?.price ?? GEMINI_PRICE, stock: legacy?.stock ?? 0, bank: paymentConfig() };
}
