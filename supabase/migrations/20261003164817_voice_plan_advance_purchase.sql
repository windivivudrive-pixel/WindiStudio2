begin;

-- New prices and monthly allowances apply to orders created after this change.
update public.windi_voice_plans
set price_vnd=129000,credits=30000
where id='starter';
update public.windi_voice_plans
set price_vnd=299000,credits=100000
where id='creator';
update public.windi_voice_plans
set price_vnd=1399000,credits=500000
where id='studio';

-- Allow customers to purchase a paid Voice plan before their current period
-- ends. The new paid period starts after the latest active or scheduled period.
create or replace function public.windi_voice_order(p_user uuid,p_plan text)
returns public.windi_voice_orders
language plpgsql
security invoker
set search_path = ''
as $$
declare
  plan public.windi_voice_plans;
  current_order public.windi_voice_orders;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,73));

  select * into plan
  from public.windi_voice_plans
  where id=p_plan and active and id <> 'welcome';
  if not found then raise exception 'INVALID_PLAN'; end if;

  if plan.id='trial' and exists(
    select 1 from public.windi_voice_orders
    where user_id=p_user and status='paid' and plan_id in ('trial','starter','creator','studio')
  ) then
    raise exception 'TRIAL_ALREADY_USED';
  end if;

  update public.windi_voice_orders
  set status='expired'
  where user_id=p_user and status='pending' and expires_at<=now();

  select * into current_order
  from public.windi_voice_orders
  where user_id=p_user and status='pending'
  order by created_at desc
  limit 1;
  if found then
    if current_order.plan_id=p_plan then return current_order; end if;
    update public.windi_voice_orders set status='expired' where id=current_order.id;
  end if;

  insert into public.windi_voice_orders(user_id,plan_id,amount_vnd,credits,clone_limit,duration_days)
  values(p_user,plan.id,plan.price_vnd,plan.credits,plan.clone_limit,plan.duration_days)
  returning * into current_order;
  return current_order;
end;
$$;

revoke all on function public.windi_voice_order(uuid,text) from public,anon,authenticated;
grant execute on function public.windi_voice_order(uuid,text) to service_role;

create or replace function public.windi_voice_pay(
  p_code text,
  p_gateway text,
  p_amount integer,
  p_paid_at timestamptz default null
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  voice_order public.windi_voice_orders;
  period_id uuid;
  effective_paid_at timestamptz;
  period_start timestamptz;
begin
  select * into voice_order
  from public.windi_voice_orders
  where payment_code=p_code or replace(payment_code,' ','')=replace(p_code,' ','');
  if not found then return 'ignored'; end if;

  perform pg_advisory_xact_lock(hashtextextended(voice_order.user_id::text,73));
  select * into voice_order from public.windi_voice_orders where id=voice_order.id for update;
  if voice_order.status='paid' then
    if voice_order.gateway_id=p_gateway then return 'paid'; end if;
    return 'review';
  end if;
  if voice_order.status='review' then return 'review'; end if;
  if exists(select 1 from public.windi_voice_orders where gateway_id=p_gateway) then
    raise exception 'DUPLICATE_PAYMENT';
  end if;

  effective_paid_at := coalesce(p_paid_at,now());
  if voice_order.status not in ('pending','expired')
    or (voice_order.status='expired' and p_paid_at is null)
    or effective_paid_at < voice_order.created_at-interval '1 minute'
    or effective_paid_at > voice_order.expires_at
    or effective_paid_at > now()+interval '5 minutes'
    or voice_order.amount_vnd<>p_amount then
    update public.windi_voice_orders set status='review',gateway_id=p_gateway where id=voice_order.id;
    return 'review';
  end if;

  select max(ends_at) into period_start
  from public.windi_voice_periods
  where user_id=voice_order.user_id and ends_at>now();
  period_start := greatest(now(),coalesce(period_start,now()));

  insert into public.windi_voice_periods(user_id,order_id,plan_id,starts_at,ends_at,credits,clone_limit)
  values(
    voice_order.user_id,voice_order.id,voice_order.plan_id,period_start,
    period_start+make_interval(days => voice_order.duration_days),voice_order.credits,voice_order.clone_limit
  ) returning id into period_id;
  insert into public.windi_voice_ledger(user_id,period_id,kind,amount)
  values(voice_order.user_id,period_id,'grant',voice_order.credits);
  update public.windi_voice_orders
  set status='paid',paid_at=effective_paid_at,gateway_id=p_gateway
  where id=voice_order.id;
  return 'paid';
end;
$$;

revoke all on function public.windi_voice_pay(text,text,integer,timestamptz) from public,anon,authenticated;
grant execute on function public.windi_voice_pay(text,text,integer,timestamptz) to service_role;

notify pgrst, 'reload schema';
commit;
