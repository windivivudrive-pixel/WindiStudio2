import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { VoiceError, writer, paymentConfig } from '@/lib/voice/server';
import { GEMINI_PRICE, geminiProduct, type GeminiProduct } from './shared';

export const geminiOrderColumns = 'id,product_sku,duration_months,amount_vnd,status,payment_code,created_at,expires_at,paid_at';
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
    : message.includes('GEMINI_DISABLED') ? 'Sản phẩm chưa mở bán.' : message.includes('GEMINI_INVALID_PRODUCT') ? 'Sản phẩm Gemini không hợp lệ.' : null;
  return Response.json({ error: detail || (error instanceof VoiceError ? error.message : 'Chưa thể hoàn tất. Vui lòng thử lại sau.') }, {
    status: error instanceof VoiceError ? error.status : detail ? 409 : 503, headers: privateHeaders,
  });
}
export function selectedGeminiProduct(value: unknown) {
  try { return geminiProduct(value === undefined || value === null ? 'gemini-3m' : value); }
  catch { throw new VoiceError('Sản phẩm Gemini không hợp lệ.'); }
}
export async function geminiCatalog() {
  const result = await writer().rpc('windi_gemini_catalog');
  if (result.error) throw result.error;
  const products: GeminiProduct[] = (result.data || []).map(row => ({
    sku: row.sku, title: row.title, durationMonths: row.duration_months,
    price: row.price_vnd, enabled: row.enabled, stock: row.stock,
  }));
  const legacy = products.find(item => item.sku === 'gemini-3m');
  return { products, enabled: legacy?.enabled ?? false, price: legacy?.price ?? GEMINI_PRICE, stock: legacy?.stock ?? 0, bank: paymentConfig() };
}
