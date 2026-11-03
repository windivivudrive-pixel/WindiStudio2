'use client';
import { useState } from 'react';
import type { GeminiProduct } from '@/lib/gemini/shared';
import type { ProductDetails } from '@/lib/gemini/product-editor';
import styles from './gemini.module.css';
export function ShopProductEditor({ product, onSaved, onCancel, onBusyChange }: { product?: GeminiProduct; onSaved: (sku: string) => Promise<void>; onCancel?: () => void; onBusyChange?: (busy: boolean) => void }) {
  const [sku,setSku] = useState(product?.sku ?? '');
  const [details,setDetails] = useState<ProductDetails>({ title:product?.title ?? '', durationMonths:product?.durationMonths ?? 1, price:product?.priceConfirmed === false ? 0 : product?.price ?? 0, originalPrice:product?.priceConfirmed === false ? 0 : product?.originalPrice ?? 0, category:product?.category || 'AI & CÔNG VIỆC', description:product?.description ?? '', benefits:product?.benefits ?? [], warrantyStatus:product?.warrantyStatus ?? 'unspecified', warranty:product?.warranty ?? '', notes:product?.notes ?? '', thumbnail:product?.thumbnail ?? '', published:product?.published ?? false, deliveryMode:product?.deliveryMode ?? 'manual' });
  const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  const change = <K extends keyof ProductDetails>(key: K,value: ProductDetails[K]) => setDetails(current=>({...current,[key]:value}));
  async function upload(file?: File) {
    if (!file) return; setBusy(true);onBusyChange?.(true);setError('');
    try { const body=new FormData();body.append('file',file);const response=await fetch('/api/gemini/thumbnail',{method:'POST',body});const result=await response.json();if(!response.ok)throw new Error(result.error);change('thumbnail',result.url); }
    catch(reason){setError((reason as Error).message);}finally{setBusy(false);onBusyChange?.(false);}
  }
  async function save() {
    if(busy)return;setBusy(true);onBusyChange?.(true);setError('');
    try {const response=await fetch('/api/gemini/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:product?'save-product':'create',product:sku,details})});const result=await response.json();if(!response.ok)throw new Error(result.error || 'Chưa lưu được sản phẩm.');await onSaved(result.sku);}
    catch(reason){setError((reason as Error).message);}finally{setBusy(false);onBusyChange?.(false);}
  }
  return <form className={styles.adminForm} onSubmit={event=>{event.preventDefault();void save();}}>
    <h2>{product?'Thông tin sản phẩm':'Thêm sản phẩm mới'}</h2>
    <fieldset className={styles.editorFields} disabled={busy}>
      <label>Tên sản phẩm<input required maxLength={160} value={details.title} onChange={e=>change('title',e.target.value)} /></label>
      <label>Mã sản phẩm<input required pattern="[a-z0-9][a-z0-9-]{2,79}" maxLength={80} disabled={!!product} placeholder="vi-du: chatgpt-ready-1m" value={sku} onChange={e=>setSku(e.target.value)} /><small>Mã duy nhất, dùng chữ thường, số và dấu gạch ngang.</small></label>
      <div className={styles.editorGrid}><label>Danh mục<input required maxLength={100} value={details.category} onChange={e=>change('category',e.target.value)} /></label><label>Thời hạn (tháng)<input required type="number" min={1} max={120} step={1} disabled={!!product} value={details.durationMonths} onChange={e=>change('durationMonths',Number(e.target.value))} /></label></div>
      <div className={styles.editorGrid}><label>Giá gốc (VNĐ)<input required type="number" min={details.price || 1000} max={100000000} step={1} value={details.originalPrice || ''} onChange={e=>change('originalPrice',Number(e.target.value))} /></label><label>Giá bán (VNĐ)<input required type="number" min={1000} max={100000000} step={1} value={details.price || ''} onChange={e=>change('price',Number(e.target.value))} /></label></div>
      <label>Mô tả ngắn<textarea maxLength={4000} value={details.description} onChange={e=>change('description',e.target.value)} /></label>
      <label>Lợi ích (mỗi dòng một ý)<textarea maxLength={15000} value={details.benefits.join('\n')} onChange={e=>change('benefits',e.target.value.split('\n'))} placeholder="Các quyền lợi cụ thể khách nhận được" /></label>
      <label>Bảo hành<select value={details.warrantyStatus} onChange={e=>change('warrantyStatus',e.target.value as ProductDetails['warrantyStatus'])}><option value="unspecified">Chưa công bố</option><option value="included">Có bảo hành</option><option value="none">Không bảo hành</option></select></label>
      <label>Thời hạn và điều kiện bảo hành<textarea required={details.warrantyStatus==='included'} maxLength={4000} value={details.warranty} onChange={e=>change('warranty',e.target.value)} placeholder="Thời hạn, trường hợp được hỗ trợ, cách liên hệ…" /></label>
      <label>Lưu ý trước khi mua<textarea maxLength={8000} value={details.notes} onChange={e=>change('notes',e.target.value)} placeholder="Điều kiện sử dụng, thông tin cần chuẩn bị, giới hạn của gói…" /></label>
      <label>Thumbnail · đường dẫn ảnh<input type="text" maxLength={2000} value={details.thumbnail} onChange={e=>change('thumbnail',e.target.value)} placeholder="URL HTTPS hoặc /gemini-products/…" /></label>
      <label>Tải thumbnail lên (PNG, JPEG, WebP · tối đa 5 MB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void upload(e.target.files?.[0])} /></label>
      {details.thumbnail && <img className={styles.editorThumbnail} src={details.thumbnail} alt="Xem trước thumbnail sản phẩm" />}
      <label>Cách giao hàng<select disabled value={details.deliveryMode}><option value="manual">Admin bàn giao sau thanh toán</option><option value="link">Tự động cấp link từ kho</option></select><small>{product?'Cách giao hàng và thời hạn được cố định để giữ đúng đơn đã tạo.':'Sản phẩm mới được admin bàn giao sau thanh toán QR.'}</small></label>
      <label className={styles.accept}><input type="checkbox" checked={details.published} onChange={e=>change('published',e.target.checked)} /><span>Hiển thị trên cửa hàng (bỏ chọn để lưu nháp)</span></label>
    </fieldset>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.adminActions}><button className={styles.primary} disabled={busy} type="submit">{busy?'Đang lưu…':product?'Lưu thông tin sản phẩm':'Tạo sản phẩm'}</button>{onCancel && <button className={styles.secondary} disabled={busy} type="button" onClick={onCancel}>Hủy</button>}</div>
  </form>;
}
