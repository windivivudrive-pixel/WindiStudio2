begin;

update public.windi_voice_plans
set credits = 3000
where id = 'welcome';

create or replace function public.windi_voice_welcome_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  welcome_order uuid;
  welcome_period uuid;
begin
  insert into public.windi_voice_orders(
    user_id,plan_id,amount_vnd,credits,clone_limit,duration_days,status,gateway_id,expires_at,paid_at
  ) values (
    new.id,'welcome',0,3000,0,7,'paid','welcome:3000:' || new.id::text,now(),now()
  ) on conflict (gateway_id) do nothing
  returning id into welcome_order;

  -- The backfill can win a race with signup; its grant already covers this user.
  if welcome_order is null then
    return new;
  end if;

  insert into public.windi_voice_periods(
    user_id,order_id,plan_id,starts_at,ends_at,credits,clone_limit
  ) values (
    new.id,welcome_order,'welcome',now(),now()+interval '7 days',3000,0
  ) returning id into welcome_period;

  insert into public.windi_voice_ledger(user_id,period_id,kind,amount)
  values(new.id,welcome_period,'grant',3000);
  return new;
end;
$$;
revoke all on function public.windi_voice_welcome_new_user() from public, anon, authenticated;

with recipients as materialized (
  select
    u.id as user_id,
    active_period.id as active_period_id
  from auth.users u
  left join lateral (
    select p.id, p.plan_id
    from public.windi_voice_periods p
    where p.user_id=u.id
      and p.starts_at<=now()
      and p.ends_at>now()
    order by (p.plan_id='welcome') asc, p.ends_at asc, p.starts_at desc
    limit 1
    for update
  ) active_period on true
), welcome_orders as (
  insert into public.windi_voice_orders(
    user_id,plan_id,amount_vnd,credits,clone_limit,duration_days,status,gateway_id,expires_at,paid_at
  )
  select user_id,'welcome',0,3000,0,7,'paid','welcome:3000:' || user_id::text,now(),now()
  from recipients
  on conflict (gateway_id) do nothing
  returning id,user_id
), credited_periods as (
  update public.windi_voice_periods p
  set credits=p.credits+3000,
      ends_at=case when p.plan_id='welcome' then greatest(p.ends_at,now()+interval '7 days') else p.ends_at end
  from recipients r
  join welcome_orders o on o.user_id=r.user_id
  where p.id=r.active_period_id
  returning p.id,p.user_id
), new_periods as (
  insert into public.windi_voice_periods(
    user_id,order_id,plan_id,starts_at,ends_at,credits,clone_limit
  )
  select o.user_id,o.id,'welcome',now(),now()+interval '7 days',3000,0
  from welcome_orders o
  join recipients r on r.user_id=o.user_id
  where r.active_period_id is null
  returning id,user_id
), grant_rows as (
  select user_id,id as period_id from credited_periods
  union all
  select user_id,id as period_id from new_periods
)
insert into public.windi_voice_ledger(user_id,period_id,kind,amount)
select user_id,period_id,'grant',3000 from grant_rows;

notify pgrst, 'reload schema';
commit;
