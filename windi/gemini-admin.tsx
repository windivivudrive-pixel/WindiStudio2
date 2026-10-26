'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, PackagePlus, RefreshCw } from 'lucide-react';
import type { GeminiAccount, GeminiOrder } from '@/lib/gemini/shared';
import styles from './gemini.module.css';
type AdminData = Omit<GeminiAccount, 'orders'> & {
  links: { id: string; valid_until: string; disabled: boolean; created_at: string }[];
  orders: (GeminiOrder & { user_id: string; activation_id: string | null })[];
};
export function GeminiAdmin() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [links, setLinks] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    const response = await fetch('/api/gemini/admin', { cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) throw new Error(response.status === 401 ? 'Đăng nhập bằng tài khoản quản trị WindiStudio để quản lý kho link.' : body.error || 'Chưa tải được kho link.');
    setData(body);
  }, []);
  useEffect(() => { void load().catch(reason => setError(reason.message)).finally(() => setLoading(false)); }, [load]);
  async function mutate(body: Record<string, unknown>) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/gemini/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Chưa lưu được thay đổi.');
      if (body.action === 'import') { setLinks(''); setNotice(`Đã nhập ${result.added} link mới; bỏ qua ${result.skipped} link đã có trong kho.`); }
      else setNotice(body.enabled ? 'Đã mở bán. Khách có thể tạo QR khi kho còn link hợp lệ.' : 'Đã tắt tạo đơn mới. Đơn đã tạo vẫn được xử lý thanh toán.');
      await load();
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }
  return <main className={`${styles.page} ${styles.admin}`}><Link href="/gemini" className={styles.secondary}><ArrowLeft size={16} aria-hidden="true" /> Trang bán Gemini</Link><h1>Kho link Gemini</h1><p>Nhập link thật đã kiểm tra, đặt hạn dùng và mở bán khi sẵn sàng. Giá cố định 150.000₫ / link.</p>
    {error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.notice} role="status">{notice}</p>}
    {loading ? <p role="status">Đang xác minh quyền quản trị…</p> : !data ? <><Link href="/login?next=%2Fgemini%2Fadmin" className={styles.primary}>Đăng nhập quản trị</Link><button className={styles.secondary} onClick={() => void load().catch(reason => setError(reason.message))}>Thử lại</button></> : <>
      <div className={styles.adminStats}><div><strong>{data.stock}</strong><span>Link sẵn sàng bán</span></div><div><strong>{data.enabled ? 'Đang mở' : 'Đang tắt'}</strong><span>Trạng thái bán hàng</span></div><div><strong>{data.bank ? 'Đã kết nối' : 'Chưa cấu hình'}</strong><span>Thanh toán QR</span></div></div>
      <form className={styles.adminForm} onSubmit={event => { event.preventDefault(); void mutate({ action: 'import', links, validUntil: validUntil ? new Date(validUntil).toISOString() : null }); }}><h2>Nhập link vào kho</h2><p>Mỗi dòng một link dạng https://one.google.com/offer/… Tối đa 500 link / lần. Link trùng sẽ được bỏ qua, kể cả link đã giao cho khách. Không nhập link mẫu hoặc link đã sử dụng.</p><label>Danh sách link<textarea required value={links} onChange={event => setLinks(event.target.value)} placeholder="Mỗi dòng một link kích hoạt Google One" spellCheck={false} autoComplete="off" /></label><label>Hạn kích hoạt của lô link (giờ trên thiết bị của bạn)<input required type="datetime-local" value={validUntil} onChange={event => setValidUntil(event.target.value)} /></label><p>Hạn này là hạn sử dụng link, không phải ngày kết thúc 3 tháng của khách. Kho tự loại link hết hạn khỏi đơn mới.</p><button type="submit" disabled={busy || !links.trim() || !validUntil} className={styles.primary}><PackagePlus size={18} aria-hidden="true" />{busy ? 'Đang nhập…' : 'Nhập kho link'}</button></form>
      <section className={styles.adminForm}><h2>Mở bán</h2><p>Kiểm tra trước một link của lô hàng trên tài khoản đủ điều kiện: đúng ưu đãi 3 tháng, đúng chương trình, hạn và số tiền 0₫. Link đã dùng để kiểm tra kích hoạt không được nhập kho.</p><label className={styles.accept}><input type="checkbox" checked={verified} onChange={event => setVerified(event.target.checked)} /><span>Tôi đã xác minh điều kiện ưu đãi của lô link và có quyền phân phối các link này.</span></label><div className={styles.adminActions}><button className={styles.primary} disabled={busy || data.enabled || !verified || data.stock < 1 || !data.bank} onClick={() => void mutate({ action: 'settings', enabled: true, verifiedOffer: verified })}>Mở bán 150.000₫</button><button className={styles.secondary} disabled={busy || !data.enabled} onClick={() => void mutate({ action: 'settings', enabled: false })}>Tắt tạo đơn mới</button></div></section>
      <button className={styles.secondary} disabled={busy} onClick={() => void load().catch(reason => setError(reason.message))}><RefreshCw size={16} aria-hidden="true" /> Cập nhật kho và đơn</button>
      <div className={styles.tableWrap}><table><caption>100 đơn gần nhất</caption><thead><tr><th>Mã thanh toán</th><th>Trạng thái</th><th>Giá</th><th>Tạo lúc</th><th>Mã người mua</th></tr></thead><tbody>{data.orders.map(order => <tr key={order.id}><td>{order.payment_code}</td><td>{order.status}</td><td>{order.amount_vnd.toLocaleString('vi-VN')}₫</td><td>{new Date(order.created_at).toLocaleString('vi-VN')}</td><td>{order.user_id}</td></tr>)}{!data.orders.length && <tr><td colSpan={5}>Chưa có đơn hàng.</td></tr>}</tbody></table></div>
      <div className={styles.tableWrap}><table><caption>100 link nhập gần nhất</caption><thead><tr><th>Mã kho</th><th>Hạn kích hoạt</th><th>Trạng thái</th></tr></thead><tbody>{data.links.map(link => <tr key={link.id}><td>{link.id.slice(0, 8)}</td><td>{new Date(link.valid_until).toLocaleString('vi-VN')}</td><td>{link.disabled ? 'Đã khóa' : Date.parse(link.valid_until) <= Date.now() ? 'Hết hạn' : 'Còn hạn (có thể đã được giữ/giao)'}</td></tr>)}{!data.links.length && <tr><td colSpan={3}>Kho chưa có link.</td></tr>}</tbody></table></div>
    </>}
  </main>;
}
