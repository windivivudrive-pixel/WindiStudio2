'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowDownToLine, ArrowRight, CheckCircle2, ChevronDown, Copy, FileText, Loader2, LockKeyhole, QrCode, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react';
import { GEMINI_PRICE, GEMINI_TERMS_VERSION, geminiSteps, type GeminiAccount, type GeminiOrder } from '@/lib/gemini/shared';
import styles from './gemini.module.css';

const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
const date = (value: string) => new Date(value).toLocaleString('vi-VN');
const statusLabels: Record<string, string> = { PAID: 'Đã thanh toán', PENDING: 'Chờ thanh toán', EXPIRED: 'Hết hạn', UNDERPAID: 'Chuyển thiếu tiền', OVERPAID: 'Chuyển thừa tiền', REVIEW_REQUIRED: 'Cần đối soát', REFUNDED: 'Đã hoàn tiền' };
const support = 'https://www.facebook.com/profile.php?id=61594238790213';

export function GeminiShop() {
  const [account, setAccount] = useState<GeminiAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [order, setOrder] = useState<GeminiOrder | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now());
  const dialog = useRef<HTMLDialogElement>(null);
  const buyButton = useRef<HTMLButtonElement>(null);

  const refresh = useCallback(async () => {
    const response = await fetch('/api/gemini/account', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Chưa tải được cửa hàng.');
    setAccount(data);
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
      const response = await fetch('/api/gemini/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ termsVersion: GEMINI_TERMS_VERSION }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Chưa tạo được đơn.');
      setOrder(data.order);
      await refresh();
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }
  async function download(id: string) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/gemini/download?order=${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Chưa tải được file.'); }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `Gemini-3-thang-${id}.txt`; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      setNotice('Đã tải file TXT. Mở file để sao chép link và làm theo 5 bước kích hoạt.');
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setNotice('Đã sao chép nội dung chuyển khoản.'); }
    catch { setError('Chưa sao chép được. Hãy nhập đúng nội dung đang hiển thị.'); }
  }
  function closeCheckout() { dialog.current?.close(); setOrder(null); }
  const pending = account?.orders.find(item => item.status === 'PENDING' && Date.parse(item.expires_at) > now);
  const canBuy = account?.enabled && account.bank && (account.stock > 0 || pending);
  const seconds = order ? Math.min(600, Math.max(0, Math.ceil((Date.parse(order.expires_at) - now) / 1000))) : 0;
  const price = account?.price ?? GEMINI_PRICE;

  return <main className={styles.page}>
    <div className={styles.topline}><Link href="/">WindiStudio</Link><span>/</span><span>Google Gemini</span><a href="#huong-dan">Hướng dẫn kích hoạt <ArrowDown size={13} aria-hidden="true" /></a></div>
    <section className={styles.hero} aria-labelledby="gemini-title">
      <div className={styles.heroCopy}>
        <span className={styles.eyebrow}><span /> MỘT LINK. BA THÁNG KHÁM PHÁ.</span>
        <h1 id="gemini-title">Thêm Gemini.<br /><em>Mở thêm ý tưởng.</em></h1>
        <p className={styles.lead}>Nâng cấp trải nghiệm AI trên chính tài khoản Google của bạn. Nhận link kích hoạt ưu đãi <strong>3 tháng</strong>, bắt đầu từ một lần quét QR.</p>
        <div className={styles.heroActions}><a href="#mua-ngay" className={styles.primary}>Khám phá gói 3 tháng <ArrowRight size={18} aria-hidden="true" /></a><a href="#huong-dan" className={styles.secondary}>Cách sử dụng <ArrowDown size={16} aria-hidden="true" /></a></div>
        <div className={styles.trustline}><span><ShieldCheck size={16} aria-hidden="true" /> Dùng Google cá nhân</span><span><FileText size={16} aria-hidden="true" /> Giao link qua file TXT</span></div>
      </div>
      <div className={styles.productVisual} aria-label="Gói Gemini 3 tháng, một link kích hoạt trên tài khoản Google cá nhân">
        <div className={styles.visualRings} aria-hidden="true"><div className={styles.orbitOne} /><div className={styles.orbitTwo} /></div>
        <div className={styles.visualLabel}><span className={styles.tinyDot} /> YOUR NEXT IDEA STARTS HERE</div>
        <div className={styles.sparkle}><Sparkles size={96} strokeWidth={1.25} aria-hidden="true" /></div>
        <div className={styles.productName}>Gemini<span>by Google</span></div>
        <div className={styles.visualBottom}><span>LINK KÍCH HOẠT<br /><strong>Trên Google của bạn</strong></span><strong className={styles.duration}>03<span>THÁNG</span></strong></div>
        <div className={styles.fileTag}><FileText size={22} aria-hidden="true" /><div>gemini-3-thang.txt<small>Một đơn hàng · Một link riêng</small></div><CheckCircle2 size={19} aria-hidden="true" /></div>
      </div>
    </section>

    <div className={styles.featureStrip}><span><QrCode aria-hidden="true" /> Thanh toán QR tự động</span><span><ArrowDownToLine aria-hidden="true" /> Nhận TXT sau xác nhận tiền</span><span><LockKeyhole aria-hidden="true" /> Không cần gửi mật khẩu Google</span></div>

    <section className={styles.purchaseSection} id="mua-ngay" aria-label="Hướng dẫn kích hoạt và mua gói Gemini 3 tháng">
      <div className={styles.purchaseGuide} id="huong-dan" aria-labelledby="guide-title">
        <span className={styles.eyebrow}>TỪ THANH TOÁN ĐẾN KÍCH HOẠT</span>
        <h2 id="guide-title">5 bước kích hoạt <br />Gemini của bạn.</h2>
        <p className={styles.guideIntro}>Làm lần lượt các bước dưới đây trên tài khoản Google cá nhân của bạn.</p>
        <ol className={styles.steps}>{geminiSteps.map((step, index) => <li key={step.title}>
          <span className={styles.stepNumber}>0{index + 1}</span>
          <div><h3>{step.title}</h3><p>{step.text}</p></div>
        </li>)}</ol>
      </div>
      <div className={styles.offer}>
        <div className={styles.offerTop}><span>GEMINI · 3 THÁNG</span><span className={styles.stock}>{loading ? 'Đang kiểm tra' : !account ? 'Chưa kết nối' : !account.enabled ? 'Chưa mở bán' : account.stock > 0 ? 'Có sẵn' : pending ? 'Đã giữ link cho bạn' : 'Tạm hết link'}</span></div>
        <p className={styles.price}>{money(price)}<span>₫</span></p><p className={styles.priceCaption}>Thanh toán một lần cho một link kích hoạt.</p>
        <div className={styles.conditions}>
          <strong>Đọc trước khi mua</strong>
          <p>Chuẩn bị <strong>thẻ thanh toán quốc tế hoặc ví MoMo</strong>, có sẵn <strong>tối thiểu 30.000₫</strong> trong tài khoản để xác minh phương thức thanh toán với Google. Chỉ dùng MoMo khi Google hiển thị tùy chọn này.</p>
          <p>Google có thể tạm giữ hoặc thu một khoản nhỏ để xác minh. Khoản xác minh sẽ được <strong>giải tỏa hoặc hoàn lại</strong>; thời gian tiền về tùy ngân hàng/ví và quy trình của Google, có thể không ngay lập tức. Số tiền xác minh thực tế do Google quyết định.</p>
          <p className={styles.verificationNote}>30.000₫ là số dư cần chuẩn bị, tách biệt với giá mua link 150.000₫. Chỉ xác nhận khi Google hiển thị ưu đãi <strong>0₫</strong>; kiểm tra ngày gia hạn sau 3 tháng.</p>
        </div>
        <label className={styles.accept}><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /><span>Tôi đã đọc yêu cầu về thẻ/MoMo và số dư xác minh, hiểu cần tự kích hoạt và kiểm tra ngày gia hạn tại Google.</span></label>
        {loading ? <button className={styles.primary} disabled>Đang kiểm tra cửa hàng…</button>
          : !account ? <button className={styles.primary} onClick={() => { setLoading(true); void refresh().catch(reason => setError(reason.message)).finally(() => setLoading(false)); }}>Thử kết nối lại <RefreshCw size={17} aria-hidden="true" /></button>
          : !canBuy ? <button className={styles.primary} disabled>{!account.enabled ? 'Đang chuẩn bị mở bán' : !account.bank ? 'Thanh toán đang được chuẩn bị' : 'Tạm hết link kích hoạt'}</button>
          : !account.authenticated ? <Link className={styles.primary} href="/login?next=%2Fgemini">Đăng nhập để mua <ArrowRight size={18} aria-hidden="true" /></Link>
          : <button ref={buyButton} className={styles.primary} disabled={busy || !accepted} onClick={() => void buy()}>{busy ? <Loader2 className={styles.spinner} size={18} aria-hidden="true" /> : <QrCode size={18} aria-hidden="true" />}{pending ? 'Tiếp tục thanh toán QR' : `Mua ngay · ${money(price)}₫`}</button>}
        <small className={styles.offerFoot}><ShieldCheck size={14} aria-hidden="true" /> Chỉ giao link sau khi hệ thống xác nhận tiền.</small>
        <a href={support} target="_blank" rel="noopener noreferrer" className={styles.supportLink}>Cần kiểm tra điều kiện? Liên hệ WindiStudio <ArrowRight size={13} aria-hidden="true" /></a>
        {!order && error && <p className={styles.error} role="alert">{error}</p>}{!order && notice && <p className={styles.notice} role="status">{notice}</p>}
      </div>
    </section>



    {account?.authenticated && account.orders.length > 0 && <section className={styles.orders} aria-labelledby="orders-title"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>LƯU TRONG TÀI KHOẢN CỦA BẠN</span><h2 id="orders-title">Đơn Gemini của tôi</h2></div><button className={styles.secondary} onClick={() => void refresh().catch(reason => setError(reason.message))}><RefreshCw size={16} aria-hidden="true" /> Cập nhật</button></div><div className={styles.orderList}>{account.orders.map(item => <article key={item.id}><FileText size={22} aria-hidden="true" /><div><strong>{item.payment_code}</strong><small>{date(item.created_at)} · {money(item.amount_vnd)}₫</small><span>{item.status === 'PENDING' && Date.parse(item.expires_at) <= now ? 'Hết hạn' : statusLabels[item.status] || item.status}</span></div>{item.status === 'PAID' ? <button className={styles.secondary} disabled={busy} onClick={() => void download(item.id)}><ArrowDownToLine size={16} aria-hidden="true" /> Tải TXT</button> : <button className={styles.secondary} onClick={() => { setError(''); setNotice(''); setOrder(item); }}>Xem đơn <ArrowRight size={16} aria-hidden="true" /></button>}</article>)}</div><small className={styles.smallPrint}>Hiển thị 30 đơn gần nhất. Khi cần tra cứu đơn cũ hơn, liên hệ hỗ trợ kèm mã chuyển khoản.</small></section>}

    <section className={styles.faq} aria-labelledby="faq-title"><span className={styles.eyebrow}>TRƯỚC KHI BẮT ĐẦU</span><h2 id="faq-title">Bạn có thể đang thắc mắc.</h2>{[
      ['Tôi sẽ nhận tài khoản hay link kích hoạt?', 'Bạn nhận file TXT chứa một link ưu đãi. Bạn tự đăng nhập Google cá nhân và kích hoạt trên Google. WindiStudio không yêu cầu mật khẩu Google, thông tin thẻ hoặc mã OTP của bạn.'],
      ['Vì sao mua 150.000₫ nhưng Google hiện 0₫?', '150.000₫ là giá mua link tại WindiStudio. 0₫ là số tiền Google hiển thị cho thời gian ưu đãi nếu tài khoản đủ điều kiện. Hai bước thanh toán này tách biệt; hãy đọc kỹ số tiền và ngày thu phí tiếp theo tại Google.'],
      ['Cần chuẩn bị gì để xác minh với Google?', 'Chuẩn bị thẻ thanh toán quốc tế hoặc ví MoMo có tối thiểu 30.000₫. MoMo chỉ dùng được khi Google hiển thị tùy chọn này. Khoản xác minh thực tế tùy Google, không cố định ở 30.000₫. Khoản tạm giữ/thu xác minh sẽ được giải tỏa hoặc hoàn lại; thời gian tiền về phụ thuộc ngân hàng/ví và có thể không ngay lập tức.'],
      ['Đã chuyển khoản nhưng chưa nhận file?', 'Giữ trang thanh toán mở hoặc quay lại Đơn Gemini của tôi. Hệ thống tự cập nhật sau khi nhận thông báo ngân hàng. Chuyển sai số tiền, sai nội dung hoặc sau hạn QR cần được hỗ trợ đối soát; đừng chuyển thêm một lần nữa.'],
      ['Link không kích hoạt được thì làm gì?', 'Dừng xác nhận nếu Google không hiển thị đúng ưu đãi 3 tháng hoặc số tiền khác 0₫. Liên hệ WindiStudio kèm mã đơn và ảnh thông báo đã che thông tin nhạy cảm để kiểm tra link và điều kiện tài khoản.'],
    ].map(([title, text]) => <details key={title}><summary>{title}<ChevronDown size={18} aria-hidden="true" /></summary><p>{text}</p></details>)}<p className={styles.sourceLinks}><a href="https://support.google.com/googlepay/answer/12651770?hl=vi" target="_blank" rel="noopener noreferrer">Khoản xác minh và hoàn tiền Google ↗</a><a href="https://support.google.com/googleone/answer/9155746?hl=vi" target="_blank" rel="noopener noreferrer">Điều kiện dùng thử Google One ↗</a><a href="https://support.google.com/googleplay/answer/2651410?co=GENIE.CountryCode%3DVN&hl=vi" target="_blank" rel="noopener noreferrer">Phương thức thanh toán Google ↗</a></p></section>

    <dialog ref={dialog} className={styles.checkout} aria-labelledby="checkout-title" onClose={() => { setOrder(null); buyButton.current?.focus(); }}>
      {order && <><header><span><LockKeyhole size={15} aria-hidden="true" /> ĐƠN GEMINI 3 THÁNG</span><button aria-label="Đóng thanh toán" onClick={closeCheckout}><X size={20} aria-hidden="true" /></button></header><div className={styles.checkoutBody}>
        {order.status === 'PAID' ? <><div className={styles.successIcon}><CheckCircle2 size={36} aria-hidden="true" /></div><h2 id="checkout-title">Link của bạn đã sẵn sàng.</h2><p>Đã nhận {money(order.amount_vnd)}₫. Tải TXT, mở link và làm theo 5 bước hướng dẫn.</p><button className={styles.primary} disabled={busy} onClick={() => void download(order.id)}><ArrowDownToLine size={18} aria-hidden="true" />{busy ? 'Đang tải…' : 'Tải file TXT chứa link'}</button><button className={styles.secondary} onClick={() => { closeCheckout(); document.getElementById('huong-dan')?.scrollIntoView({ behavior: 'smooth' }); }}>Xem hướng dẫn kích hoạt <ArrowRight size={16} aria-hidden="true" /></button></>
        : order.status === 'PENDING' && seconds > 0 && account?.bank ? <><span className={styles.stock}>Giữ link cho bạn · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span><h2 id="checkout-title">Quét QR để nhận link</h2><strong className={styles.checkoutPrice}>{money(order.amount_vnd)}₫</strong><img className={styles.qr} src={`https://img.vietqr.io/image/${encodeURIComponent(account.bank.bank)}-${encodeURIComponent(account.bank.account)}-compact2.png?amount=${order.amount_vnd}&addInfo=${encodeURIComponent(order.payment_code)}&accountName=${encodeURIComponent(account.bank.name)}`} alt={`QR chuyển ${money(order.amount_vnd)} đồng, nội dung ${order.payment_code}`} /><p>{account.bank.name}<br />{account.bank.bank} · {account.bank.account}</p><button className={styles.paymentCode} onClick={() => void copy(order.payment_code)}>{order.payment_code}<Copy size={17} aria-hidden="true" /></button><small>Giữ đúng số tiền và nội dung. Không chuyển sau khi QR hết hạn.</small><div className={styles.waiting}><span className={styles.tinyDot} /> Đang chờ thông báo thanh toán tự động</div></>
        : <><h2 id="checkout-title">{order.status === 'EXPIRED' || order.status === 'PENDING' ? 'QR đã hết hạn' : 'Đơn cần được kiểm tra'}</h2><p>{order.status === 'EXPIRED' || order.status === 'PENDING' ? 'Nếu chưa chuyển tiền, đóng cửa sổ và tạo lại đơn. Nếu đã chuyển, liên hệ hỗ trợ kèm mã bên dưới; không thanh toán lần nữa.' : 'Hệ thống chưa thể giao link tự động cho giao dịch này. Liên hệ WindiStudio kèm mã đơn để kiểm tra và hỗ trợ.'}</p><code>{order.payment_code}</code><a href={support} target="_blank" rel="noopener noreferrer" className={styles.primary}>Liên hệ hỗ trợ <ArrowRight size={16} aria-hidden="true" /></a></>}
        <div aria-live="polite">{notice && <p className={styles.notice}>{notice}</p>}</div>{error && <p className={styles.error} role="alert">{error}</p>}<button className={styles.secondary} onClick={() => void refresh().catch(reason => setError(reason.message))}><RefreshCw size={15} aria-hidden="true" /> Kiểm tra trạng thái</button>
      </div></>}
    </dialog>
  </main>;
}
