import { beforeEach, describe, expect, it, vi } from 'vitest';
import { maskPurchaseEmail, purchaseProductTitle } from '../lib/gemini/recent-purchases';

describe('public purchase formatting', () => {
  it('shows at most eight characters and always hides part of the local address', () => {
    expect(maskPurchaseEmail('luongngan@example.com')).toBe('luongnga******@example.com');
    expect(maskPurchaseEmail('short@example.com')).toBe('shor******@example.com');
    expect(maskPurchaseEmail('a@example.com')).toBe('******@example.com');
    expect(maskPurchaseEmail('not-an-email')).toBeNull();
  });

  it('labels Gemini durations and preserves other purchased product titles', () => {
    expect(purchaseProductTitle('gemini-managed-24m', 'Nâng chính chủ', 24)).toBe('Gemini dài hạn 24 tháng');
    expect(purchaseProductTitle('gemini-3m', '', 3)).toBe('Gemini 3 tháng');
    expect(purchaseProductTitle('other', '  Sản phẩm khác  ', 1)).toBe('Sản phẩm khác');
  });
});

const mock = vi.hoisted(() => {
  const query = { select: vi.fn(), eq: vi.fn(), neq: vi.fn(), not: vi.fn(), order: vi.fn(), limit: vi.fn() };
  for (const method of ['select', 'eq', 'neq', 'not', 'order'] as const) query[method].mockReturnValue(query);
  return { query, getUserById: vi.fn() };
});
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/voice/server', () => ({ writer: () => ({ from: () => mock.query, auth: { admin: { getUserById: mock.getUserById } } }) }));

describe('public recent purchases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.query.limit.mockResolvedValue({ data: [
      { user_id: 'customer-1', product_sku: 'gemini-3m', product_title: 'Gemini', duration_months: 3 },
      { user_id: 'customer-2', product_sku: 'gemini-managed-24m', product_title: '', duration_months: 24 },
    ], error: null });
    mock.getUserById.mockImplementation(async (id: string) => ({ data: { user: { email: id === 'customer-1' ? 'abcdefghijk@gmail.com' : null } }, error: null }));
  });

  it('selects paid orders and returns only masked public fields', async () => {
    const { publicRecentPurchases } = await import('../lib/gemini/public-purchases');
    expect(await publicRecentPurchases()).toEqual([{ email: 'abcdefgh******@gmail.com', product: 'Gemini 3 tháng' }]);
    expect(mock.query.eq).toHaveBeenCalledWith('status', 'PAID');
    expect(mock.query.not).toHaveBeenCalledWith('user_id', 'is', null);
  });

  it('keeps the shop usable when the purchase query fails', async () => {
    mock.query.limit.mockResolvedValue({ data: null, error: new Error('database unavailable') });
    const { publicRecentPurchases } = await import('../lib/gemini/public-purchases');
    expect(await publicRecentPurchases()).toEqual([]);
  });

  it('uses eight newest valid purchases when they already contain two product kinds', async () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({ user_id: `id-${index}`, product_sku: index === 3 ? 'gemini-managed-24m' : 'gemini-3m', product_title: '', duration_months: index === 3 ? 24 : 3 }));
    mock.query.limit.mockResolvedValue({ data: rows, error: null });
    mock.getUserById.mockImplementation(async (id: string) => ({ data: { user: { email: `${id}@example.com` } }, error: null }));
    const { publicRecentPurchases } = await import('../lib/gemini/public-purchases');
    const purchases = await publicRecentPurchases();
    expect(purchases).toHaveLength(8);
    expect(purchases[3].product).toBe('Gemini dài hạn 24 tháng');
    expect(mock.query.limit).toHaveBeenCalledTimes(1);
  });

  it('replaces the eighth purchase with the newest different product when needed', async () => {
    const rows = Array.from({ length: 20 }, (_, index) => ({ user_id: `id-${index}`, product_sku: 'gemini-3m', product_title: '', duration_months: 3 }));
    mock.query.limit.mockResolvedValueOnce({ data: rows, error: null }).mockResolvedValueOnce({ data: [{ user_id: 'other', product_sku: 'gemini-managed-24m', product_title: '', duration_months: 24 }], error: null });
    mock.getUserById.mockImplementation(async (id: string) => ({ data: { user: { email: `${id}@example.com` } }, error: null }));
    const { publicRecentPurchases } = await import('../lib/gemini/public-purchases');
    const purchases = await publicRecentPurchases();
    expect(purchases).toHaveLength(8);
    expect(purchases[7].product).toBe('Gemini dài hạn 24 tháng');
    expect(mock.query.neq).toHaveBeenCalledWith('product_sku', 'gemini-3m');
  });

  it('keeps the newest eight if no other product exists', async () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({ user_id: `id-${index}`, product_sku: 'gemini-3m', product_title: '', duration_months: 3 }));
    mock.query.limit.mockResolvedValueOnce({ data: rows, error: null }).mockResolvedValueOnce({ data: [], error: null });
    mock.getUserById.mockImplementation(async (id: string) => ({ data: { user: { email: `${id}@example.com` } }, error: null }));
    const { publicRecentPurchases } = await import('../lib/gemini/public-purchases');
    expect(await publicRecentPurchases()).toHaveLength(8);
  });
});
