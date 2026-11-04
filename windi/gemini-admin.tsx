'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, PackagePlus, RefreshCw } from 'lucide-react';
import { isManagedGemini, geminiProduct, type GeminiAccount, type GeminiOrder, type GeminiSku } from '@/lib/gemini/shared';
import styles from './gemini.module.css';
import { ShopProductEditor } from './shop-product-editor';
type AdminData = Omit<GeminiAccount, 'orders'> & {
  selectedProduct: GeminiSku;
  links: { id: string; product_sku: GeminiSku; valid_until: string; disabled: boolean; created_at: string; allocation: string | null }[];
  orders: (GeminiOrder & { user_id: string; activation_id: string | null; activation_url: string | null })[];
};
export function GeminiAdmin() {
  const [data, setData] = useState<AdminData | null>(null);
  const [selectedSku, setSelectedSku] = useState<GeminiSku>('gemini-3m');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [links, setLinks] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editorRevision, setEditorRevision] = useState(0);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const sequence = useRef(0);
  const active = data?.products.find(item => item.sku === selectedSku);
  const product = active ?? geminiProduct('gemini-3m');
  const codeStock = isManagedGemini(selectedSku);
  const managed = active?.deliveryMode === 'manual' || codeStock;
  const load = useCallback(async (sku: GeminiSku, signal?: AbortSignal) => {
    const version = ++sequence.current;
    const response = await fetch(`/api/gemini/admin?product=${encodeURIComponent(sku)}`, { cache: 'no-store', signal });
    const body = await response.json();
    if (!response.ok) throw new Error(response.status === 401 ? 'Đăng nhập bằng tài khoản quản trị WindiStudio để quản lý kho link.' : body.error || 'Chưa tải được kho link.');
    if (version === sequence.current) {
      setData(body);

    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setVerified(false); setLinks(''); setValidUntil(''); setError(''); setNotice('');
    void load(selectedSku, controller.signal).catch(reason => { if (!controller.signal.aborted) setError(reason.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [load, selectedSku]);
  async function mutate(body: Record<string, unknown>) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/gemini/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, product: selectedSku }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Chưa lưu được thay đổi.');
      if (body.action === 'import') { setLinks(''); setNotice(`${product.title}: đã nhập ${result.added} ${codeStock ? 'mã' : 'link'} mới, bỏ qua ${result.skipped} đã có trong kho.`); }
      else if (body.action === 'pricing') setNotice('Đã lưu giá mới. Đơn mới dùng giá này; QR đã tạo giữ nguyên số tiền của đơn.');
      else setNotice(body.enabled ? `Đã mở bán ${product.title}.` : `Đã tắt tạo đơn mới cho ${product.title}. ${managed && !codeStock ? 'QR đang chờ của gói này đã hết hiệu lực; giao dịch đến sau cần đối soát.' : 'Đơn đã tạo vẫn được xử lý thanh toán.'}`);
      await load(selectedSku);
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }
  async function archiveProduct(sku: string, title: string, restore: boolean) {
    if (busy) return;
    if (!restore && !window.confirm(`Xóa “${title}” khỏi cửa hàng và danh sách sản phẩm? Đơn cũ vẫn được giữ và bạn có thể khôi phục sản phẩm.`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/gemini/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: restore ? 'restore-product' : 'archive-product', product: sku }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Chưa thể cập nhật sản phẩm.');
      const nextSku = !restore && sku === selectedSku ? data?.products.find(item => item.sku !== sku && !item.archivedAt)?.sku ?? sku : selectedSku;
      if (nextSku !== selectedSku) setSelectedSku(nextSku);
      await load(nextSku);
      setNotice(restore ? `Đã khôi phục ${title} dưới dạng nháp, chưa mở bán.` : `Đã xóa ${title}. Bạn có thể khôi phục trong mục sản phẩm đã xóa.`);
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }
  const refreshing = loading || data?.selectedProduct !== selectedSku;
  return <main className={`${styles.page} ${styles.admin}`}>
    <Link href="/cua-hang" className={styles.secondary}><ArrowLeft size={16} aria-hidden="true" /> Cửa hàng</Link>
    <h1>Quản lý sản phẩm & kho</h1><p>Quản lý giá, tồn kho, trạng thái mở bán và đơn hàng theo từng gói. Thêm sản phẩm, chỉnh nội dung, thumbnail và chính sách trước khi mở bán.</p>
    {error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.notice} role="status">{notice}</p>}
    {data && <button className={styles.primary} disabled={busy} onClick={() => setCreating(true)}><PackagePlus size={18} aria-hidden="true" /> Thêm sản phẩm</button>}
    {data && creating && <ShopProductEditor onBusyChange={setBusy} onCancel={() => setCreating(false)} onSaved={async sku => { setCreating(false); setSelectedSku(sku); await load(sku); setNotice('Đã tạo sản phẩm. Chọn mở bán khi đã sẵn sàng giao hàng.'); }} />}
    {data && !creating && <label className={styles.archiveToggle}><input type="checkbox" checked={showArchived} onChange={event => setShowArchived(event.target.checked)} /> Hiện sản phẩm đã xóa</label>}
    {data && !creating && <div className={`${styles.tableWrap} ${styles.inventoryTable}`}><table><caption>Danh mục sản phẩm · chọn gói để quản lý</caption><thead><tr><th>Sản phẩm</th><th>Giá bán</th><th>Kho / giao hàng</th><th>Mở bán</th><th>Thao tác</th></tr></thead><tbody>{data.products.filter(item => showArchived ? !!item.archivedAt : !item.archivedAt).map(item => <tr key={item.sku} aria-selected={selectedSku === item.sku}><td><strong>{item.title}</strong></td><td>{item.priceConfirmed === false ? 'Chưa đặt giá' : item.price.toLocaleString('vi-VN') + '₫'}</td><td>{item.deliveryMode === 'manual' ? 'Admin bàn giao' : `${item.stock} link sẵn sàng`}</td><td>{item.archivedAt ? 'Đã xóa' : !item.published ? 'Bản nháp' : item.enabled ? 'Đang mở' : 'Đang tắt'}</td><td><button className={styles.secondary} disabled={busy || !!item.archivedAt || selectedSku === item.sku} onClick={() => { setSelectedSku(item.sku); document.getElementById('product-editor')?.scrollIntoView({behavior:'smooth'}); }}>{selectedSku === item.sku ? 'Đang chọn' : 'Quản lý'}</button>{' '}<button className={styles.secondary} disabled={busy} onClick={() => void archiveProduct(item.sku, item.title, !!item.archivedAt)}>{item.archivedAt ? 'Khôi phục' : 'Xóa'}</button></td></tr>)}</tbody></table></div>}
    {!data ? loading ? <p role="status">Đang xác minh quyền quản trị…</p> : <><Link href="/login?next=%2Fgemini%2Fadmin" className={styles.primary}>Đăng nhập quản trị</Link><button className={styles.secondary} onClick={() => void load(selectedSku).catch(reason => setError(reason.message))}>Thử lại</button></> : creating || !active || !!active.archivedAt ? null : <>
      <div id="product-editor" style={{scrollMarginTop:100}} />
      {refreshing && <p role="status">Đang tải kho {product.title}…</p>}
      <div className={styles.adminStats}><div><strong>{codeStock ? active?.stock ?? 0 : managed ? 'Admin' : active?.stock ?? 0}</strong><span>{codeStock ? 'Mã sẵn sàng bán' : managed ? 'Bàn giao sau thanh toán' : `Link ${product.durationMonths} tháng sẵn sàng bán`}</span></div><div><strong>{active?.enabled ? 'Đang mở' : 'Đang tắt'}</strong><span>Trạng thái {product.title}</span></div><div><strong>{data.bank ? 'Đã kết nối' : 'Chưa cấu hình'}</strong><span>Thanh toán QR</span></div></div>
      {!refreshing && active && <ShopProductEditor onBusyChange={setBusy} key={`${active.sku}-${editorRevision}`} product={active} onSaved={async sku => { await load(sku); setEditorRevision(current=>current+1); setNotice('Đã lưu thông tin sản phẩm và giá. Đơn mới dùng giá vừa lưu.'); }} />}
      {(!managed || codeStock) && <form className={styles.adminForm} onSubmit={event => { event.preventDefault(); void mutate({ action: 'import', links, validUntil: validUntil ? new Date(validUntil).toISOString() : null }); }}>
        <h2>Nhập {codeStock ? 'mã' : 'link'} {product.durationMonths} tháng</h2><p hidden={codeStock}>Mỗi dòng một link {product.sku === 'gemini-18m' ? 'https://serviceactivation.link/subscription/new/…' : 'https://one.google.com/offer/…'} chưa dùng, đúng gói {product.durationMonths} tháng. Tối đa 500 link/lần. Link trùng sẽ được bỏ qua ở cả hai kho, kể cả đã giao.</p>
        {codeStock && <p>Mỗi dòng một mã đúng tiền tố GEM{product.durationMonths}-. Mã trùng sẽ được bỏ qua và chỉ giao sau khi thanh toán được xác nhận.</p>}
        <label>Danh sách {codeStock ? 'mã' : 'link'} {product.title}<textarea required disabled={busy || refreshing} value={links} onChange={event => setLinks(event.target.value)} placeholder={codeStock ? `Mỗi dòng một mã GEM${product.durationMonths}-…` : product.sku === 'gemini-18m' ? 'Mỗi dòng một link https://serviceactivation.link/subscription/new/…' : 'Mỗi dòng một link kích hoạt Google One'} spellCheck={false} autoComplete="off" /></label>
        {!codeStock && <label>Hạn kích hoạt của lô link (giờ trên thiết bị của bạn)<input required disabled={busy || refreshing} type="datetime-local" value={validUntil} onChange={event => setValidUntil(event.target.value)} /></label>}<p hidden={codeStock}>Đây là hạn dùng của link, không phải ngày kết thúc gói {product.durationMonths} tháng của khách.</p>
        <button type="submit" disabled={busy || refreshing || !links.trim() || (!codeStock && !validUntil)} className={styles.primary}><PackagePlus size={18} aria-hidden="true" />{busy ? 'Đang nhập…' : `Nhập vào kho ${product.durationMonths} tháng`}</button>
      </form>}
      <section className={styles.adminForm}><h2>Mở bán {product.title}</h2><p hidden={managed}>Giá {(active?.price ?? product.price).toLocaleString('vi-VN')}₫ / link. Kiểm tra đúng ưu đãi {product.durationMonths} tháng, hạn dùng, điều kiện tài khoản và giá 0₫ trên Google. Link đã dùng để kiểm tra không được nhập kho.</p>
        {!managed && <label className={styles.accept}><input type="checkbox" checked={verified} disabled={busy || refreshing} onChange={event => setVerified(event.target.checked)} /><span>Tôi đã xác minh ưu đãi {product.durationMonths} tháng và có quyền phân phối lô link này.</span></label>}
        {(!active?.published || active?.priceConfirmed === false) && <p>Hoàn thiện giá và bật hiển thị trong thông tin sản phẩm trước khi mở bán.</p>}{managed && !codeStock && <p>Bật để nhận thanh toán QR. Khách đã thanh toán sẽ liên hệ admin để nhận mã. Tắt gói sẽ báo hết hàng và vô hiệu hóa QR đang chờ.</p>}{codeStock && <p>Mã được giữ tối đa 5 phút khi tạo QR và giao sau khi thanh toán được xác nhận.</p>}<div className={styles.adminActions}><button className={styles.primary} disabled={busy || refreshing || active?.enabled || !active?.published || active?.priceConfirmed === false || (codeStock && !active?.stock) || (!managed && (!verified || !active?.stock)) || !data.bank} onClick={() => void mutate({ action: 'settings', enabled: true, verifiedOffer: verified })}>Mở bán {(active?.price ?? product.price).toLocaleString('vi-VN')}₫</button><button className={styles.secondary} disabled={busy || refreshing || !active?.enabled} onClick={() => void mutate({ action: 'settings', enabled: false })}>Tắt gói {product.durationMonths} tháng</button></div>
      </section>
      <button className={styles.secondary} disabled={busy || loading} onClick={() => void load(selectedSku).catch(reason => setError(reason.message))}><RefreshCw size={16} aria-hidden="true" /> Cập nhật kho và đơn</button>
      {!refreshing && <><div className={styles.tableWrap}><table><caption>100 đơn {product.durationMonths} tháng gần nhất</caption><thead><tr><th>Mã thanh toán</th><th>Trạng thái</th><th>Giá</th><th>Tạo lúc</th><th>Mã người mua</th><th>Link đã cấp</th></tr></thead><tbody>{data.orders.map(order => <tr key={order.id}><td>{order.payment_code}</td><td>{order.status}</td><td>{order.amount_vnd.toLocaleString('vi-VN')}₫</td><td>{new Date(order.created_at).toLocaleString('vi-VN')}</td><td>{order.user_id}</td><td style={{ minWidth: 260, overflowWrap: 'anywhere' }}>{order.activation_url ? <><span>{order.activation_url}</span><button className={styles.secondary} onClick={() => void navigator.clipboard.writeText(order.activation_url!).then(() => setNotice(`Đã sao chép link của ${order.payment_code}.`)).catch(() => setError('Không sao chép được link. Hãy chọn và sao chép thủ công.'))}>Sao chép</button></> : order.status === 'PAID' ? (managed ? 'Khách liên hệ admin để nhận sản phẩm' : 'Không tìm thấy link') : 'Chưa cấp'}</td></tr>)}{!data.orders.length && <tr><td colSpan={6}>Chưa có đơn hàng.</td></tr>}</tbody></table></div>
      {(!managed || codeStock) && <div className={styles.tableWrap}><table><caption>100 {codeStock ? 'mã' : 'link'} {product.durationMonths} tháng nhập gần nhất</caption><thead><tr><th>Mã kho</th><th>Hạn kích hoạt</th><th>Trạng thái</th></tr></thead><tbody>{data.links.map(link => <tr key={link.id}><td>{link.id.slice(0, 8)}</td><td>{new Date(link.valid_until).toLocaleString('vi-VN')}</td><td>{link.allocation === 'PAID' ? 'Đã giao' : link.disabled ? 'Đã khóa' : Date.parse(link.valid_until) <= Date.now() ? 'Hết hạn' : link.allocation === 'PENDING' ? 'Đang giữ cho đơn chờ' : link.allocation ? 'Chờ đối soát' : Date.parse(link.valid_until) <= Date.now() + 600000 ? 'Sắp hết hạn · ngừng bán' : 'Sẵn sàng bán'}</td></tr>)}{!data.links.length && <tr><td colSpan={3}>Kho chưa có link.</td></tr>}</tbody></table></div>}</>}
    </>}
  </main>;
}
