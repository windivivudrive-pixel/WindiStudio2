import type { GeminiOrder } from '@/lib/gemini/shared';
import styles from './gemini.module.css';

export function GeminiManagedDelivery({ order }: { order: GeminiOrder }) {
  return <div className={styles.managedDelivery}>
    <strong>Đã thanh toán · Liên hệ admin để nhận mã</strong>
    <p>Gửi mã đơn <b>{order.payment_code}</b> cho admin để nhận mã và được hỗ trợ nâng chính chủ {order.duration_months} tháng.</p>
    <div className={styles.managedContacts}><a className={styles.primary} href="https://zalo.me/0777493267" target="_blank" rel="noopener noreferrer">Zalo 0777 493 267</a><a className={styles.secondary} href="https://www.tiktok.com/@windistudiovn" target="_blank" rel="noopener noreferrer">TikTok @windistudiovn</a></div>
  </div>;
}
