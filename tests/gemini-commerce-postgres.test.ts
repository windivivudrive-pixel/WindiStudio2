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
  await db.exec(await readFile(new URL('../supabase/migrations/20261027003556_gemini_product_variants.sql', import.meta.url), 'utf8'));
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
    for (const table of ['settings', 'products', 'links', 'orders', 'payment_events']) {
      await expect(db.query(`select * from public.windi_gemini_${table}`)).rejects.toThrow(/permission denied/);
    }
    await expect(db.query('select public.windi_gemini_stock()')).rejects.toThrow(/permission denied/);
    await expect(checkout()).rejects.toThrow(/permission denied/);
    await db.exec('reset role');
  }
  const rls = await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where relname in ('windi_gemini_settings','windi_gemini_products','windi_gemini_links','windi_gemini_orders','windi_gemini_payment_events')");
  expect(rls.rows).toHaveLength(5); expect(rls.rows.every(row => row.relrowsecurity)).toBe(true);
  await db.exec('set role service_role');
  expect((await db.query('select * from public.windi_gemini_settings')).rows).toHaveLength(1);
  await db.exec('reset role');
});

test('18-month catalog stays separate from legacy 3-month inventory and pricing', async () => {
  const initial = await db.query<{sku:string;price_vnd:number;duration_months:number;enabled:boolean;stock:number}>('select * from public.windi_gemini_catalog()');
  expect(initial.rows.map(p => [p.sku,p.duration_months,p.price_vnd])).toEqual([['gemini-3m',3,150000],['gemini-18m',18,49000]]);
  expect(initial.rows[1].enabled).toBe(false);
  await expect(db.query('select * from public.windi_gemini_order($1,$2)',[alice,'gemini-18m'])).rejects.toThrow('GEMINI_DISABLED');
  await db.query("select public.windi_gemini_import($1::text[],now()+interval '10 days','gemini-18m')",[[
    'https://one.google.com/offer/EIGHTEENLINK001','https://one.google.com/offer/EIGHTEENLINK002','https://one.google.com/offer/EIGHTEENLINK003',
  ]]);
  expect((await db.query<{stock:number}>("select public.windi_gemini_stock('gemini-18m') as stock")).rows[0].stock).toBe(3);
  expect((await db.query<{stock:number}>("select public.windi_gemini_stock() as stock")).rows[0].stock).toBe(0);
  await db.query("select public.windi_gemini_product_settings('gemini-18m',true)");
});
test('one buyer can reserve both products; SKU, duration and exact price cannot be forged', async () => {
  await seed('DUAL',2);
  const three = await checkout(alice);
  const eighteen = (await db.query<Order & {product_sku:string;duration_months:number;amount_vnd:number;terms_version:string}>('select * from public.windi_gemini_order($1,$2)',[alice,'gemini-18m'])).rows[0];
  expect(eighteen.amount_vnd).toBe(49000);expect(eighteen.duration_months).toBe(18);expect(eighteen.product_sku).toBe('gemini-18m');
  expect(eighteen.terms_version).toBe('gemini-18m-2026-10-27');expect(eighteen.id).not.toBe(three.id);expect(eighteen.activation_id).not.toBe(three.activation_id);
  expect((await db.query<Order>('select * from public.windi_gemini_order($1,$2)',[alice,'gemini-18m'])).rows[0].id).toBe(eighteen.id);
  await expect(db.query('update public.windi_gemini_orders set amount_vnd=1 where id=$1',[eighteen.id])).rejects.toThrow(/check constraint/);
  await expect(db.query('update public.windi_gemini_orders set duration_months=3 where id=$1',[eighteen.id])).rejects.toThrow(/check constraint/);
  const unassigned=(await db.query<{id:string}>("select l.id from public.windi_gemini_links l where product_sku='gemini-3m' and not exists(select 1 from public.windi_gemini_orders o where o.activation_id=l.id) and valid_until>now() limit 1")).rows[0];
  await expect(db.query('update public.windi_gemini_orders set activation_id=$1 where id=$2',[unassigned.id,eighteen.id])).rejects.toThrow(/foreign key/);
  expect(await pay(eighteen,'gateway-18-paid',49000)).toBe('paid');
  expect(await pay(eighteen,'gateway-18-paid',49000)).toBe('paid');
  expect(await pay(three,'gateway-18-paid',150000)).toBe('ignored');
});
test('18-month overpayments are held for review and expiry cannot release another product', async () => {
  const over=(await db.query<Order>('select * from public.windi_gemini_order($1,$2)',[bob,'gemini-18m'])).rows[0];
  expect(await pay(over,'gateway-18-over',150000)).toBe('overpaid');
  const old=(await db.query<Order>('select * from public.windi_gemini_order($1,$2)',[charlie,'gemini-18m'])).rows[0];
  const threeBefore=(await db.query<{stock:number}>("select public.windi_gemini_stock('gemini-3m') as stock")).rows[0].stock;
  await db.query("update public.windi_gemini_orders set expires_at=now()-interval '1 second' where id=$1",[old.id]);
  expect((await db.query<{stock:number}>("select public.windi_gemini_stock('gemini-18m') as stock")).rows[0].stock).toBe(1);
  expect((await db.query<{stock:number}>("select public.windi_gemini_stock('gemini-3m') as stock")).rows[0].stock).toBe(threeBefore);
  const next=(await db.query<Order>('select * from public.windi_gemini_order($1,$2)',[charlie,'gemini-18m'])).rows[0];
  expect(next.activation_id).toBe(old.activation_id);expect(await pay(old,'gateway-18-late',49000)).toBe('review');
  const duplicate=await db.query<{added:number}>("select public.windi_gemini_import($1::text[],now()+interval '10 days','gemini-3m') as added",[['https://one.google.com/offer/EIGHTEENLINK001']]);
  expect(duplicate.rows[0].added).toBe(0);
});
test('variant RPCs and product table stay inaccessible to client roles', async () => {
  for(const role of ['anon','authenticated']) {
    await db.exec(`set role ${role}`);
    await expect(db.query('select * from public.windi_gemini_products')).rejects.toThrow(/permission denied/);
    await expect(db.query('select * from public.windi_gemini_catalog()')).rejects.toThrow(/permission denied/);
    await expect(db.query("select public.windi_gemini_stock('gemini-18m')")).rejects.toThrow(/permission denied/);
    await expect(db.query("select public.windi_gemini_product_settings('gemini-18m',true)")).rejects.toThrow(/permission denied/);
    await db.exec('reset role');
  }
});

test('upgrading preserves an existing paid 3-month order, inventory URL and sale state', async () => {
  const upgrade = new PGlite();
  try {
    await upgrade.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${alice}');`);
    await upgrade.exec(await readFile(new URL('../supabase/migrations/20261026151540_gemini_activation_commerce.sql', import.meta.url),'utf8'));
    await upgrade.exec("update public.windi_gemini_settings set enabled=true;select public.windi_gemini_import(array['https://one.google.com/offer/LEGACYPRESERVED001'],now()+interval '10 days');");
    const old=(await upgrade.query<Order>('select * from public.windi_gemini_order($1)',[alice])).rows[0];
    await upgrade.query('select public.windi_gemini_pay($1,$2,150000,now())',[old.payment_code,'legacy-paid']);
    await upgrade.exec(await readFile(new URL('../supabase/migrations/20261027003556_gemini_product_variants.sql', import.meta.url),'utf8'));
    const row=(await upgrade.query<Order & {product_sku:string;duration_months:number;amount_vnd:number}>('select * from public.windi_gemini_orders where id=$1',[old.id])).rows[0];
    expect(row).toMatchObject({id:old.id,activation_id:old.activation_id,status:'PAID',product_sku:'gemini-3m',duration_months:3,amount_vnd:150000});
    const products=(await upgrade.query<{sku:string;enabled:boolean}>('select sku,enabled from public.windi_gemini_products order by duration_months')).rows;
    expect(products).toEqual([{sku:'gemini-3m',enabled:true},{sku:'gemini-18m',enabled:false}]);
    expect((await upgrade.query<{activation_url:string}>('select activation_url from public.windi_gemini_links where id=$1',[old.activation_id])).rows[0].activation_url).toBe('https://one.google.com/offer/LEGACYPRESERVED001');
  } finally {await upgrade.close();}
},20000);
