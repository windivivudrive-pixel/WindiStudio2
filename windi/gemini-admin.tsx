'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, PackagePlus, RefreshCw } from 'lucide-react';
import { GEMINI_PRODUCTS, geminiProduct, type GeminiAccount, type GeminiOrder, type GeminiSku } from '@/lib/gemini/shared';
import styles from './gemini.module.css';
type AdminData = Omit<GeminiAccount, 'orders'> & {
  selectedProduct: GeminiSku;
  links: { id: string; product_sku: GeminiSku; valid_until: string; disabled: boolean; created_at: string }[];
  orders: (GeminiOrder & { user_id: string; activation_id: string | null })[];
};
export function GeminiAdmin() {
  const [data, setData] = useState<AdminData | null>(null);
  const [selectedSku, setSelectedSku] = useState<GeminiSku>('gemini-3m');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [links, setLinks] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const sequence = useRef(0);
  const product = geminiProduct(selectedSku);
  const active = data?.products.find(item => item.sku === selectedSku);
  const load = useCallback(async (sku: GeminiSku, signal?: AbortSignal) => {
    const version = ++sequence.current;
    const response = await fetch(`/api/gemini/admin?product=${encodeURIComponent(sku)}`, { cache: 'no-store', signal });
    const body = await response.json();
    if (!response.ok) throw new Error(response.status === 401 ? 'Đăng nhập bằng tài khoản quản trị WindiStudio để quản lý kho link.' : body.error || 'Chưa tải được kho link.');
    if (version === sequence.current) setData(body);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setVerified(false); setLinks(''); setValidUntil(''); setError(''); setNotice('');
    void load(selectedSku, controller.signal).catch(reason => { if (!controller.signal.aborted) setError(reason.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [load, selectedSku]);
  async function mutate(body: Record<string, unknown>) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/gemini/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, product: selectedSku }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Chưa lưu được thay đổi.');
      if (body.action === 'import') { setLinks(''); setNotice(`${product.title}: đã nhập ${result.added} link mới, bỏ qua ${result.skipped} link đã có trong kho.`); }
      else setNotice(body.enabled ? `Đã mở bán ${product.title}.` : `Đã tắt tạo đơn mới cho ${product.title}. Đơn đã tạo vẫn được xử lý thanh toán.`);
      await load(selectedSku);
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }
  const refreshing = loading || data?.selectedProduct !== selectedSku;
  return <main className={`${styles.page} ${styles.admin}`}>
    <Link href="/gemini" className={styles.secondary}><ArrowLeft size={16} aria-hidden="true" /> Trang bán Gemini</Link>
    <h1>Kho link Gemini</h1><p>Chọn đúng sản phẩm trước khi nhập link. Hai gói có kho riêng, giá riêng và công tắc mở bán riêng.</p>
    {error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.notice} role="status">{notice}</p>}
    {data && <fieldset className={styles.planPicker} disabled={busy} style={{ marginTop: 25 }}><legend>Sản phẩm đang quản lý</legend>{GEMINI_PRODUCTS.map(item => <label key={item.sku} className={`${styles.planChoice} ${selectedSku === item.sku ? styles.planSelected : ''}`}><input type="radio" name="admin-gemini-product" value={item.sku} checked={selectedSku === item.sku} onChange={() => setSelectedSku(item.sku)} /><span><strong>{item.title}</strong><small>{item.price.toLocaleString('vi-VN')}₫ / link</small></span></label>)}</fieldset>}
    {!data ? loading ? <p role="status">Đang xác minh quyền quản trị…</p> : <><Link href="/login?next=%2Fgemini%2Fadmin" className={styles.primary}>Đăng nhập quản trị</Link><button className={styles.secondary} onClick={() => void load(selectedSku).catch(reason => setError(reason.message))}>Thử lại</button></> : <>
      {refreshing && <p role="status">Đang tải kho {product.title}…</p>}
      <div className={styles.adminStats}><div><strong>{active?.stock ?? 0}</strong><span>Link {product.durationMonths} tháng sẵn sàng bán</span></div><div><strong>{active?.enabled ? 'Đang mở' : 'Đang tắt'}</strong><span>Trạng thái {product.title}</span></div><div><strong>{data.bank ? 'Đã kết nối' : 'Chưa cấu hình'}</strong><span>Thanh toán QR</span></div></div>
      <form className={styles.adminForm} onSubmit={event => { event.preventDefault(); void mutate({ action: 'import', links, validUntil: validUntil ? new Date(validUntil).toISOString() : null }); }}>
        <h2>Nhập link {product.durationMonths} tháng</h2><p>Mỗi dòng một link {product.sku === 'gemini-18m' ? 'https://serviceactivation.link/subscription/new/…' : 'https://one.google.com/offer/…'} chưa dùng, đúng gói {product.durationMonths} tháng. Tối đa 500 link/lần. Link trùng sẽ được bỏ qua ở cả hai kho, kể cả đã giao.</p>
        <label>Danh sách link {product.title}<textarea required disabled={busy || refreshing} value={links} onChange={event => setLinks(event.target.value)} placeholder={product.sku === 'gemini-18m' ? 'Mỗi dòng một link https://serviceactivation.link/subscription/new/…' : 'Mỗi dòng một link kích hoạt Google One'} spellCheck={false} autoComplete="off" /></label>
        <label>Hạn kích hoạt của lô link (giờ trên thiết bị của bạn)<input required disabled={busy || refreshing} type="datetime-local" value={validUntil} onChange={event => setValidUntil(event.target.value)} /></label><p>Đây là hạn dùng của link, không phải ngày kết thúc gói {product.durationMonths} tháng của khách.</p>
        <button type="submit" disabled={busy || refreshing || !links.trim() || !validUntil} className={styles.primary}><PackagePlus size={18} aria-hidden="true" />{busy ? 'Đang nhập…' : `Nhập vào kho ${product.durationMonths} tháng`}</button>
      </form>
      <section className={styles.adminForm}><h2>Mở bán {product.title}</h2><p>Giá {product.price.toLocaleString('vi-VN')}₫ / link. Kiểm tra đúng ưu đãi {product.durationMonths} tháng, hạn dùng, điều kiện tài khoản và giá 0₫ trên Google. Link đã dùng để kiểm tra không được nhập kho.</p>
        <label className={styles.accept}><input type="checkbox" checked={verified} disabled={busy || refreshing} onChange={event => setVerified(event.target.checked)} /><span>Tôi đã xác minh ưu đãi {product.durationMonths} tháng và có quyền phân phối lô link này.</span></label>
        <div className={styles.adminActions}><button className={styles.primary} disabled={busy || refreshing || active?.enabled || !verified || !active?.stock || !data.bank} onClick={() => void mutate({ action: 'settings', enabled: true, verifiedOffer: verified })}>Mở bán {product.price.toLocaleString('vi-VN')}₫</button><button className={styles.secondary} disabled={busy || refreshing || !active?.enabled} onClick={() => void mutate({ action: 'settings', enabled: false })}>Tắt gói {product.durationMonths} tháng</button></div>
      </section>
      <button className={styles.secondary} disabled={busy || loading} onClick={() => void load(selectedSku).catch(reason => setError(reason.message))}><RefreshCw size={16} aria-hidden="true" /> Cập nhật kho và đơn</button>
      {!refreshing && <><div className={styles.tableWrap}><table><caption>100 đơn {product.durationMonths} tháng gần nhất</caption><thead><tr><th>Mã thanh toán</th><th>Trạng thái</th><th>Giá</th><th>Tạo lúc</th><th>Mã người mua</th></tr></thead><tbody>{data.orders.map(order => <tr key={order.id}><td>{order.payment_code}</td><td>{order.status}</td><td>{order.amount_vnd.toLocaleString('vi-VN')}₫</td><td>{new Date(order.created_at).toLocaleString('vi-VN')}</td><td>{order.user_id}</td></tr>)}{!data.orders.length && <tr><td colSpan={5}>Chưa có đơn hàng.</td></tr>}</tbody></table></div>
      <div className={styles.tableWrap}><table><caption>100 link {product.durationMonths} tháng nhập gần nhất</caption><thead><tr><th>Mã kho</th><th>Hạn kích hoạt</th><th>Trạng thái</th></tr></thead><tbody>{data.links.map(link => <tr key={link.id}><td>{link.id.slice(0, 8)}</td><td>{new Date(link.valid_until).toLocaleString('vi-VN')}</td><td>{link.disabled ? 'Đã khóa' : Date.parse(link.valid_until) <= Date.now() ? 'Hết hạn' : 'Còn hạn (có thể đã được giữ/giao)'}</td></tr>)}{!data.links.length && <tr><td colSpan={3}>Kho chưa có link.</td></tr>}</tbody></table></div></>}
    </>}
  </main>;
}
