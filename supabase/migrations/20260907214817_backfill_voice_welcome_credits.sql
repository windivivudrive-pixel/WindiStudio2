begin;

-- The signup trigger only runs for future auth.users rows. Give every older
-- account the same one-time welcome grant, while preserving any active paid
-- period should this migration be applied to another environment later.
with recipients as (
  select
    u.id as user_id,
    active_period.id as active_period_id
  from auth.users u
  left join lateral (
    select p.id
    from public.windi_voice_periods p
    where p.user_id=u.id
      and p.plan_id <> 'welcome'
      and p.starts_at<=now()
      and p.ends_at>now()
    order by p.ends_at desc
    limit 1
  ) active_period on true
  where not exists (
    select 1 from public.windi_voice_orders o
    where o.user_id=u.id and o.plan_id='welcome'
  )
), welcome_orders as (
  insert into public.windi_voice_orders(
    user_id,plan_id,amount_vnd,credits,clone_limit,duration_days,status,gateway_id,expires_at,paid_at
  )
  select user_id,'welcome',0,1500,0,7,'paid','welcome:' || user_id::text,now(),now()
  from recipients
  on conflict (gateway_id) do nothing
  returning id,user_id
), welcome_periods as (
  insert into public.windi_voice_periods(
    user_id,order_id,plan_id,starts_at,ends_at,credits,clone_limit
  )
  select o.user_id,o.id,'welcome',now(),now()+interval '7 days',1500,0
  from welcome_orders o
  join recipients r on r.user_id=o.user_id
  where r.active_period_id is null
  returning id,user_id
), paid_period_grants as (
  update public.windi_voice_periods p
  set credits=credits+1500
  from recipients r
  join welcome_orders o on o.user_id=r.user_id
  where p.id=r.active_period_id
  returning p.id,p.user_id
), ledger_grants as (
  select p.user_id,p.id as period_id from welcome_periods p
  union all
  select p.user_id,p.id as period_id from paid_period_grants p
)
insert into public.windi_voice_ledger(user_id,period_id,kind,amount)
select user_id,period_id,'grant',1500 from ledger_grants;

notify pgrst, 'reload schema';
commit;
