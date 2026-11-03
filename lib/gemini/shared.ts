export const GEMINI_PRODUCTS = [
  { sku: 'gemini-3m', title: 'Gemini 3 tháng', durationMonths: 3, price: 69000, originalPrice: 150000, termsVersion: 'gemini-3m-2026-10-26' },
  { sku: 'gemini-18m', title: 'Gemini 18 tháng', durationMonths: 18, price: 49000, originalPrice: 49000, termsVersion: 'gemini-18m-2026-10-27' },
  { sku: 'gemini-managed-6m', title: 'Nâng chính chủ 6 tháng', durationMonths: 6, price: 189000, originalPrice: 189000, termsVersion: 'gemini-managed-2026-11-03' },
  { sku: 'gemini-managed-12m', title: 'Nâng chính chủ 12 tháng', durationMonths: 12, price: 329000, originalPrice: 329000, termsVersion: 'gemini-managed-2026-11-03' },
  { sku: 'gemini-managed-24m', title: 'Nâng chính chủ 24 tháng', durationMonths: 24, price: 599000, originalPrice: 599000, termsVersion: 'gemini-managed-2026-11-03' },
] as const;
export type GeminiSku = string;
export const GEMINI_PRICE = GEMINI_PRODUCTS[0].price;
export const GEMINI_TERMS_VERSION = GEMINI_PRODUCTS[0].termsVersion;
export function geminiProduct(value: unknown = 'gemini-3m') {
  const product = GEMINI_PRODUCTS.find(item => item.sku === value);
  if (!product) throw new Error('Sản phẩm Gemini không hợp lệ.');
  return product;
}
export type GeminiProduct = { sku: GeminiSku; title: string; durationMonths: number; price: number; originalPrice: number; enabled: boolean; stock: number; description?: string; category?: string; benefits?: string[]; warrantyStatus?: 'included' | 'none' | 'unspecified'; warranty?: string; notes?: string; thumbnail?: string; published?: boolean; deliveryMode?: 'manual' | 'link'; termsVersion?: string; priceConfirmed?: boolean };
export type GeminiOrder = { id: string; product_sku: GeminiSku; duration_months: number; amount_vnd: number; status: string; payment_code: string; created_at: string; expires_at: string; paid_at: string | null; activation_url?: string | null; delivery_mode?: 'manual' | 'link'; product_title?: string };
export type GeminiAccount = {
  authenticated: boolean; enabled: boolean; stock: number; price: number; products: GeminiProduct[];
  bank: { bank: string; account: string; name: string } | null;
  orders: GeminiOrder[];
};
export function parseActivationLinks(value: unknown, sku: GeminiSku = 'gemini-3m'): string[] {
  if (typeof value !== 'string' || value.length > 100000) throw new Error('Nhập tối đa 500 link, mỗi dòng một link.');
  const links = [...new Set(value.split(/\r?\n/).map(line => line.trim()).filter(Boolean))];
  const regex = sku === 'gemini-18m'
    ? /^https:\/\/serviceactivation\.link\/subscription\/new\/[A-Za-z0-9_-]{16,512}={0,2}$/
    : /^https:\/\/one\.google\.com\/offer\/[A-Za-z0-9_-]{8,128}$/;
  if (!links.length || links.length > 500 || links.some(url => !regex.test(url))) {
    const example = sku === 'gemini-18m'
      ? 'https://serviceactivation.link/subscription/new/…'
      : 'https://one.google.com/offer/…';
    throw new Error(`Chỉ nhận link ${example} hợp lệ, tối đa 500 link mỗi lần.`);
  }
  return links;
}
export function geminiSteps(product: { sku: GeminiSku; durationMonths: number; price: number }) { return [
  { title: 'Quét QR, nhận link', text: `Thanh toán ${product.price.toLocaleString('vi-VN')}₫ bằng ứng dụng ngân hàng. Khi hệ thống xác nhận tiền, link kích hoạt ${product.durationMonths} tháng sẽ hiện trong đơn hàng.` },
  { title: 'Copy link, dán vào trình duyệt', text: 'Sao chép link và dán vào thanh địa chỉ Chrome hoặc trình duyệt bạn đang dùng. Đăng nhập đúng Google cá nhân muốn nâng cấp.' },
  { title: 'Bấm kích hoạt gói', text: `Kiểm tra Google hiển thị đúng ưu đãi ${product.durationMonths} tháng và tài khoản đủ điều kiện, rồi bấm nhận ưu đãi / kích hoạt theo hướng dẫn trên màn hình.` },
  product.sku === 'gemini-18m'
    ? { title: 'Kiểm tra điều kiện ưu đãi', text: 'Gói 18 tháng không yêu cầu thêm thẻ thanh toán hoặc ví điện tử. Kiểm tra tài khoản Google hiển thị đúng ưu đãi 18 tháng trước khi tiếp tục.' }
    : { title: 'Thêm phương thức thanh toán', text: 'Thêm thẻ hoặc ví MoMo vào phương thức thanh toán theo lựa chọn Google hiển thị.' },
  { title: 'Xác nhận 0₫ và bắt đầu sử dụng', text: 'Chỉ xác nhận khi màn hình Google hiển thị 0₫ cho thời gian ưu đãi. Nếu hiện số tiền khác, dừng lại và liên hệ hỗ trợ. Sau khi kích hoạt thành công, bạn có thể hủy gia hạn; gói tiếp tục đến hết thời hạn hiển thị trong tài khoản Google.' },
]; }

export const isManagedGemini = (sku: string) => ['gemini-managed-6m', 'gemini-managed-12m', 'gemini-managed-24m'].includes(sku);
