import Link from 'next/link';
import type { GeminiOrder } from '@/lib/gemini/shared';
import styles from './gemini.module.css';

export function GeminiManagedDelivery({ order }: { order: GeminiOrder }) {
  return <div className={styles.managedDelivery}>
    <strong>Đã thanh toán · Liên hệ admin để nhận sản phẩm</strong>
    <p>Gửi mã đơn <b>{order.payment_code}</b> cho admin để được bàn giao {order.product_title || `gói ${order.duration_months} tháng`}.</p>
    <div style={{ marginBottom: '14px' }}>
      <Link href="/cua-hang/gemini-dai-han/huong-dan-2fa" target="_blank" className={styles.secondary} style={{ display: 'inline-flex', fontSize: '11px', padding: '8px 12px', borderColor: '#4285f4', color: '#9bc4ff', width: '100%', justifyContent: 'center' }}>
        📖 Xem hướng dẫn lấy 2FA &amp; Backup Code gửi Admin →
      </Link>
    </div>
    <div className={styles.managedContacts}><a className={styles.primary} href="https://zalo.me/0777493267" target="_blank" rel="noopener noreferrer">Zalo 0777 493 267</a><a className={styles.secondary} href="https://www.tiktok.com/@windistudiovn" target="_blank" rel="noopener noreferrer">TikTok @windistudiovn</a></div>
  </div>;
}
