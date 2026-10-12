"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, Download, RefreshCw, X } from "lucide-react";
import styles from "./local-dubbing-section.module.css";

type Order = { id: string; status: string; total_amount_vnd: number; payment_code: string; expires_at: string };
type Account = {
  product: { price_vnd: number; is_active: boolean; metadata: { release_ready?: boolean } } | null;
  entitlement: { id: string; status: string } | null;
  release: { version: string } | null;
  orders: Order[];
  bank: { bank: string; account: string; name: string } | null;
};
const money = (amount: number) => new Intl.NumberFormat("vi-VN").format(amount);

export function DubbingKitCommerce() {
  const [account, setAccount] = useState<Account | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const buyButton = useRef<HTMLButtonElement>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/dubbing-kit/account", { cache: "no-store" });
    if (response.status === 401) {
      setAuthenticated(false);
      setAccount(null);
      setOrder(null);
      return;
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Chưa tải được thông tin mua hàng.");
    setAuthenticated(true);
    setAccount(data);
    setOrder(current => current ? data.orders.find((item: Order) => item.id === current.id) ?? current : null);
  }, []);

  useEffect(() => { void refresh().catch(reason => setError(reason.message)).finally(() => setLoading(false)); }, [refresh]);
  useEffect(() => {
    if (order?.status !== "PENDING") return;
    const timer = window.setInterval(() => void refresh().catch(reason => setError(reason.message)), 3000);
    return () => window.clearInterval(timer);
  }, [order?.status, refresh]);
  useEffect(() => { if (order && !dialog.current?.open) dialog.current?.showModal(); }, [order]);

  async function buy() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/dubbing-kit/order", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Chưa tạo được đơn hàng.");
      setOrder(data.order);
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Vui lòng thử lại."); }
    finally { setBusy(false); }
  }

  async function download() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      // Fetch the signed link without navigating away or saving an error page as a ZIP.
      const response = await fetch("/api/dubbing-kit/download");
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Chưa tải được bộ kit.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `Windi-Dubbing-Kit-${account?.release?.version ?? "latest"}.zip`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      setNotice("Đang tải bộ kit. Giải nén và đọc Hướng dẫn bắt đầu để cài đặt.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Vui lòng thử lại."); }
    finally { setBusy(false); }
  }

  const ready = account?.product?.is_active && account.product.metadata.release_ready && account.release && account.bank;
  const owned = account?.entitlement?.status === "active";
  const pending = account?.orders.find(item => item.status === "PENDING" && Date.parse(item.expires_at) > Date.now());
  const downloadButton = <button type="button" className={`kit-buy-button ${styles.buy}`} disabled={busy || !account?.release} onClick={() => void download()}><Download size={18} aria-hidden="true" />{busy ? "Đang tải…" : "Tải bộ kit Dubbing"}</button>;

  return <>
    <span className={styles.offerLabel}>BỘ KIT LỒNG TIẾNG VIỆT · BETA</span>
    <p className={styles.price}><span className={styles.only}>Thanh toán một lần</span><strong>{money(account?.product?.price_vnd ?? 169000)}<span>đ</span></strong></p>
    <p className={styles.offerCopy}>Nhận bộ công cụ lồng tiếng, giao diện sử dụng và hướng dẫn cài đặt. Dùng lại cho nhiều video trên máy của bạn.</p>
    <div className={styles.localNote}><strong>Bạn nhận được gì?</strong><span>Nhập video, sửa bản dịch, chọn giọng, nghe thử và xuất MP4 kèm phụ đề SRT.</span></div>
    {loading ? <button className={`kit-buy-button ${styles.buy}`} disabled>Đang kiểm tra…</button>
      : owned ? downloadButton
      : !authenticated ? <Link className={`kit-buy-button ${styles.buy}`} href="/login?next=%2Fvideo-kits%23local-dubbing">Đăng nhập để mua bộ kit</Link>
      : ready ? <button ref={buyButton} type="button" className={`kit-buy-button ${styles.buy}`} disabled={busy} onClick={() => void buy()}>{busy ? "Đang tạo đơn…" : pending ? "Tiếp tục thanh toán" : "Mua bộ kit Dubbing"}</button>
      : <button className={`kit-buy-button ${styles.buy}`} disabled>Đang chuẩn bị mở bán</button>}
    {owned ? <small className={styles.contactNote}>Bạn đã sở hữu bộ kit{account?.release ? ` · Bản ${account.release.version}` : ""}. Có thể quay lại đây để tải lại.</small>
      : <div className="kit-payment-promise"><strong>Thanh toán tự động 24/7</strong><small>Quét QR chuyển khoản. Quyền tải mở sau khi hệ thống xác nhận thanh toán.</small></div>}
    <small className={styles.contactNote}>Bán riêng với Video Workflow. Tài khoản AI và phí dịch vụ giọng đọc bên ngoài không nằm trong giá kit.</small>
    {notice && <p role="status" className={styles.contactNote}>{notice}</p>}
    {error && !order && <p className="kit-commerce-error" role="alert">{error}</p>}
    <dialog ref={dialog} className="kit-checkout" aria-label="Thanh toán Windi Dubbing Kit" onClose={() => { setOrder(null); buyButton.current?.focus(); }} onCancel={() => setOrder(null)}>
      {order && <>
        <header><strong>Thanh toán bộ kit Dubbing</strong><button type="button" aria-label="Đóng thanh toán" onClick={() => dialog.current?.close()}><X size={20} /></button></header>
        <div className="kit-checkout-body">
          {order.status === "PAID" ? <><CheckCircle2 size={38} aria-hidden="true" /><h3>Thanh toán thành công</h3><p>Bộ kit đã thuộc về tài khoản của bạn. Tải về để bắt đầu lồng tiếng.</p>{owned ? downloadButton : <p role="status">Đang cập nhật quyền tải…</p>}</>
            : order.status === "PENDING" && Date.parse(order.expires_at) > Date.now() && account?.bank ? <>
              <strong className="kit-checkout-price">{money(order.total_amount_vnd)}đ</strong>
              <div className="kit-payment-promise"><strong>Thanh toán tự động 24/7</strong><small>Trang tự cập nhật khi nhận được thanh toán.</small></div>
              <img src={`https://img.vietqr.io/image/${encodeURIComponent(account.bank.bank)}-${encodeURIComponent(account.bank.account)}-compact2.png?amount=${order.total_amount_vnd}&addInfo=${encodeURIComponent(order.payment_code)}&accountName=${encodeURIComponent(account.bank.name)}`} alt="Mã QR thanh toán bộ kit Dubbing" />
              <p>{account.bank.name}<br />{account.bank.bank} · {account.bank.account}</p>
              <button type="button" className="kit-payment-code" onClick={() => void navigator.clipboard.writeText(order.payment_code).then(() => setNotice("Đã sao chép nội dung chuyển khoản.")).catch(() => setError("Chưa sao chép được. Hãy nhập nội dung hiển thị bên trên."))}>{order.payment_code}<Copy size={16} aria-hidden="true" /></button>
              <small>Giữ đúng số tiền và nội dung. Đơn có hiệu lực 10 phút.</small>
            </> : <><h3>{order.status === "EXPIRED" || (order.status === "PENDING" && Date.parse(order.expires_at) <= Date.now()) ? "Đơn đã hết hạn" : "Thanh toán cần kiểm tra"}</h3><p>{order.status === "EXPIRED" || order.status === "PENDING" ? "Đóng cửa sổ và tạo đơn mới trước khi chuyển khoản." : "Số tiền hoặc thời điểm chuyển khoản chưa khớp. Liên hệ WindiStudio kèm mã đơn để được hỗ trợ."}</p><a className="text-link" href="https://www.facebook.com/profile.php?id=61594238790213" target="_blank" rel="noopener noreferrer">Nhận hỗ trợ từ WindiStudio →</a></>}
          {error && <p className="kit-commerce-error" role="alert">{error}</p>}
          {notice && <p role="status">{notice}</p>}
          <button type="button" className="kit-refresh-order" onClick={() => void refresh().catch(reason => setError(reason.message))}><RefreshCw size={16} aria-hidden="true" />Kiểm tra trạng thái</button>
        </div>
      </>}
    </dialog>
  </>;
}
