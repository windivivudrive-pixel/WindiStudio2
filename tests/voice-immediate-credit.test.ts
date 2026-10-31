import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { expect, test } from 'vitest';

test('paid top-ups activate immediately and repeated callbacks do not duplicate credit', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create table public.windi_voice_orders (id uuid primary key default gen_random_uuid(), user_id uuid, payment_code text, status text, gateway_id text, created_at timestamptz default now(), expires_at timestamptz, amount_vnd int, plan_id text, credits int, clone_limit int, duration_days int, paid_at timestamptz, demo_clone_id uuid);
      create table public.windi_voice_periods (id uuid primary key default gen_random_uuid(), user_id uuid, order_id uuid, plan_id text, starts_at timestamptz, ends_at timestamptz, credits int, clone_limit int, clones_used int default 0);
      create table public.windi_voice_clones (id uuid primary key, user_id uuid, is_demo boolean, status text, demo_expires_at timestamptz, provider_id text, created_at timestamptz, period_id uuid, cleanup_at timestamptz);
      create table public.windi_voice_ledger (user_id uuid, period_id uuid, kind text, amount int);
      insert into public.windi_voice_periods(user_id,starts_at,ends_at,credits) values ('00000000-0000-4000-8000-000000000001',now()-interval '1 day',now()+interval '2 days',13000);
      insert into public.windi_voice_orders(user_id,payment_code,status,expires_at,amount_vnd,plan_id,credits,clone_limit,duration_days) values ('00000000-0000-4000-8000-000000000001','WINDI V123','pending',now()+interval '5 minutes',99000,'credit_100k',100000,2,30);`);
    await db.exec(await readFile('supabase/migrations/20261031052024_voice_immediate_credit_purchases.sql','utf8'));
    for (let i=0;i<2;i++) expect((await db.query("select public.windi_voice_pay('WINDI V123','bank-1',99000)")).rows).toEqual([{windi_voice_pay:'paid'}]);
    const rows=(await db.query<{credits:number;active:boolean}>("select credits,starts_at<=now() and ends_at>now() as active from public.windi_voice_periods order by credits")).rows;
    expect(rows).toEqual([{credits:13000,active:true},{credits:100000,active:true}]);
    expect((await db.query('select count(*)::int as count from public.windi_voice_ledger')).rows).toEqual([{count:1}]);
  } finally { await db.close(); }
});
