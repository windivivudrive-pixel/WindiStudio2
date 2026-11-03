export type ProductDetails = {
  title: string; durationMonths: number; price: number; originalPrice: number;
  category: string; description: string; benefits: string[];
  warrantyStatus: 'included' | 'none' | 'unspecified'; warranty: string; notes: string;
  thumbnail: string; published: boolean; deliveryMode: 'manual' | 'link';
};
export function validateProductDetails(value: unknown): ProductDetails {
  if (!value || typeof value !== 'object') throw new Error('Thông tin sản phẩm không hợp lệ.');
  const body = value as Record<string, unknown>;
  const text = (key: string, max: number, required = false) => {
    if (typeof body[key] !== 'string' || (body[key] as string).length > max) throw new Error(`Trường ${key} không hợp lệ.`);
    const result = (body[key] as string).trim();
    if (required && !result) throw new Error('Điền tên sản phẩm và danh mục.');
    return result;
  };
  if (!Number.isSafeInteger(body.price) || Number(body.price) < 1000 || Number(body.price) > 100000000 || !Number.isSafeInteger(body.originalPrice) || Number(body.originalPrice) < Number(body.price) || Number(body.originalPrice) > 100000000) throw new Error('Giá bán từ 1.000 đến 100.000.000₫; giá gốc không thấp hơn giá bán.');
  if (!Number.isSafeInteger(body.durationMonths) || Number(body.durationMonths) < 1 || Number(body.durationMonths) > 120) throw new Error('Thời hạn từ 1 đến 120 tháng.');
  if (!['included','none','unspecified'].includes(String(body.warrantyStatus)) || !['manual','link'].includes(String(body.deliveryMode)) || typeof body.published !== 'boolean') throw new Error('Chọn chính sách bảo hành và cách giao hàng hợp lệ.');
  if (!Array.isArray(body.benefits) || body.benefits.length > 30 || body.benefits.some(item => typeof item !== 'string' || item.length > 500)) throw new Error('Tối đa 30 lợi ích, mỗi dòng tối đa 500 ký tự.');
  const thumbnail = text('thumbnail', 2000);
  if (thumbnail && !/^\/gemini-products\/[a-zA-Z0-9._-]+\.(png|jpg|jpeg|webp)$/.test(thumbnail)) {
    let url: URL;
    try { url = new URL(thumbnail); } catch { throw new Error('Thumbnail phải là đường dẫn ảnh đã có hoặc URL HTTPS.'); }
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Thumbnail phải là URL HTTPS.');
  }
  const warranty = text('warranty', 4000);
  if (body.warrantyStatus === 'included' && !warranty) throw new Error('Điền thời hạn và điều kiện bảo hành.');
  if (body.published && !thumbnail) throw new Error('Thêm thumbnail trước khi hiển thị sản phẩm.');
  return { title: text('title',160,true), category: text('category',100,true), description: text('description',4000),
    notes: text('notes',8000), warranty, thumbnail, price: Number(body.price), originalPrice: Number(body.originalPrice), durationMonths: Number(body.durationMonths),
    warrantyStatus: body.warrantyStatus as ProductDetails['warrantyStatus'], deliveryMode: body.deliveryMode as ProductDetails['deliveryMode'], published: body.published,
    benefits: (body.benefits as string[]).map(item => item.trim()).filter(Boolean) };
}
