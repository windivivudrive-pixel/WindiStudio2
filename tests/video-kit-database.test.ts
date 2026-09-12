import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {afterAll,beforeAll,expect,test} from 'vitest';

const db=new PGlite();
const a='00000000-0000-4000-8000-000000000011',b='00000000-0000-4000-8000-000000000012';
let productId:string;

beforeAll(async()=>{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${a}'),('${b}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 grant usage on schema public,auth to anon,authenticated,service_role;grant select,insert on auth.users to service_role;
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`);
 await db.exec(await readFile('supabase/migrations/20260811000000_creatorflow_commerce.sql','utf8'));
 await db.exec(await readFile('supabase/migrations/20260905181816_windi_voice_studio.sql','utf8'));
 await db.exec(await readFile('supabase/migrations/20260910032859_windi_video_workflow_v1.sql','utf8'));
 await db.exec(await readFile('supabase/migrations/20260910070601_tidy_windi_device_activation.sql','utf8'));
 await db.exec(await readFile('supabase/migrations/20260910145158_video_kit_voice_bonus.sql','utf8'));
 await db.exec("set role service_role;update products set is_active=true,metadata=jsonb_set(metadata,'{release_ready}','true') where metadata->>'sku'='windi-video-workflow-v1'");
 productId=(await db.query<{id:string}>("select id from products where metadata->>'sku'='windi-video-workflow-v1'")).rows[0].id;
 await db.exec('reset role');
},30000);
afterAll(()=>db.close());

test('release starts private and uses private storage buckets',async()=>{
 expect((await db.query("select public from storage.buckets where id in ('windi-releases','windi-voice-timing') order by id")).rows).toEqual([{public:false},{public:false}]);
 expect((await db.query("select price_vnd,metadata->>'launch_price_vnd' launch from products where id=$1",[productId])).rows).toEqual([{price_vnd:499000,launch:'299000'}]);
});

test('launch price is database-controlled for exactly the first 100 slots',async()=>{
 await db.exec(`insert into auth.users select gen_random_uuid() from generate_series(1,99);
 insert into product_entitlements(user_id,product_id,kind)
 select id,'${productId}','video_workflow_v1' from auth.users where id not in ('${a}','${b}') limit 99;`);
 const first=(await db.query<{id:string;total_amount_vnd:number;payment_code:string;created_at:string;expires_at:string}>('select * from windi_video_kit_order($1)',[a])).rows[0];
 expect(first.total_amount_vnd).toBe(299000);expect(first.payment_code).toMatch(/^WINDI K[A-Z0-9]{8}$/);
 const next=(await db.query<{total_amount_vnd:number}>('select * from windi_video_kit_order($1)',[b])).rows[0];
 expect(next.total_amount_vnd).toBe(499000);
 expect(Date.parse(first.expires_at)-Date.parse(first.created_at)).toBeLessThanOrEqual(601_000);
});

test('payment is idempotent and grants one entitlement only for the exact amount',async()=>{
 const order=(await db.query<{id:string;payment_code:string}>('select * from windi_video_kit_order($1)',[a])).rows[0];
 expect((await db.query('select windi_video_kit_pay($1,$2,$3,$4)',[order.payment_code,'sepay-kit-a',299000,{id:'sepay-kit-a'}])).rows).toEqual([{windi_video_kit_pay:'paid'}]);
 expect((await db.query('select windi_video_kit_pay($1,$2,$3,$4)',[order.payment_code,'sepay-kit-a',299000,{id:'sepay-kit-a'}])).rows).toEqual([{windi_video_kit_pay:'paid'}]);
 expect((await db.query('select count(*)::int n from product_entitlements where user_id=$1 and product_id=$2',[a,productId])).rows).toEqual([{n:1}]);
 expect((await db.query('select voice_credits,voice_credits_used from product_entitlements where user_id=$1 and product_id=$2',[a,productId])).rows).toEqual([{voice_credits:20000,voice_credits_used:0}]);
 expect((await db.query('select count(*)::int n from payment_events where gateway_id=$1',['sepay-kit-a'])).rows).toEqual([{n:1}]);
});

test('workflow voice bonus reserves and refunds without a paid Voice period',async()=>{
 const requestKey='00000000-0000-4000-8000-000000000099';
 const job=(await db.query<{id:string;period_id:string|null;entitlement_id:string|null}>('select * from windi_voice_reserve($1,$2,$3,$4,$5,$6,$7)',[a,requestKey,'voice-id','Voice','Xin chào','vi',1])).rows[0];
 expect(job.period_id).toBeNull();
 expect(job.entitlement_id).toBeTruthy();
 expect((await db.query('select voice_credits_used from product_entitlements where user_id=$1 and product_id=$2',[a,productId])).rows).toEqual([{voice_credits_used:8}]);
 await db.query('select windi_voice_finish($1,$2,$3)',[job.id,false,null]);
 expect((await db.query('select voice_credits_used from product_entitlements where user_id=$1 and product_id=$2',[a,productId])).rows).toEqual([{voice_credits_used:0}]);
});

test('underpayment and late payment never silently grant a license',async()=>{
 const pending=(await db.query<{id:string;payment_code:string}>('select * from windi_video_kit_order($1)',[b])).rows[0];
 await db.query('select windi_video_kit_pay($1,$2,$3,$4)',[pending.payment_code,'sepay-under',1000,{id:'sepay-under'}]);
 expect((await db.query('select count(*)::int n from product_entitlements where user_id=$1',[b])).rows).toEqual([{n:0}]);
 await db.exec("update orders set status='EXPIRED' where id='"+pending.id+"'");
 expect((await db.query('select windi_video_kit_pay($1,$2,$3,$4)',[pending.payment_code,'sepay-late',499000,{id:'sepay-late'}])).rows).toEqual([{windi_video_kit_pay:'review'}]);
});

test('one active device is enforced atomically and replacement revokes the old device',async()=>{
 const entitlement=(await db.query<{id:string}>('select id from product_entitlements where user_id=$1 and product_id=$2',[a,productId])).rows[0];
 await db.query('select * from windi_product_activate_device($1,$2,$3,$4,$5)',[a,entitlement.id,'hash-a','Mac A',false]);
 await expect(db.query('select * from windi_product_activate_device($1,$2,$3,$4,$5)',[a,entitlement.id,'hash-b','Mac B',false])).rejects.toThrow('DEVICE_REPLACE_REQUIRED');
 await db.query('select * from windi_product_activate_device($1,$2,$3,$4,$5)',[a,entitlement.id,'hash-b','Mac B',true]);
 expect((await db.query('select device_name,status from product_devices where entitlement_id=$1 order by activated_at',[entitlement.id])).rows).toEqual(expect.arrayContaining([{device_name:'Mac A',status:'revoked'},{device_name:'Mac B',status:'active'}]));
});

test('RLS exposes only the owner and blocks client-side entitlement mutation',async()=>{
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${b}'`);
 expect((await db.query('select * from product_entitlements')).rows).toHaveLength(0);
 await expect(db.exec(`insert into product_entitlements(user_id,product_id,kind) values('${b}','${productId}','video_workflow_v1')`)).rejects.toThrow('permission denied');
 await db.exec(`set request.jwt.claim.sub='${a}'`);
 expect((await db.query('select * from product_entitlements')).rows).toHaveLength(1);
});
