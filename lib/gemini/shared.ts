export const GEMINI_PRODUCTS = [
  { sku: 'gemini-3m', title: 'Gemini 3 tháng', durationMonths: 3, price: 150000, termsVersion: 'gemini-3m-2026-10-26' },
  { sku: 'gemini-18m', title: 'Gemini 18 tháng', durationMonths: 18, price: 49000, termsVersion: 'gemini-18m-2026-10-27' },
] as const;
export type GeminiSku = typeof GEMINI_PRODUCTS[number]['sku'];
export const GEMINI_PRICE = GEMINI_PRODUCTS[0].price;
export const GEMINI_TERMS_VERSION = GEMINI_PRODUCTS[0].termsVersion;
export function geminiProduct(value: unknown = 'gemini-3m') {
  const product = GEMINI_PRODUCTS.find(item => item.sku === value);
  if (!product) throw new Error('Sản phẩm Gemini không hợp lệ.');
  return product;
}
export type GeminiProduct = { sku: GeminiSku; title: string; durationMonths: number; price: number; enabled: boolean; stock: number };
export type GeminiOrder = { id: string; product_sku: GeminiSku; duration_months: number; amount_vnd: number; status: string; payment_code: string; created_at: string; expires_at: string; paid_at: string | null };
export type GeminiAccount = {
  authenticated: boolean; enabled: boolean; stock: number; price: number; products: GeminiProduct[];
  bank: { bank: string; account: string; name: string } | null;
  orders: GeminiOrder[];
};
export function parseActivationLinks(value: unknown): string[] {
  if (typeof value !== 'string' || value.length > 100000) throw new Error('Nhập tối đa 500 link, mỗi dòng một link.');
  const links = [...new Set(value.split(/\r?\n/).map(line => line.trim()).filter(Boolean))];
  if (!links.length || links.length > 500 || links.some(url => !/^https:\/\/one\.google\.com\/offer\/[A-Za-z0-9_-]{8,128}$/.test(url))) {
    throw new Error('Chỉ nhận link https://one.google.com/offer/… hợp lệ, tối đa 500 link mỗi lần.');
  }
  return links;
}
export function geminiSteps(product: typeof GEMINI_PRODUCTS[number]) { return [
  { title: 'Quét QR, nhận file TXT', text: `Thanh toán ${product.price.toLocaleString('vi-VN')}₫ bằng ứng dụng ngân hàng. Khi hệ thống xác nhận tiền, tải file TXT chứa link kích hoạt ${product.durationMonths} tháng của đơn hàng.` },
  { title: 'Copy link, dán vào trình duyệt', text: 'Mở file TXT, sao chép toàn bộ link và dán vào thanh địa chỉ Chrome hoặc trình duyệt bạn đang dùng. Đăng nhập đúng Google cá nhân muốn nâng cấp.' },
  { title: 'Bấm kích hoạt gói', text: `Kiểm tra Google hiển thị đúng ưu đãi ${product.durationMonths} tháng và tài khoản đủ điều kiện, rồi bấm nhận ưu đãi / kích hoạt theo hướng dẫn trên màn hình.` },
  { title: 'Thêm phương thức thanh toán', text: 'Dùng thẻ thanh toán quốc tế hoặc ví MoMo (nếu Google hiển thị), chuẩn bị số dư tối thiểu 30.000₫ để xác minh. Khoản tạm giữ/thu xác minh sẽ được giải tỏa hoặc hoàn lại; thời gian tiền về tùy ngân hàng/ví và quy trình của Google.' },
  { title: 'Xác nhận 0₫ và bắt đầu sử dụng', text: 'Chỉ xác nhận khi màn hình Google hiển thị 0₫ cho thời gian ưu đãi. Nếu hiện số tiền khác, dừng lại và liên hệ hỗ trợ. Kiểm tra ngày gia hạn, hủy trước ngày đó nếu không muốn bị tính phí tiếp.' },
]; }
