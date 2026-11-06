export type RecentPurchase = { email: string; product: string };

// Always hide at least one character of the local part, even for short emails.
export function maskPurchaseEmail(email: string | null | undefined): string | null {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const [local, domain] = email.split('@');
  return `${Array.from(local).slice(0, Math.min(8, Math.max(0, Array.from(local).length - 1))).join('')}******@${domain}`;
}

export function purchaseProductTitle(sku: string, title: string, months: number): string {
  if (sku === 'gemini-3m') return 'Gemini 3 tháng';
  if (/^gemini-managed-(6|12|24)m$/.test(sku)) return `Gemini dài hạn ${months} tháng`;
  return title.trim();
}
