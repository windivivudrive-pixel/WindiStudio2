import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { VOICE_PLANS } from '../lib/voice/shared';

const db = new PGlite();
const user = '00000000-0000-4000-8000-000000000011';

beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table public.windi_voice_plans (
      id text primary key, name text not null, price_vnd integer not null,
      credits integer not null, clone_limit integer not null,
      duration_days integer not null, active boolean not null
    );
    create table public.windi_voice_orders (
      id uuid primary key default gen_random_uuid(), user_id uuid not null,
      plan_id text not null, amount_vnd integer not null, credits integer not null,
      clone_limit integer not null, duration_days integer not null,
      status text not null default 'pending', created_at timestamptz default now(),
      expires_at timestamptz default now() + interval '5 minutes'
    );
    create table public.windi_voice_periods (user_id uuid, plan_id text, credits integer);
    insert into public.windi_voice_plans values
      ('starter','Starter',99000,30000,1,30,true),
      ('creator','Creator',269000,100000,5,30,true),
      ('studio','Studio',1169000,500000,20,30,true),
      ('credit_100k','100.000 credit',269000,100000,5,30,true);
    insert into public.windi_voice_periods values ('${user}','creator',100000);
    insert into public.windi_voice_orders(user_id,plan_id,amount_vnd,credits,clone_limit,duration_days)
      values ('${user}','credit_100k',269000,100000,5,30);
  `);
  await db.exec(await readFile('supabase/migrations/20261027190000_voice_credit_price_update.sql', 'utf8'));
});
afterAll(() => db.close());

test('new and existing customers see three matching purchasable prices', async () => {
  const expected = [
    { id: 'credit_10k', price_vnd: 39000, credits: 10000, clone_limit: 1 },
    { id: 'credit_100k', price_vnd: 169000, credits: 100000, clone_limit: 5 },
    { id: 'credit_1m', price_vnd: 699000, credits: 1000000, clone_limit: 20 },
  ];
  const fields = ({ id, price_vnd, credits, clone_limit }: typeof expected[number]) => ({ id, price_vnd, credits, clone_limit });
  expect(VOICE_PLANS.filter(plan => plan.purchasable).map(fields)).toEqual(expected);
  expect((await db.query('select id,price_vnd,credits,clone_limit from public.windi_voice_plans where active order by credits')).rows).toEqual(expected);
  await expect(db.query('select public.windi_voice_order($1,$2)', [user, 'creator'])).rejects.toThrow('INVALID_PLAN');
});

test('a stale pending price is replaced while historical purchase terms remain intact', async () => {
  const old = (await db.query<{ id: string; expires_at: Date }>('select id,expires_at from public.windi_voice_orders')).rows[0];
  const fresh = (await db.query<{ id: string; amount_vnd: number }>('select * from public.windi_voice_order($1,$2)', [user, 'credit_100k'])).rows[0];
  expect(fresh.amount_vnd).toBe(169000);
  expect(fresh.id).not.toBe(old.id);
  expect((await db.query('select status,amount_vnd,expires_at from public.windi_voice_orders where id=$1', [old.id])).rows[0]).toEqual({ status: 'expired', amount_vnd: 269000, expires_at: old.expires_at });
  expect((await db.query<{ id: string }>('select * from public.windi_voice_order($1,$2)', [user, 'credit_100k'])).rows[0].id).toBe(fresh.id);
  expect((await db.query('select plan_id,credits from public.windi_voice_periods where user_id=$1', [user])).rows).toEqual([{ plan_id: 'creator', credits: 100000 }]);
});
