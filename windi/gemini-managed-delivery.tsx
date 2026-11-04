'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { GeminiOrder } from '@/lib/gemini/shared';
import styles from './gemini.module.css';

export function GeminiManagedDelivery({ order }: { order: GeminiOrder }) {
  const [copied,setCopied] = useState(false);
  return <div className={styles.managedDelivery}>
    <strong>{order.activation_url ? 'Đã thanh toán · Mã của bạn' : 'Đã thanh toán · Liên hệ admin để nhận sản phẩm'}</strong>
    {order.activation_url && <><p><code>{order.activation_url}</code></p><button className={styles.secondary} type="button" onClick={() => void navigator.clipboard.writeText(order.activation_url!).then(() => setCopied(true)).catch(() => setCopied(false))}>{copied ? 'Đã sao chép' : 'Sao chép mã'}</button></>}
    <p hidden={!!order.activation_url}>Gửi mã đơn <b>{order.payment_code}</b> cho admin để được bàn giao {order.product_title || `gói ${order.duration_months} tháng`}.</p>
    {order.product_sku?.startsWith('gemini-managed-') && <div style={{ marginBottom: '14px' }}><Link href="/cua-hang/gemini-dai-han/huong-dan-dung-ma" target="_blank" className={styles.secondary}>Hướng dẫn dùng mã tự nâng cấp →</Link></div>}
    <div style={{ marginBottom: '14px' }}>
      <Link href="/cua-hang/gemini-dai-han/huong-dan-2fa" target="_blank" className={styles.secondary} style={{ display: 'inline-flex', fontSize: '11px', padding: '8px 12px', borderColor: '#4285f4', color: '#9bc4ff', width: '100%', justifyContent: 'center' }}>
        📖 Xem hướng dẫn lấy 2FA &amp; Backup Code →
      </Link>
    </div>
    <div className={styles.managedContacts}><a className={styles.primary} href="https://zalo.me/0777493267" target="_blank" rel="noopener noreferrer">Zalo 0777 493 267</a><a className={styles.secondary} href="https://www.tiktok.com/@windistudiovn" target="_blank" rel="noopener noreferrer">TikTok @windistudiovn</a></div>
  </div>;
}
