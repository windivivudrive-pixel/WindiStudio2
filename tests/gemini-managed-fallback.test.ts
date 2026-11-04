import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { afterAll,beforeAll,expect,test } from 'vitest';
import { parseActivationLinks } from '../lib/gemini/shared';
let db:PGlite;
const u1='11111111-1111-4111-8111-111111111111',u2='22222222-2222-4222-8222-222222222222';
const sku='gemini-managed-6m',code='GEM6-0FBEA7714E7377706B551B0959984523';
type Order={id:string;payment_code:string;activation_id:string|null;amount_vnd:number;status:string};
const order=async(user:string)=>(await db.query<Order>('select * from public.windi_gemini_order($1,$2)',[user,sku])).rows[0];
beforeAll(async()=>{ db=new PGlite();await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); insert into auth.users values('${u1}'),('${u2}');`);
for(const name of ['20261026151540_gemini_activation_commerce','20261027003556_gemini_product_variants','20261027041208_gemini_five_minute_reservations','20261027055631_gemini_18m_activation_token_regex_limit','20261102100145_gemini_3m_sale_price','20261103133204_gemini_managed_checkout','20261103223506_gemini_inventory_pricing','20261103224422_shop_product_management','20261104021451_shop_archive_product','20261104035129_gemini_code_stock','20261104113545_gemini_managed_fallback']) await db.exec(await readFile(new URL(`../supabase/migrations/${name}.sql`,import.meta.url),'utf8'));
await db.exec(`update public.windi_gemini_products set enabled=true where sku='${sku}'`);
},30000);afterAll(async()=>{await db.close()});
test('empty managed inventory remains purchasable and paid order is fulfilled manually',async()=>{
 for(const product of ['gemini-managed-6m','gemini-managed-12m','gemini-managed-24m']) {
  await db.query('update public.windi_gemini_products set enabled=true where sku=$1',[product]);
  expect((await db.query<{stock:number}>('select stock from public.windi_gemini_catalog() where sku=$1',[product])).rows[0].stock).toBeGreaterThan(0);
  const pending=(await db.query<Order & {delivery_mode:string}>('select * from public.windi_gemini_order($1,$2)',[u1,product])).rows[0];
  expect(pending.activation_id).toBeNull();expect(pending.delivery_mode).toBe('manual');
  expect((await db.query<{result:string}>('select public.windi_gemini_pay($1,$2,$3,now()) as result',[pending.payment_code,'fallback-'+product,pending.amount_vnd])).rows[0].result).toBe('paid');
 }
});
test('available code is reserved before using manual fallback',async()=>{
 await db.query("select public.windi_gemini_import($1::text[],now()+interval '2 years',$2)",[[code],sku]);
 const first=await order(u1);expect(first.activation_id).not.toBeNull();
 const fallback=await order(u2);expect(fallback.activation_id).toBeNull();
 expect((await db.query<{result:string}>('select public.windi_gemini_pay($1,$2,$3,now()) as result',[first.payment_code,'stock-payment',first.amount_vnd])).rows[0].result).toBe('paid');
 expect((await db.query<{activation_url:string}>('select l.activation_url from public.windi_gemini_orders o join public.windi_gemini_links l on l.id=o.activation_id where o.id=$1',[first.id])).rows[0].activation_url).toBe(code);
});
