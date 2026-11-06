'use client';

import { useState } from 'react';
import type { RecentPurchase } from '@/lib/gemini/recent-purchases';
import styles from './gemini.module.css';

export function RecentPurchases({ purchases }: { purchases: RecentPurchase[] }) {
  const [paused, setPaused] = useState(false);
  if (!purchases.length) return null;

  const items = (duplicate = false) => <div className={styles.purchaseTickerGroup} aria-hidden={duplicate || undefined}>
    {purchases.map((purchase, index) => <span className={styles.purchaseTickerItem} key={index}>
      <span className={styles.purchaseTickerDot} aria-hidden="true">✦</span>
      <span><strong>{purchase.email}</strong> đã mua {purchase.product}</span>
    </span>)}
  </div>;

  return <aside className={styles.purchaseTicker} aria-label="Khách hàng đã mua">
    <div className={styles.purchaseTickerViewport}>
      <div className={styles.purchaseTickerTrack} style={{ animationPlayState: paused ? 'paused' : 'running' }}>
        {items()}{items(true)}
      </div>
    </div>
    <button className={styles.purchaseTickerToggle} type="button" onClick={() => setPaused(!paused)} aria-label={paused ? 'Tiếp tục chạy thông báo mua hàng' : 'Tạm dừng thông báo mua hàng'}>{paused ? '▶' : 'Ⅱ'}</button>
  </aside>;
}
