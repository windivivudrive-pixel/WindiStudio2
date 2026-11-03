'use client';

import Link from 'next/link';
import { GEMINI_PRODUCTS, isManagedGemini, type GeminiSku, type GeminiAccount } from '@/lib/gemini/shared';
import { CheckCircle2 } from 'lucide-react';
import styles from './gemini.module.css';

const plans = GEMINI_PRODUCTS.filter(item => isManagedGemini(item.sku));

export function GeminiManagedOffer({ sku, onSelect, account, busy, accepted, onAccept, onBuy }: { sku: GeminiSku; onSelect: (sku: GeminiSku) => void; account: GeminiAccount | null; busy: boolean; accepted: boolean; onAccept: (value: boolean) => void; onBuy: () => void }) {
  const plan = plans.find(item => item.sku === sku) || plans[0];
  const available = account?.products.find(item => item.sku === plan.sku)?.enabled === true;
  const ready = !!account?.bank && available;
  return <section className={styles.managedOffer} aria-label="Gemini Pro nâng chính chủ">
    <div className={styles.managedVisual}><img src="/gemini-products/gemini-chinh-chu.png" alt="Gemini Pro nâng chính chủ 6, 12, 24 tháng, kèm 1 tháng YouTube Premium" /><span>ADMIN HỖ TRỢ NÂNG CẤP</span></div>
    <div className={styles.managedDetails}>
      <span className={styles.eyebrow}>GEMINI PRO · NÂNG CHÍNH CHỦ</span>
      <h2>Chọn thời hạn.<br />Admin lo nâng cấp.</h2>
      <p>Nâng trực tiếp trên tài khoản Google của bạn, kèm <strong>1 tháng YouTube Premium</strong>. Thanh toán QR để đăng ký nâng cấp.</p>
      <fieldset className={styles.managedPlans}><legend>Thời hạn gói</legend>{plans.map(item => <label key={item.durationMonths} className={sku === item.sku ? styles.managedSelected : ''}><input type="radio" name="managed-months" checked={sku === item.sku} onChange={() => onSelect(item.sku)} /><strong>{item.durationMonths} tháng</strong><span>{item.price.toLocaleString('vi-VN')}₫</span></label>)}</fieldset>
      <div className={styles.managedPrice} aria-live="polite">{plan.price.toLocaleString('vi-VN')}<span>₫ / {plan.durationMonths} tháng</span></div>
      <div className={styles.managedPreparation}><strong>CHUẨN BỊ TRƯỚC KHI NÂNG</strong><h3>Ưu tiên tạo tài khoản Google mới.</h3><p>Cần chuẩn bị <b>email, mật khẩu và thông tin xác thực 2FA</b> để hệ thống thực hiện nâng cấp.</p></div>
      <label className={styles.accept}><input type="checkbox" checked={accepted} onChange={event => onAccept(event.target.checked)} /><span>Tôi đã đọc và hiểu cần chuẩn bị email, mật khẩu và 2FA để hệ thống thực hiện nâng cấp.</span></label>
      {!available ? <button className={styles.primary} disabled>Hết hàng</button> : !account?.bank ? <button className={styles.primary} disabled>Thanh toán chưa sẵn sàng</button> : !account.authenticated ? <Link className={styles.primary} href="/login?next=%2Fcua-hang">Đăng nhập để thanh toán</Link> : <button className={styles.primary} disabled={busy || !accepted || !ready} onClick={onBuy}>{busy ? 'Đang tạo đơn…' : `Thanh toán QR · ${plan.price.toLocaleString('vi-VN')}₫`}</button>}
    </div>
    <div className={styles.managedNotes}><h3>Chuẩn bị trước khi nâng</h3><p><strong>Ưu tiên tạo tài khoản Google mới.</strong> Cần chuẩn bị email, mật khẩu và thông tin xác thực 2FA để hệ thống thực hiện nâng cấp.</p><p>Sau khi bàn giao, đổi mật khẩu và cập nhật lại phương thức xác thực 2FA để bảo vệ tài khoản.</p><details><summary>Hướng dẫn chuẩn bị 2FA</summary><p>Hướng dẫn chuẩn bị 2FA phù hợp với tài khoản sẽ được cung cấp sau khi thanh toán thành công.</p></details></div>
    <div className={styles.managedProcess}><h3>Cách nâng chính chủ</h3>{['Chọn gói, đọc thông tin cần chuẩn bị và thanh toán bằng QR trên website.', 'Sau khi thanh toán thành công, xem hướng dẫn trong đơn hàng.', 'Admin nâng cấp và bàn giao. Đăng nhập kiểm tra thời hạn Gemini Pro và ưu đãi YouTube Premium.'].map((step, index) => <p key={step}><CheckCircle2 size={18} aria-hidden="true" /><span><strong>0{index + 1}</strong> {step}</span></p>)}</div>
  </section>;
}
