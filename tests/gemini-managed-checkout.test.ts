import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, expect, test } from 'vitest';

let db: PGlite;
const user = '11111111-1111-4111-8111-111111111111';
type Order = { id: string; payment_code: string; activation_id: string | null; amount_vnd: number; status: string };
const order = async (sku: string) => (await db.query<Order>('select * from public.windi_gemini_order($1,$2)', [user, sku])).rows[0];
const settings = (sku: string, enabled: boolean) => db.query('select public.windi_gemini_product_settings($1,$2)', [sku, enabled]);
const pay = async (o: Order, gateway: string, amount = o.amount_vnd) => (await db.query<{ result: string }>('select public.windi_gemini_pay($1,$2,$3,now()) as result', [o.payment_code, gateway, amount])).rows[0].result;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); insert into auth.users values('${user}');`);
  for (const migration of ['20261026151540_gemini_activation_commerce', '20261027003556_gemini_product_variants', '20261027041208_gemini_five_minute_reservations', '20261102100145_gemini_3m_sale_price', '20261103133204_gemini_managed_checkout']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${migration}.sql`, import.meta.url), 'utf8'));
  }
}, 30000);
afterAll(async () => { await db?.close(); });

test('manual variants start closed, enforce each price, reuse checkout and settle once without inventory', async () => {
  for (const [sku, price] of [['gemini-managed-6m', 189000], ['gemini-managed-12m', 329000], ['gemini-managed-24m', 599000]] as const) {
    await expect(order(sku)).rejects.toThrow('GEMINI_DISABLED');
    await settings(sku, true);
    const o = await order(sku);
    expect(o.amount_vnd).toBe(price);
    expect(o.activation_id).toBeNull();
    expect((await order(sku)).id).toBe(o.id);
    expect(await pay(o, sku)).toBe('paid');
    expect(await pay(o, sku)).toBe('paid');
    await settings(sku, false);
    expect((await db.query<{ status: string }>('select status from public.windi_gemini_orders where id=$1', [o.id])).rows[0].status).toBe('PAID');
  }
});
test('switching off invalidates pending QR and late payment goes to review', async () => {
  const sku = 'gemini-managed-6m';
  await settings(sku, true);
  const o = await order(sku);
  await settings(sku, false);
  await expect(order(sku)).rejects.toThrow('GEMINI_DISABLED');
  expect(await pay(o, 'disabled-qr')).toBe('review');
});
test('wrong amount cannot unlock manual fulfillment; existing link products still require inventory', async () => {
  await settings('gemini-managed-12m', true);
  const o = await order('gemini-managed-12m');
  expect(await pay(o, 'short', 1)).toBe('underpaid');
  await db.exec("update public.windi_gemini_products set enabled=true where sku='gemini-3m'");
  await expect(order('gemini-3m')).rejects.toThrow('GEMINI_OUT_OF_STOCK');
  await expect(db.exec(`set role anon; select public.windi_gemini_product_settings('gemini-managed-6m',true)`)).rejects.toThrow('permission denied');
  await db.exec('reset role');
});
