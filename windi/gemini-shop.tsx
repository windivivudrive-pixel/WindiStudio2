'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowRight, CheckCircle2, Copy, FileText, Loader2, LockKeyhole, QrCode, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react';
import { GEMINI_PRODUCTS, isManagedGemini, geminiProduct, geminiSteps, type GeminiSku, type GeminiAccount, type GeminiOrder } from '@/lib/gemini/shared';
import styles from './gemini.module.css';
import { GeminiManagedOffer } from './gemini-managed-offer';
import { ShopProductInfo } from './shop-product-info';
import { GeminiManagedDelivery } from './gemini-managed-delivery';

const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
const date = (value: string) => new Date(value).toLocaleString('vi-VN');
const statusLabels: Record<string, string> = { PAID: 'Đã thanh toán', PENDING: 'Chờ thanh toán', EXPIRED: 'Hết hạn', UNDERPAID: 'Chuyển thiếu tiền', OVERPAID: 'Chuyển thừa tiền', REVIEW_REQUIRED: 'Cần đối soát', REFUNDED: 'Đã hoàn tiền' };
const support = 'https://www.facebook.com/profile.php?id=61594238790213';

export function GeminiShop({ initialProduct = null }: { initialProduct?: 'google-managed' | null }) {
  const [catalogProduct, setCatalogProduct] = useState<string | null>(initialProduct);
  const [account, setAccount] = useState<GeminiAccount | null>(null);
  const [selectedSku, setSelectedSku] = useState<GeminiSku>(initialProduct === 'google-managed' ? 'gemini-managed-6m' : 'gemini-3m');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [order, setOrder] = useState<GeminiOrder | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now());
  const dialog = useRef<HTMLDialogElement>(null);
  const buyButton = useRef<HTMLButtonElement>(null);
  const availableProduct = account?.products?.find(item => item.sku === selectedSku);
  const selectedProduct = availableProduct ?? geminiProduct('gemini-3m');

  const refresh = useCallback(async () => {
    const response = await fetch('/api/gemini/account', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Chưa tải được cửa hàng.');
    setAccount(data);
    setError('');
    setOrder(current => current ? data.orders.find((item: GeminiOrder) => item.id === current.id) || current : null);
  }, []);
  useEffect(() => { void refresh().catch(reason => setError(reason.message)).finally(() => setLoading(false)); }, [refresh]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!order || order.status !== 'PENDING') return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try { await refresh(); } catch (reason) { if (!cancelled) setError((reason as Error).message); }
      if (!cancelled) timer = setTimeout(poll, 4000);
    }
    timer = setTimeout(poll, 4000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [order?.id, order?.status, refresh]);
  useEffect(() => { if (order && !dialog.current?.open) dialog.current?.showModal(); }, [order]);

  async function buy() {
    if (busy || !accepted) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/gemini/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product: selectedSku, termsVersion: selectedProduct.termsVersion ?? 'shop-v1' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Chưa tạo được đơn.');
      setOrder(data.order);
      await refresh();
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }
  async function copy(value: string, label = 'nội dung chuyển khoản') {
    try { await navigator.clipboard.writeText(value); setNotice(`Đã sao chép ${label}.`); }
    catch { setError('Chưa sao chép được. Hãy nhập đúng nội dung đang hiển thị.'); }
  }
  function closeCheckout() { dialog.current?.close(); setOrder(null); }
  const pending = account?.orders.find(item => (item.product_sku || 'gemini-3m') === selectedSku && item.status === 'PENDING' && Date.parse(item.expires_at) > now);
  const canBuy = availableProduct?.enabled && account?.bank && (availableProduct.stock > 0 || pending);
  const stockLabel = loading ? 'Đang kiểm tra' : !account || !availableProduct ? 'Chưa kết nối' : !availableProduct.enabled ? 'Chưa mở bán' : availableProduct.stock > 0 ? 'Còn hàng' : pending ? 'Đã giữ link cho bạn' : 'Hết hàng';
  const seconds = order ? Math.min(300, Math.max(0, Math.ceil((Date.parse(order.expires_at) - now) / 1000))) : 0;
  const price = availableProduct?.price ?? selectedProduct.price;
  const checkoutMonths = order?.duration_months || 3;
  const managedProducts = account?.products.filter(product => isManagedGemini(product.sku));
  const managedFrom = managedProducts?.length ? 'Từ ' + money(Math.min(...managedProducts.map(product => product.price))) + '₫' : 'Đang tải giá';
  const mockupSkus = new Set(['gemini-18m', 'chatgpt-personal-1m', 'claude-1m', 'youtube-1m', 'elevenlabs-1m', 'capcut-12m', 'cursor-1m', 'gamma-6m']);
  const catalogCards = [
    ...(account?.products.filter(product => !isManagedGemini(product.sku)).map(product => ({ kind: 'product' as const, product, rank: product.sku === 'gemini-3m' ? 0 : product.sku === 'chatgpt-ready-1m' ? 2 : 3 })) ?? []),
    ...(managedProducts?.length ? [{ kind: 'managed' as const, rank: 1 }] : []),
  ].sort((a, b) => a.rank - b.rank);


  return <main className={styles.page}>
    <div className={styles.topline}><Link href="/">WindiStudio</Link><span>/</span><span>Cửa hàng số</span>{!catalogProduct && <a href="#san-pham">Sản phẩm <ArrowDown size={13} aria-hidden="true" /></a>}</div>
    {!catalogProduct && <>
    <section className={styles.catalog} id="san-pham" aria-labelledby="catalog-title">
      <div className={styles.catalogHeading}><h1 id="catalog-title">Sản phẩm</h1></div>
      <div className={styles.catalogGrid}>
        {catalogCards.map(card => {
          if (card.kind === 'managed') return <Link key="gemini-managed" className={styles.catalogCard} href="/cua-hang/gemini-dai-han"><span className={styles.cardArt}><img className={styles.productThumbnail} src={managedProducts?.[0].thumbnail || '/gemini-products/gemini-chinh-chu.png'} alt="" /></span><span className={styles.cardBody}><small>AI &amp; CÔNG VIỆC</small><strong>Gemini Pro nâng chính chủ</strong><span className={styles.cardDescription}>6 / 12 / 24 tháng · + 1 tháng YouTube Premium</span><span className={styles.catalogPrice}>{managedFrom}</span><span className={styles.cardBottom}><b className={managedProducts?.some(product => product.enabled) ? styles.inStock : undefined}>{managedProducts?.some(product => product.enabled) ? 'Còn hàng' : 'Hết hàng'}</b><ArrowRight size={18} aria-hidden="true" /></span></span></Link>;
          const product = card.product;
          const mockup = mockupSkus.has(product.sku);
          return <button key={product.sku} className={styles.catalogCard} disabled={mockup} onClick={() => { setSelectedSku(product.sku); setCatalogProduct(product.sku === 'gemini-3m' ? 'google' : 'product'); setAccepted(false); setError(''); window.scrollTo({top:0,behavior:'smooth'}); }}>
            <span className={styles.cardArt}>{product.thumbnail ? <img className={styles.productThumbnail} src={product.thumbnail} alt="" /> : <span className={styles.mockArt}><strong>{product.title}</strong></span>}</span>
            <span className={styles.cardBody}><small>{product.category}</small><strong>{product.title}</strong><span className={styles.cardDescription}>{product.description || (product.sku === 'gemini-3m' ? 'Nâng cấp chính chủ' : '')}</span>{!mockup && <span className={styles.catalogPrice}>{product.priceConfirmed !== false && product.originalPrice > product.price && <del>{money(product.originalPrice)}₫</del>} {product.priceConfirmed === false ? 'Đang cập nhật giá' : money(product.price) + '₫'}</span>}<span className={styles.cardBottom}><b className={!mockup && product.enabled && product.stock > 0 ? styles.inStock : undefined}>{mockup ? 'Hết hàng' : !product.enabled ? 'Chưa mở bán' : product.stock > 0 ? 'Còn hàng' : 'Hết hàng'}</b><ArrowRight size={18} aria-hidden="true" /></span></span>
          </button>;
        })}
      </div>
      {loading && <p role="status">Đang tải sản phẩm…</p>}
      {!loading && !account && <p className={styles.error} role="alert">{error || 'Chưa tải được cửa hàng. Vui lòng tải lại trang.'}</p>}
    </section>
    </>}
    {catalogProduct && (initialProduct ? <Link className={styles.backToCatalog} href="/cua-hang">← Quay lại sản phẩm</Link> : <button className={styles.backToCatalog} onClick={() => { setCatalogProduct(null); setSelectedSku('gemini-3m'); setAccepted(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>← Quay lại sản phẩm</button>)}
    {catalogProduct && catalogProduct !== 'google-managed' && availableProduct && <section className={styles.detailIntro}><div><span className={styles.eyebrow}>CHI TIẾT SẢN PHẨM</span><h2>{availableProduct.title}</h2><p>{availableProduct.description}</p></div><span className={availableProduct.enabled && availableProduct.stock > 0 ? styles.inStock : styles.soldOut}>{!availableProduct.enabled ? 'Chưa mở bán' : availableProduct.stock > 0 ? 'Còn hàng' : 'Hết hàng'}</span></section>}
    {catalogProduct === 'product' && availableProduct && <section className={styles.genericOffer}>
      <div>{availableProduct.thumbnail && <img className={styles.detailThumbnail} src={availableProduct.thumbnail} alt={availableProduct.title} />}</div>
      <div className={styles.offer}><p className={styles.price}>{availableProduct.priceConfirmed === false ? 'Đang cập nhật giá' : money(price)}{availableProduct.priceConfirmed !== false && <span>₫</span>}</p>{availableProduct.priceConfirmed !== false && availableProduct.originalPrice > price && <p><del>{money(availableProduct.originalPrice)}₫</del></p>}<p>Thời hạn: {availableProduct.durationMonths} tháng · {availableProduct.deliveryMode === 'manual' ? 'Admin bàn giao sau thanh toán' : 'Link tự động từ kho'}</p><ShopProductInfo product={availableProduct} />
      <label className={styles.accept}><input type="checkbox" checked={accepted} onChange={event=>setAccepted(event.target.checked)} /><span>Tôi đã đọc lợi ích, chính sách bảo hành và lưu ý trước khi mua.</span></label>
      {!availableProduct.enabled || !availableProduct.stock ? <button className={styles.primary} disabled>{availableProduct.enabled ? 'Hết hàng' : 'Chưa mở bán'}</button> : !account?.bank ? <button className={styles.primary} disabled>Thanh toán chưa sẵn sàng</button> : !account.authenticated ? <Link className={styles.primary} href="/login?next=%2Fcua-hang">Đăng nhập để mua</Link> : <button className={styles.primary} disabled={busy || !accepted} onClick={()=>void buy()}>{busy?'Đang tạo đơn…':`Thanh toán QR · ${money(price)}₫`}</button>}
      {!order && error && <p className={styles.error} role="alert">{error}</p>}
      </div>
    </section>}
    {catalogProduct === 'google-managed' && !order && error && <p className={styles.error} role="alert">{error}</p>}
    {catalogProduct === 'google-managed' && <GeminiManagedOffer sku={selectedSku} onSelect={sku => { setSelectedSku(sku); setAccepted(false); }} account={account} busy={busy} accepted={accepted} onAccept={setAccepted} onBuy={() => void buy()} />}
    {catalogProduct === 'google' && <>
    <section className={styles.purchaseSection} id="mua-ngay" aria-label="Chọn gói Gemini và hướng dẫn kích hoạt">
      <div><img className={styles.detailThumbnail} src={availableProduct?.thumbnail || "/gemini-products/gemini-3-thang.png"} alt={selectedProduct.title} />{availableProduct && <ShopProductInfo product={availableProduct} />}</div>
      <div className={styles.offer}>
        <fieldset className={styles.planPicker} disabled={busy}>
          <legend>Chọn thời hạn sử dụng</legend>
          {GEMINI_PRODUCTS.filter(product => product.sku === 'gemini-3m').map(product => <label key={product.sku} className={`${styles.planChoice} ${selectedSku === product.sku ? styles.planSelected : ''}`}>
            <input type="radio" name="gemini-product" value={product.sku} checked={selectedSku === product.sku} onChange={() => { setSelectedSku(product.sku); setAccepted(false); setError(''); setNotice(''); }} />
            <span><strong>{product.durationMonths} tháng</strong></span>
          </label>)}
        </fieldset>
        <section className={styles.argonFeature} aria-labelledby="argon-feature-title" aria-live="polite">
          <div className={styles.argonFeatureHeading}><Sparkles size={24} aria-hidden="true" /><div><span>ĐIỂM KHÁC BIỆT NỔI BẬT</span><h3 id="argon-feature-title">{selectedSku === 'gemini-3m' ? 'Có Gemini 4 Argon trong Antigravity' : 'Không có Gemini 4 Argon trong Antigravity'}</h3></div></div>
        </section>
        {!availableProduct?.benefits?.length && <section className={styles.proBenefits} aria-labelledby="pro-benefits-title">
          <h3 id="pro-benefits-title">Quyền lợi gói Google AI Pro</h3>
          <ul>
            <li><CheckCircle2 size={16} aria-hidden="true" /><span><strong>5 TB dung lượng tổng</strong> dùng chung cho Google Drive, Gmail và Google Photos.</span></li>
            <li><CheckCircle2 size={16} aria-hidden="true" /><span>Quyền truy cập <strong>Gemini 4 Argon</strong> trong Gemini, Deep Research và Antigravity.</span></li>
            <li><CheckCircle2 size={16} aria-hidden="true" /><span>Gemini tích hợp trong Gmail, Docs, Vids và các ứng dụng Google được hỗ trợ.</span></li>
            <li><CheckCircle2 size={16} aria-hidden="true" /><span>Thêm quyền sử dụng Google Flow và Gemini Notebook.</span></li>
          </ul>
          <small>Một số tính năng có thể phụ thuộc quốc gia, tài khoản và điều kiện của Google.</small>
        </section>}
        <div className={styles.offerTop}><span>GEMINI · {selectedProduct.durationMonths} THÁNG</span><span className={stockLabel === 'Còn hàng' ? styles.inStock : styles.stock}>{stockLabel}</span></div>
        <p className={styles.price}>{money(price)}<span>₫</span></p><p className={styles.priceCaption}>{(availableProduct?.originalPrice ?? selectedProduct.originalPrice) > price && <><del>Giá gốc {money(availableProduct?.originalPrice ?? selectedProduct.originalPrice)}₫</del> · </>}Thanh toán một lần cho một link kích hoạt.</p>
      </div>
      <div className={styles.purchaseActions}>
        <div className={styles.conditions}>
          <strong>Lưu ý quan trọng trước khi mua</strong>
          <ul>
          <li><strong>Gói không bảo hành.</strong></li>
          <li>Chuẩn bị <strong>thẻ hoặc ví MoMo</strong> để thêm làm phương thức thanh toán theo lựa chọn Google hiển thị.</li>
          <li><strong>Mỗi link chỉ dùng một lần.</strong> Khi mở link, link có thể được gắn với tài khoản Google đang đăng nhập, kể cả khi bạn chưa hoàn tất đăng ký. Sau khi mở link, không hỗ trợ đổi hoặc hoàn trả.</li>
          <li>Hãy đăng nhập đúng tài khoản cần nâng cấp trước khi mở link. Tài khoản đang có ưu đãi Pro 18 tháng không dùng được gói này. Nếu Google báo tài khoản không có ưu đãi nhưng vẫn có thể đăng ký, hãy dừng lại: tiếp tục có thể làm link bị sử dụng hoặc mất hiệu lực.</li>
          <li>Một phương thức thanh toán có thể chỉ dùng được cho một tài khoản và một lần nhận ưu đãi. Tài khoản từng mất gói có thể thử nhận lại; kết quả phụ thuộc vào điều kiện Google hiển thị.</li>
          <li>Link được kiểm tra chưa sử dụng trước khi bán và không bán lại. Link chưa dùng có thể giữ đến ngày <strong>01/01/2027</strong>, thời điểm chương trình kết thúc theo thông tin nhà cung cấp.</li>
          <li>Nếu nút “Dùng thử” không phản hồi, thử thay phần đầu địa chỉ <strong>one.google.com/offer/</strong> bằng <strong>one.google.com/partner-eft-onboard/</strong>, giữ nguyên phần còn lại của link.</li>
          <li>Chỉ xác nhận khi Google hiển thị ưu đãi <strong>0₫</strong> và đúng thời hạn. Sau khi kích hoạt thành công, bạn có thể hủy gia hạn để tránh bị tính phí kỳ tiếp theo; gói đã nhận tiếp tục đến hết thời hạn hiển thị trong tài khoản Google.</li>
          </ul>
        </div>
        <label className={styles.accept}><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /><span>{selectedSku === 'gemini-3m' ? 'Tôi đã đọc điều kiện sử dụng link, phương thức thanh toán và chính sách sau khi mở link; tôi sẽ tự kích hoạt và kiểm tra ngày gia hạn tại Google.' : 'Tôi đã đọc điều kiện gói 18 tháng, hiểu cần tự kích hoạt và kiểm tra ngày gia hạn tại Google.'}</span></label>
        {loading ? <button className={styles.primary} disabled>Đang kiểm tra cửa hàng…</button>
          : !account || !availableProduct ? <button className={styles.primary} onClick={() => { setLoading(true); void refresh().catch(reason => setError(reason.message)).finally(() => setLoading(false)); }}>Thử kết nối lại <RefreshCw size={17} aria-hidden="true" /></button>
          : !canBuy ? <button className={styles.primary} disabled>{!availableProduct.enabled ? 'Đang chuẩn bị mở bán' : !account.bank ? 'Thanh toán đang được chuẩn bị' : 'Hết hàng'}</button>
          : !account.authenticated ? <Link className={styles.primary} href="/login?next=%2Fcua-hang">Đăng nhập để mua <ArrowRight size={18} aria-hidden="true" /></Link>
          : <button ref={buyButton} className={styles.primary} disabled={busy || !accepted} onClick={() => void buy()}>{busy ? <Loader2 className={styles.spinner} size={18} aria-hidden="true" /> : <QrCode size={18} aria-hidden="true" />}{pending ? 'Tiếp tục thanh toán QR' : 'Mua ngay · ' + money(price) + '₫'}</button>}
        <small className={styles.offerFoot}><ShieldCheck size={14} aria-hidden="true" /> Chỉ giao link sau khi hệ thống xác nhận tiền.</small>
        <a href={support} target="_blank" rel="noopener noreferrer" className={styles.supportLink}>Cần kiểm tra điều kiện? Liên hệ WindiStudio <ArrowRight size={13} aria-hidden="true" /></a>
        {!order && error && <p className={styles.error} role="alert">{error}</p>}{!order && notice && <p className={styles.notice} role="status">{notice}</p>}
      </div>
      <div className={styles.purchaseGuide} id="huong-dan" aria-labelledby="guide-title">
        <span className={styles.eyebrow}>TỪ THANH TOÁN ĐẾN KÍCH HOẠT</span>
        <h2 id="guide-title">5 bước kích hoạt <br />Gemini của bạn.</h2>
        <p className={styles.guideIntro}>Làm lần lượt các bước dưới đây trên tài khoản Google cá nhân của bạn.</p>
        <ol className={styles.steps}>{geminiSteps({ ...selectedProduct, price }).map((step, index) => <li key={step.title}>
          <span className={styles.stepNumber}>0{index + 1}</span>
          <div><h3>{step.title}</h3><p>{step.text}</p></div>
        </li>)}</ol>
      </div>
    </section>



    </>}

    {account?.authenticated && account.orders.length > 0 && <section className={styles.orders} aria-labelledby="orders-title"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>LƯU TRONG TÀI KHOẢN CỦA BẠN</span><h2 id="orders-title">Đơn hàng của tôi</h2></div><button className={styles.secondary} onClick={() => void refresh().catch(reason => setError(reason.message))}><RefreshCw size={16} aria-hidden="true" /> Cập nhật</button></div>{!order && notice && <p className={styles.notice} role="status">{notice}</p>}{!order && error && <p className={styles.error} role="alert">{error}</p>}<div className={styles.orderList}>{account.orders.map(item => <article key={item.id}><FileText size={22} aria-hidden="true" /><div><strong>{item.product_title || account.products.find(product => product.sku === item.product_sku)?.title || 'Sản phẩm'} · {item.payment_code}</strong><small>{date(item.created_at)} · {money(item.amount_vnd)}₫</small><span>{item.status === 'PENDING' && Date.parse(item.expires_at) <= now ? 'Hết hạn' : statusLabels[item.status] || item.status}</span></div>{item.status === 'PAID' && (item.delivery_mode === 'manual' || isManagedGemini(item.product_sku)) ? <GeminiManagedDelivery order={item} /> : item.status === 'PAID' ? <div className={styles.activationLink}><label>Link kích hoạt<textarea readOnly value={item.activation_url || ''} rows={2} aria-label={`Link kích hoạt ${item.payment_code}`} /></label>{item.activation_url ? <button className={styles.secondary} onClick={() => void copy(item.activation_url!, 'link kích hoạt')}><Copy size={16} aria-hidden="true" /> Sao chép link</button> : <small>Chưa tải được link. Hãy cập nhật hoặc liên hệ hỗ trợ.</small>}</div> : <button className={styles.secondary} onClick={() => { setError(''); setNotice(''); setOrder(item); }}>Xem đơn <ArrowRight size={16} aria-hidden="true" /></button>}</article>)}</div><small className={styles.smallPrint}>Hiển thị 30 đơn gần nhất. Khi cần tra cứu đơn cũ hơn, liên hệ hỗ trợ kèm mã chuyển khoản.</small></section>}

    <dialog ref={dialog} className={styles.checkout} aria-labelledby="checkout-title" onClose={() => { setOrder(null); buyButton.current?.focus(); }}>
      {order && <><header><span><LockKeyhole size={15} aria-hidden="true" /> {order.product_title || 'ĐƠN HÀNG'}</span><button aria-label="Đóng thanh toán" onClick={closeCheckout}><X size={20} aria-hidden="true" /></button></header><div className={styles.checkoutBody}>
        {order.status === 'PAID' && (order.delivery_mode === 'manual' || isManagedGemini(order.product_sku)) ? <><h2 id="checkout-title">Thanh toán thành công.</h2><GeminiManagedDelivery order={order} /></> : order.status === 'PAID' ? <><div className={styles.successIcon}><CheckCircle2 size={36} aria-hidden="true" /></div><h2 id="checkout-title">Link của bạn đã sẵn sàng.</h2><p>Đã nhận {money(order.amount_vnd)}₫ cho gói {checkoutMonths} tháng. Sao chép link và làm theo 5 bước hướng dẫn.</p><label className={styles.activationLink}>Link kích hoạt<textarea readOnly value={order.activation_url || ''} rows={3} aria-label="Link kích hoạt" /></label>{order.activation_url ? <button className={styles.primary} onClick={() => void copy(order.activation_url!, 'link kích hoạt')}><Copy size={18} aria-hidden="true" /> Sao chép link</button> : <p>Chưa tải được link. Hãy kiểm tra trạng thái hoặc liên hệ hỗ trợ.</p>}<button className={styles.secondary} onClick={() => { closeCheckout(); document.getElementById('huong-dan')?.scrollIntoView({ behavior: 'smooth' }); }}>Xem hướng dẫn kích hoạt <ArrowRight size={16} aria-hidden="true" /></button></>
        : order.status === 'PENDING' && seconds > 0 && account?.bank ? <><span className={styles.stock}>{(order.delivery_mode === 'manual' || isManagedGemini(order.product_sku)) ? 'Thời gian thanh toán' : 'Giữ link cho bạn'} · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span><h2 id="checkout-title">{(order.delivery_mode === 'manual' || isManagedGemini(order.product_sku)) ? 'Quét QR để thanh toán' : 'Quét QR để nhận link'}</h2><strong className={styles.checkoutPrice}>{money(order.amount_vnd)}₫</strong><img className={styles.qr} src={`https://img.vietqr.io/image/${encodeURIComponent(account.bank.bank)}-${encodeURIComponent(account.bank.account)}-compact2.png?amount=${order.amount_vnd}&addInfo=${encodeURIComponent(order.payment_code)}&accountName=${encodeURIComponent(account.bank.name)}`} alt={`QR gói ${checkoutMonths} tháng, chuyển ${money(order.amount_vnd)} đồng, nội dung ${order.payment_code}`} /><p>{account.bank.name}<br />{account.bank.bank} · {account.bank.account}</p><button className={styles.paymentCode} onClick={() => void copy(order.payment_code)}>{order.payment_code}<Copy size={17} aria-hidden="true" /></button><small>Giữ đúng số tiền và nội dung. Không chuyển sau khi QR hết hạn.</small><div className={styles.waiting}><span className={styles.tinyDot} /> Đang chờ thông báo thanh toán tự động</div></>
        : <><h2 id="checkout-title">{order.status === 'EXPIRED' || order.status === 'PENDING' ? 'QR đã hết hạn' : 'Đơn cần được kiểm tra'}</h2><p>{order.status === 'EXPIRED' || order.status === 'PENDING' ? 'Nếu chưa chuyển tiền, đóng cửa sổ và tạo lại đơn. Nếu đã chuyển, liên hệ hỗ trợ kèm mã bên dưới; không thanh toán lần nữa.' : 'Hệ thống chưa thể giao link tự động cho giao dịch này. Liên hệ WindiStudio kèm mã đơn để kiểm tra và hỗ trợ.'}</p><code>{order.payment_code}</code><a href={support} target="_blank" rel="noopener noreferrer" className={styles.primary}>Liên hệ hỗ trợ <ArrowRight size={16} aria-hidden="true" /></a></>}
        <div aria-live="polite">{notice && <p className={styles.notice}>{notice}</p>}</div>{error && <p className={styles.error} role="alert">{error}</p>}<button className={styles.secondary} onClick={() => void refresh().catch(reason => setError(reason.message))}><RefreshCw size={15} aria-hidden="true" /> Kiểm tra trạng thái</button>
      </div></>}
    </dialog>
  </main>;
}
