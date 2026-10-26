import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, expect, test } from 'vitest';

let db: PGlite;
const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const charlie = '33333333-3333-4333-8333-333333333333';
type Order = { id: string; activation_id: string | null; payment_code: string; status: string; paid_at: string | null };
async function checkout(user = alice) { return (await db.query<Order>('select * from public.windi_gemini_order($1)', [user])).rows[0]; }
async function pay(order: Order, gateway: string, amount = 150000, time?: string) {
  return (await db.query<{ result: string }>('select public.windi_gemini_pay($1,$2,$3,coalesce($4::timestamptz,now())) as result', [order.payment_code, gateway, amount, time || null])).rows[0].result;
}
async function seed(prefix: string, n = 1) {
  const links = Array.from({ length: n }, (_, i) => `https://one.google.com/offer/${prefix}LINK${String(i).padStart(5, '0')}`);
  await db.query("select public.windi_gemini_import($1::text[],now()+interval '10 days')", [links]);
  return links;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    alter default privileges grant all on tables to anon,authenticated;
    insert into auth.users values('${alice}'),('${bob}'),('${charlie}');`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261026151540_gemini_activation_commerce.sql', import.meta.url), 'utf8'));
}, 20000);
afterAll(async () => { await db?.close(); });

test('new product is closed and empty; invalid inventory is rejected atomically', async () => {
  expect((await db.query('select enabled,price_vnd from public.windi_gemini_settings')).rows[0]).toEqual({ enabled: false, price_vnd: 150000 });
  await expect(checkout()).rejects.toThrow('GEMINI_DISABLED');
  await expect(db.query("select public.windi_gemini_import(array['https://evil.example/12345678'],now()+interval '1 day')")).rejects.toThrow();
  expect((await db.query('select * from public.windi_gemini_links')).rows).toHaveLength(0);
  await expect(db.query("select public.windi_gemini_import(array['https://one.google.com/offer/VALIDLINK0001'],now()-interval '1 day')")).rejects.toThrow('INVALID_STOCK');
  await db.exec('update public.windi_gemini_settings set enabled=true');
});
test('checkout reserves unique stock, reuses pending order and refuses overselling', async () => {
  await seed('FIRST', 2);
  const a = await checkout(alice), b = await checkout(bob);
  expect(a.activation_id).not.toBe(b.activation_id);
  expect((await checkout(alice)).id).toBe(a.id);
  expect(a.payment_code).toMatch(/^WINDI G[A-F0-9]{8}$/);
  await expect(checkout(charlie)).rejects.toThrow('GEMINI_OUT_OF_STOCK');
  expect((await db.query('select public.windi_gemini_stock() as stock')).rows[0]).toEqual({ stock: 0 });
});
test('exact payment delivers once; repeated callbacks cannot spend or overwrite another order', async () => {
  const a = await checkout(alice), b = await checkout(bob);
  expect(await pay(a, 'gateway-1')).toBe('paid');
  expect(await pay(a, 'gateway-1')).toBe('paid');
  expect(await pay(b, 'gateway-1')).toBe('ignored');
  const rows = (await db.query<Order>('select * from public.windi_gemini_orders where id=$1', [a.id])).rows;
  expect(rows[0].status).toBe('PAID'); expect(rows[0].paid_at).toBeTruthy();
  expect(await pay(a, 'gateway-extra')).toBe('review');
  expect((await db.query<Order>('select status from public.windi_gemini_orders where id=$1', [a.id])).rows[0].status).toBe('PAID');
});
test('underpayments hold inventory for review and never unlock download', async () => {
  const b = await checkout(bob);
  expect(await pay(b, 'gateway-short', 149999)).toBe('underpaid');
  expect(await pay(b, 'gateway-short', 150000)).toBe('underpaid');
  const row = (await db.query<Order>('select * from public.windi_gemini_orders where id=$1', [b.id])).rows[0];
  expect(row.status).toBe('UNDERPAID'); expect(row.paid_at).toBeNull(); expect(row.activation_id).toBe(b.activation_id);
});
test('expiry releases the reserved link; late payment cannot deliver the reassigned link', async () => {
  await seed('EXPIRY');
  const old = await checkout(charlie);
  await db.query("update public.windi_gemini_orders set expires_at=now()-interval '1 second' where id=$1", [old.id]);
  const fresh = await checkout(alice);
  expect(fresh.activation_id).toBe(old.activation_id);
  expect(await pay(old, 'gateway-late')).toBe('review');
  const row = (await db.query<Order>('select * from public.windi_gemini_orders where id=$1', [old.id])).rows[0];
  expect(row.activation_id).toBeNull(); expect(row.status).toBe('REVIEW_REQUIRED');
  expect(await pay(fresh, 'gateway-reassigned')).toBe('paid');
});
test('overpayment and stale transaction timestamps never grant a link', async () => {
  await seed('REVIEW', 2);
  const a = await checkout(alice), c = await checkout(charlie);
  expect(await pay(a, 'gateway-over', 150001)).toBe('overpaid');
  expect(await pay(c, 'gateway-stale', 150000, '2020-01-01T00:00:00Z')).toBe('review');
});
test('duplicate imports do not resell links; expired inventory is excluded', async () => {
  const [url] = await seed('DEDUP');
  const result = await db.query<{ count: number }>("select public.windi_gemini_import($1::text[],now()+interval '1 day') as count", [[url, url]]);
  expect(result.rows[0].count).toBe(0);
  await db.query('update public.windi_gemini_links set valid_until=now() where activation_url=$1', [url]);
  await expect(checkout()).rejects.toThrow('GEMINI_OUT_OF_STOCK');
});
test('RLS and explicit grants block all client roles, including default-grant environments', async () => {
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    for (const table of ['settings', 'links', 'orders', 'payment_events']) {
      await expect(db.query(`select * from public.windi_gemini_${table}`)).rejects.toThrow(/permission denied/);
    }
    await expect(db.query('select public.windi_gemini_stock()')).rejects.toThrow(/permission denied/);
    await expect(checkout()).rejects.toThrow(/permission denied/);
    await db.exec('reset role');
  }
  const rls = await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where relname in ('windi_gemini_settings','windi_gemini_links','windi_gemini_orders','windi_gemini_payment_events')");
  expect(rls.rows).toHaveLength(4); expect(rls.rows.every(row => row.relrowsecurity)).toBe(true);
  await db.exec('set role service_role');
  expect((await db.query('select * from public.windi_gemini_settings')).rows).toHaveLength(1);
  await db.exec('reset role');
});
