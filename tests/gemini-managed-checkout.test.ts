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
  for (const migration of ['20261026151540_gemini_activation_commerce', '20261027003556_gemini_product_variants', '20261027041208_gemini_five_minute_reservations', '20261102100145_gemini_3m_sale_price', '20261103133204_gemini_managed_checkout', '20261103223506_gemini_inventory_pricing', '20261103224422_shop_product_management']) {
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

test('price edits affect new orders; existing QR amounts and settlement stay stable', async () => {
  const sku = 'gemini-managed-24m';
  await settings(sku, true);
  const old = await order(sku);
  await db.query('select public.windi_gemini_product_pricing($1,$2,$3)', [sku, 629000, 700000]);
  expect((await order(sku)).id).toBe(old.id);
  expect((await order(sku)).amount_vnd).toBe(old.amount_vnd);
  expect(await pay(old, 'old-price-after-edit')).toBe('paid');
  const fresh = await order(sku);
  expect(fresh.amount_vnd).toBe(629000);
  expect(await pay(fresh, 'new-price-wrong', 599000)).toBe('underpaid');
  const correct = await order(sku);
  expect(await pay(correct, 'new-price-correct')).toBe('paid');
  const catalog = await db.query<{price_vnd:number}>('select * from public.windi_gemini_catalog() where sku=$1', [sku]);
  expect(catalog.rows[0].price_vnd).toBe(629000);
});
test('link inventory also creates orders at edited prices', async () => {
  await db.query('select public.windi_gemini_product_pricing($1,$2,$3)', ['gemini-3m', 79000, 150000]);
  await db.exec("select public.windi_gemini_import(array['https://one.google.com/offer/NEWPRICE1234'],now()+interval '1 day','gemini-3m')");
  await settings('gemini-3m', true);
  const o = await order('gemini-3m');
  expect(o.amount_vnd).toBe(79000);
  expect(o.activation_id).not.toBeNull();
  expect(await pay(o, 'link-edited-price')).toBe('paid');
});
test('pricing rejects invalid amounts and public roles cannot change prices', async () => {
  for (const [price, original] of [[0,1000],[1001,1000],[100000001,100000001]]) {
    await expect(db.query('select public.windi_gemini_product_pricing($1,$2,$3)', ['gemini-3m',price,original])).rejects.toThrow('GEMINI_INVALID_PRICE');
  }
  for (const role of ['anon','authenticated']) {
    await expect(db.exec(`set role ${role}; select public.windi_gemini_product_pricing('gemini-3m',1000,1000)`)).rejects.toThrow('permission denied');
    await db.exec('reset role');
  }
});

const newDetails = {title:'Test product',durationMonths:1,price:229000,originalPrice:250000,description:'Mô tả',category:'AI',benefits:['Lợi ích 1'],warrantyStatus:'included',warranty:'7 ngày theo điều kiện',notes:'Lưu ý',thumbnail:'/gemini-products/chatgpt-1-thang-acc-cap-san.png',published:false,deliveryMode:'manual'};
test('new products persist all fields, start closed, publish and charge the saved price', async () => {
  await db.query('select public.windi_shop_save_product($1,$2,true)', ['new-product-1m',JSON.stringify(newDetails)]);
  const saved = (await db.query<{enabled:boolean;benefits:string[];warranty:string}>('select * from public.windi_gemini_products where sku=$1',['new-product-1m'])).rows[0];
  expect(saved.enabled).toBe(false);expect(saved.benefits).toEqual(newDetails.benefits);expect(saved.warranty).toBe(newDetails.warranty);
  await expect(settings('new-product-1m',true)).rejects.toThrow('SHOP_NOT_READY');
  await expect(order('new-product-1m')).rejects.toThrow('GEMINI_DISABLED');
  await db.query('select public.windi_shop_save_product($1,$2,false)',['new-product-1m',JSON.stringify({...newDetails,published:true})]);
  await settings('new-product-1m',true);
  const o=await order('new-product-1m');expect(o.amount_vnd).toBe(229000);expect(o.activation_id).toBeNull();
  expect(await pay(o,'new-product-pay')).toBe('paid');
  await expect(db.query('select public.windi_shop_save_product($1,$2,true)',['new-product-1m',JSON.stringify(newDetails)])).rejects.toThrow('SHOP_SKU_EXISTS');
  await expect(db.query('select public.windi_shop_save_product($1,$2,false)',['new-product-1m',JSON.stringify({...newDetails,durationMonths:2})])).rejects.toThrow('SHOP_IMMUTABLE_DELIVERY');
});
test('ChatGPT is in the catalog at 229k, while products without prices stay unavailable', async () => {
  const rows=(await db.query<{sku:string;price_vnd:number;published:boolean;price_confirmed:boolean}>("select sku,price_vnd,published,price_confirmed from public.windi_gemini_products where sku in ('chatgpt-ready-1m','claude-1m')")).rows;
  expect(rows.find(r=>r.sku==='chatgpt-ready-1m')).toMatchObject({price_vnd:229000,published:true,price_confirmed:true});
  expect(rows.find(r=>r.sku==='claude-1m')).toMatchObject({published:true,price_confirmed:false});
  await expect(db.exec("set role authenticated; select public.windi_shop_save_product('hack-product','{}',true)")).rejects.toThrow('permission denied');await db.exec('reset role');
});
