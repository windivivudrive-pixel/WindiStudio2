import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {beforeAll,afterAll,test,expect} from 'vitest';
import {countCredits,validateSpeech,VOICE_PLANS} from '../lib/voice/shared';
const db=new PGlite();
const a='00000000-0000-4000-8000-000000000011',b='00000000-0000-4000-8000-000000000012',c='00000000-0000-4000-8000-000000000013';
const key=(i:number)=>`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`;
let order:{id:string;payment_code:string},job:{id:string},clone:{id:string};
const reserve=(k:number,text='Xin chào 👋')=>db.query<{id:string}>("select * from windi_voice_reserve($1,$2,'voice','Skylar',$3,'vi',1)",[a,key(k),text]);
beforeAll(async()=>{
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${a}'),('${b}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 grant usage on schema public,auth to anon,authenticated,service_role;
 grant select,insert on auth.users to service_role;
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`);
 await db.exec(await readFile('supabase/migrations/20260905181816_windi_voice_studio.sql','utf8'));
 await db.exec(await readFile('supabase/migrations/20260906093309_windi_voice_preview_cache.sql','utf8'));
 await db.exec(await readFile('supabase/migrations/20260907171404_voice_welcome_trial_offers.sql','utf8'));
 await db.exec(await readFile('supabase/migrations/20260908170000_windi_voice_sepay_windi_code.sql','utf8'));
},30000);
afterAll(()=>db.close());
test('five plans, private storage, and no client money/credit mutation',async()=>{
 expect((await db.query('select id,price_vnd,credits,clone_limit,duration_days from windi_voice_plans order by price_vnd,id')).rows).toEqual([...VOICE_PLANS].sort((x,y)=>x.price_vnd-y.price_vnd||x.id.localeCompare(y.id)).map(({id,price_vnd,credits,clone_limit,duration_days})=>({id,price_vnd,credits,clone_limit,duration_days})));
 expect((await db.query('select id,public from storage.buckets order by id')).rows).toEqual([{id:'windi-voice-audio',public:false},{id:'windi-voice-previews',public:false}]);
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${a}'`);
 await expect(db.query('select windi_voice_order($1,$2)',[a,'starter'])).rejects.toThrow('permission denied');
 await expect(db.exec("update windi_voice_plans set price_vnd=1")).rejects.toThrow('permission denied');
 await expect(db.exec("insert into windi_voice_periods(user_id) values('00000000-0000-4000-8000-000000000011')")).rejects.toThrow('permission denied');
 await db.exec('set role service_role');
});
test('new registrations receive a seven-day welcome credit grant without clone access',async()=>{
 await db.query('insert into auth.users values($1)',[c]);
 expect((await db.query('select plan_id,credits,clone_limit from windi_voice_periods where user_id=$1',[c])).rows).toEqual([{plan_id:'welcome',credits:1500,clone_limit:0}]);
 expect((await db.query("select amount from windi_voice_ledger where user_id=$1 and kind='grant'",[c])).rows).toEqual([{amount:1500}]);
 await expect(db.query('select windi_voice_clone_reserve($1,$2,$3,$4)',[c,key(20),'Welcome voice','vi'])).rejects.toThrow('CLONE_REQUIRES_TRIAL');
});
test('orders have authoritative prices, pending-order deduplication, and no free generation',async()=>{
 await expect(reserve(1)).rejects.toThrow('NO_SUBSCRIPTION');
 order=(await db.query<{id:string;payment_code:string}>('select * from windi_voice_order($1,$2)',[a,'starter'])).rows[0];
 expect((await db.query('select * from windi_voice_order($1,$2)',[a,'starter'])).rows[0]).toEqual(expect.objectContaining({id:order.id,amount_vnd:69000}));
 await expect(db.query('select windi_voice_order($1,$2)',[a,'studio'])).rejects.toThrow('PENDING_ORDER');
});
test('verified payment creates exactly one monthly grant, webhook retries do not reset credits',async()=>{
 await db.query('select windi_voice_pay($1,$2,$3)',[order.payment_code,'gateway-1',69000]);
 job=(await reserve(2)).rows[0];
 await db.query('select windi_voice_pay($1,$2,$3)',[order.payment_code,'gateway-1',69000]);
 expect((await db.query('select credits,used_credits,clone_limit from windi_voice_periods where user_id=$1',[a])).rows).toEqual([{credits:30000,used_credits:10,clone_limit:1}]);
 expect((await db.query("select count(*)::int n from windi_voice_ledger where user_id=$1 and kind='grant'",[a])).rows).toEqual([{n:1}]);
 await expect(db.query('select windi_voice_order($1,$2)',[a,'creator'])).rejects.toThrow('ACTIVE_PERIOD');
});
test('idempotent reservations, payload conflict and single in-flight job enforced',async()=>{
 expect((await reserve(2)).rows[0].id).toBe(job.id);
 await expect(reserve(2,'different')).rejects.toThrow('REQUEST_CONFLICT');
 await expect(reserve(3)).rejects.toThrow('REQUEST_PENDING');
 // Exactly one API worker can claim the reservation.
 expect((await db.query("update windi_voice_jobs set status='pending' where id=$1 and status='reserved' returning id",[job.id])).rows).toHaveLength(1);
 expect((await db.query("update windi_voice_jobs set status='pending' where id=$1 and status='reserved' returning id",[job.id])).rows).toHaveLength(0);
});
test('failure refunds once; successful audio cannot be refunded or attached to another owner',async()=>{
 await db.query('select windi_voice_finish($1,false)',[job.id]);await db.query('select windi_voice_finish($1,false)',[job.id]);
 expect((await db.query('select used_credits from windi_voice_periods where user_id=$1',[a])).rows).toEqual([{used_credits:0}]);
 job=(await reserve(4)).rows[0];
 await expect(db.query('select windi_voice_finish($1,true,$2)',[job.id,`${b}/${job.id}.mp3`])).rejects.toThrow('INVALID_AUDIO_PATH');
 await db.query('select windi_voice_finish($1,true,$2)',[job.id,`${a}/${job.id}.mp3`]);
 await db.query('select windi_voice_finish($1,false)',[job.id]);
 expect((await db.query('select used_credits from windi_voice_periods where user_id=$1',[a])).rows).toEqual([{used_credits:10}]);
});
test('quota cannot be overdrawn; expired periods never refresh for free',async()=>{
 await db.query('update windi_voice_periods set used_credits=credits-2 where user_id=$1',[a]);
 await expect(reserve(5)).rejects.toThrow('INSUFFICIENT_CREDITS');
 await db.query('update windi_voice_periods set used_credits=10 where user_id=$1',[a]);
});
test('clone allowance is atomic, idempotent, and restored only once on failure',async()=>{
 clone=(await db.query<{id:string}>('select * from windi_voice_clone_reserve($1,$2,$3,$4)',[a,key(6),'My voice','vi'])).rows[0];
 expect((await db.query('select * from windi_voice_clone_reserve($1,$2,$3,$4)',[a,key(6),'My voice','vi'])).rows[0]).toEqual(expect.objectContaining({id:clone.id}));
 await expect(db.query('select windi_voice_clone_reserve($1,$2,$3,$4)',[a,key(7),'Other','vi'])).rejects.toThrow('CLONE_LIMIT');
 await db.query('select windi_voice_clone_finish($1,null)',[clone.id]);await db.query('select windi_voice_clone_finish($1,null)',[clone.id]);
 expect((await db.query('select clones_used from windi_voice_periods where user_id=$1',[a])).rows).toEqual([{clones_used:0}]);
 clone=(await db.query<{id:string}>('select * from windi_voice_clone_reserve($1,$2,$3,$4)',[a,key(8),'My voice','vi'])).rows[0];
 await db.query('select windi_voice_clone_finish($1,$2)',[clone.id,'provider-voice']);
 await db.query('select windi_voice_clone_finish($1,null)',[clone.id]);
 expect((await db.query('select clones_used from windi_voice_periods where user_id=$1',[a])).rows).toEqual([{clones_used:1}]);
});
test('RLS isolates audio, transcripts, clones, payments and ledger between users',async()=>{
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${b}'`);
 for(const table of ['windi_voice_jobs','windi_voice_clones','windi_voice_orders','windi_voice_periods','windi_voice_ledger']) expect((await db.query(`select * from ${table}`)).rows).toHaveLength(0);
 await db.exec(`set request.jwt.claim.sub='${a}'`);
 expect((await db.query('select * from windi_voice_jobs')).rows.length).toBeGreaterThan(0);
 await db.exec('set role anon');
 await expect(db.exec('select * from windi_voice_jobs')).rejects.toThrow('permission denied');
 expect((await db.query('select * from windi_voice_plans')).rows).toHaveLength(4);
 await db.exec('set role service_role');
});
test('wrong amounts and reused gateway IDs never grant a subscription',async()=>{
 const other=(await db.query<{payment_code:string}>('select * from windi_voice_order($1,$2)',[b,'creator'])).rows[0];
 await expect(db.query('select windi_voice_pay($1,$2,$3)',[other.payment_code,'gateway-1',269000])).rejects.toThrow('DUPLICATE_PAYMENT');
 expect((await db.query('select windi_voice_pay($1,$2,$3)',[other.payment_code,'gateway-2',1000])).rows).toEqual([{windi_voice_pay:'review'}]);
 expect((await db.query('select * from windi_voice_periods where user_id=$1',[b])).rows).toHaveLength(0);
});
test('trial gives one clone slot and Starter upgrade preserves that voice for 40.000đ',async()=>{
 const trial=(await db.query<{payment_code:string;amount_vnd:number}>('select * from windi_voice_order($1,$2)',[b,'trial'])).rows[0];
 expect(trial.amount_vnd).toBe(29000);
 await db.query('select windi_voice_pay($1,$2,$3)',[trial.payment_code,'gateway-trial',29000]);
 const trialClone=(await db.query<{id:string}>('select * from windi_voice_clone_reserve($1,$2,$3,$4)',[b,key(21),'Trial voice','vi'])).rows[0];
 await db.query('select windi_voice_clone_finish($1,$2)',[trialClone.id,'trial-provider-voice']);
 const starter=(await db.query<{payment_code:string;amount_vnd:number}>('select * from windi_voice_order($1,$2)',[b,'starter'])).rows[0];
 expect(starter.amount_vnd).toBe(40000);
 await db.query('select windi_voice_pay($1,$2,$3)',[starter.payment_code,'gateway-starter-upgrade',40000]);
 expect((await db.query('select plan_id,clone_limit,clones_used from windi_voice_periods where user_id=$1 and ends_at>now()',[b])).rows).toEqual([{plan_id:'starter',clone_limit:1,clones_used:0}]);
 await expect(db.query('select windi_voice_clone_reserve($1,$2,$3,$4)',[b,key(22),'Second voice','vi'])).rejects.toThrow('CLONE_LIMIT');
 await db.query('select windi_voice_clone_remove($1,$2)',[b,trialClone.id]);
 expect((await db.query('select * from windi_voice_clone_reserve($1,$2,$3,$4)',[b,key(22),'Second voice','vi'])).rows).toHaveLength(1);
});
test('period expiry blocks TTS and clone until another verified payment',async()=>{
 await db.query("update windi_voice_periods set starts_at=now()-interval '2 months',ends_at=now()-interval '1 month' where user_id=$1",[a]);
 await expect(reserve(9)).rejects.toThrow('NO_SUBSCRIPTION');
 await expect(db.query('select windi_voice_clone_reserve($1,$2,$3,$4)',[a,key(9),'My voice','vi'])).rejects.toThrow('NO_SUBSCRIPTION');
});
test('Unicode billing matches Postgres code points and rejects malformed requests',()=>{
 expect(countCredits('  Xin chào 👋  ')).toBe(10);expect(countCredits('e\u0301')).toBe(1);
 expect(()=>validateSpeech({text:'a',voiceId:key(1),requestKey:key(2),speed:-1})).toThrow('INVALID_INPUT');
 expect(()=>validateSpeech({text:'a'.repeat(10001),voiceId:key(1),requestKey:key(2)})).toThrow('INVALID_INPUT');
 expect(()=>validateSpeech({text:'a',voiceId:'foreign',requestKey:key(2)})).toThrow('INVALID_INPUT');
});
test('historical accounts receive one welcome grant without replacing an active paid period',async()=>{
 await db.exec(await readFile('supabase/migrations/20260907214817_backfill_voice_welcome_credits.sql','utf8'));
 expect((await db.query('select plan_id,credits from windi_voice_periods where user_id=$1 and ends_at>now() order by ends_at desc',[a])).rows).toEqual([{plan_id:'welcome',credits:1500}]);
 expect((await db.query('select plan_id,credits from windi_voice_periods where user_id=$1 and ends_at>now() order by ends_at desc',[b])).rows).toEqual([{plan_id:'starter',credits:31500}]);
 expect((await db.query("select count(*)::int n from windi_voice_orders where user_id=$1 and plan_id='welcome'",[c])).rows).toEqual([{n:1}]);
 await db.exec(await readFile('supabase/migrations/20260907214817_backfill_voice_welcome_credits.sql','utf8'));
 expect((await db.query("select count(*)::int n from windi_voice_ledger where user_id=$1 and kind='grant'",[a])).rows).toEqual([{n:2}]);
});
