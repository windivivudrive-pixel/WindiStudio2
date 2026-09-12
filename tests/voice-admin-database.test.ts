import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {afterAll,beforeAll,expect,test} from 'vitest';
const db=new PGlite();
const admin='00000000-0000-4000-8000-000000000011',normal='00000000-0000-4000-8000-000000000012';
beforeAll(async()=>{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key,raw_app_meta_data jsonb default '{}',raw_user_meta_data jsonb default '{}');
 insert into auth.users values('${admin}','{"windi_voice_admin":true}','{}'),('${normal}','{}','{"windi_voice_admin":true}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 grant usage on schema public,auth to anon,authenticated,service_role;grant select on auth.users to service_role;
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`);
 for(const name of ['20260811000000_creatorflow_commerce','20260905181816_windi_voice_studio','20260910032859_windi_video_workflow_v1','20260910070601_tidy_windi_device_activation','20260910145158_video_kit_voice_bonus','20260909031102_add_voice_clone_accent','20260911024124_windi_voice_admin_access']) await db.exec(await readFile(`supabase/migrations/${name}.sql`,'utf8'));
 await db.query('insert into windi_voice_admins(user_id) values($1)',[admin]);
},30000);
afterAll(()=>db.close());
test('admin uses provider funding without inventing a paid balance; retry and refund stay idempotent',async()=>{
 await db.exec('set role service_role');
 const args=[admin,'00000000-0000-4000-8000-000000000090','voice','Voice','Xin chào','vi',1];
 const query='select * from windi_voice_reserve($1,$2,$3,$4,$5,$6,$7)';
 const job=(await db.query<any>(query,args)).rows[0];
 expect(job.admin_funded).toBe(true);expect(job.period_id).toBeNull();expect(job.entitlement_id).toBeNull();
 expect((await db.query<any>(query,args)).rows[0].id).toBe(job.id);
 await expect(db.query(query,[...args.slice(0,4),'Khác','vi',1])).rejects.toThrow('REQUEST_CONFLICT');
 await db.query('select windi_voice_finish($1,false)',[job.id]);
 await db.query('select windi_voice_finish($1,false)',[job.id]);
 expect((await db.query<any>('select count(*)::int n from windi_voice_ledger where job_id=$1',[job.id])).rows[0].n).toBe(0);
 await db.exec('reset role');
});
test('user-editable metadata grants neither free speech nor clone; client cannot invoke reserve',async()=>{
 await db.exec('set role service_role');
 await expect(db.query('select * from windi_voice_reserve($1,$2,$3,$4,$5,$6,$7)',[normal,'00000000-0000-4000-8000-000000000091','voice','Voice','Xin chào','vi',1])).rejects.toThrow('NO_SUBSCRIPTION');
 await expect(db.query('select * from windi_voice_clone_reserve($1,$2,$3,$4)',[normal,'00000000-0000-4000-8000-000000000092','Clone','vi'])).rejects.toThrow('NO_SUBSCRIPTION');
 await db.exec('reset role;set role authenticated');
 await expect(db.query('select * from windi_voice_reserve($1,$2,$3,$4,$5,$6,$7)',[admin,'00000000-0000-4000-8000-000000000093','voice','Voice','Xin chào','vi',1])).rejects.toThrow('permission denied');
 await db.exec('reset role');
});
test('admin can reserve and fail a clone without a subscription',async()=>{
 await db.exec('set role service_role');
 const c=(await db.query<any>('select * from windi_voice_clone_reserve($1,$2,$3,$4)',[admin,'00000000-0000-4000-8000-000000000094','Clone','vi'])).rows[0];
 expect(c.admin_funded).toBe(true);expect(c.period_id).toBeNull();
 await db.query('select windi_voice_clone_finish($1,null)',[c.id]);
 expect((await db.query<any>('select status from windi_voice_clones where id=$1',[c.id])).rows[0].status).toBe('failed');
 await db.exec('reset role');
});
