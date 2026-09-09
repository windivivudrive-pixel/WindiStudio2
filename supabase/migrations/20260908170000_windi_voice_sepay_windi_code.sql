-- Update default payment_code to 'WINDI ' || 8 uppercase alphanumeric characters
alter table public.windi_voice_orders 
  alter column payment_code set default ('WINDI ' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)));

-- Update default expires_at to 5 minutes
alter table public.windi_voice_orders
  alter column expires_at set default (now() + interval '5 minutes');

-- Update windi_voice_order to auto-expire past-due orders and prior pending orders when switching plans
create or replace function public.windi_voice_order(p_user uuid,p_plan text)
returns public.windi_voice_orders
language plpgsql
security invoker
set search_path = ''
as $$
declare
  plan public.windi_voice_plans;
  active_period public.windi_voice_periods;
  current_order public.windi_voice_orders;
  charge integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,73));
  select * into plan from public.windi_voice_plans where id=p_plan and active and id <> 'welcome';
  if not found then raise exception 'INVALID_PLAN'; end if;

  select * into active_period from public.windi_voice_periods
  where user_id=p_user and starts_at<=now() and ends_at>now()
  order by ends_at desc limit 1 for update;
  charge := plan.price_vnd;
  if found then
    if active_period.plan_id='welcome' then
      null;
    elsif active_period.plan_id='trial' and plan.id='starter' then
      charge := greatest(0, plan.price_vnd - 29000);
    else
      raise exception 'ACTIVE_PERIOD';
    end if;
  end if;

  -- 1. Auto-expire any orders past their 5-minute expiration timestamp
  update public.windi_voice_orders
  set status='expired'
  where user_id=p_user and status='pending' and expires_at<=now();

  -- 2. When switching to a different plan, auto-expire previous pending order
  update public.windi_voice_orders
  set status='expired'
  where user_id=p_user and status='pending' and plan_id<>p_plan;

  -- 3. If there is still a pending order for this exact plan (within 5 minutes), reuse it
  select * into current_order from public.windi_voice_orders
  where user_id=p_user and status='pending'
  order by created_at desc limit 1;
  if found then
    return current_order;
  end if;

  -- 4. Create fresh order with 5-minute expiry
  insert into public.windi_voice_orders(user_id,plan_id,amount_vnd,credits,clone_limit,duration_days,expires_at)
  values(p_user,plan.id,charge,plan.credits,plan.clone_limit,plan.duration_days,now()+interval '5 minutes')
  returning * into current_order;
  return current_order;
end;
$$;

grant execute on function public.windi_voice_order(uuid,text) to anon,authenticated,service_role;

-- Update windi_voice_pay to match code with or without space, supporting WINDI, WST and legacy WV codes
create or replace function public.windi_voice_pay(p_code text,p_gateway text,p_amount integer)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  voice_order public.windi_voice_orders;
  prior_period public.windi_voice_periods;
  period_id uuid;
  had_prior boolean := false;
begin
  select * into voice_order from public.windi_voice_orders 
  where payment_code=p_code or replace(payment_code,' ','')=replace(p_code,' ','');
  if not found then return 'ignored'; end if;
  perform pg_advisory_xact_lock(hashtextextended(voice_order.user_id::text,73));
  select * into voice_order from public.windi_voice_orders where id=voice_order.id for update;
  if voice_order.status='paid' then
    if voice_order.gateway_id=p_gateway then return 'paid'; end if;
    return 'review';
  end if;
  if voice_order.status='review' then return 'review'; end if;
  if exists(select 1 from public.windi_voice_orders where gateway_id=p_gateway) then raise exception 'DUPLICATE_PAYMENT'; end if;
  if voice_order.status<>'pending' or voice_order.expires_at<=now() or voice_order.amount_vnd<>p_amount then
    update public.windi_voice_orders set status='review',gateway_id=p_gateway where id=voice_order.id;
    return 'review';
  end if;

  select * into prior_period from public.windi_voice_periods
  where user_id=voice_order.user_id and starts_at<=now() and ends_at>now()
  order by ends_at desc limit 1 for update;
  had_prior := found;
  if found and not (
    prior_period.plan_id='welcome'
    or (prior_period.plan_id='trial' and voice_order.plan_id='starter')
  ) then
    update public.windi_voice_orders set status='review',gateway_id=p_gateway where id=voice_order.id;
    return 'review';
  end if;

  insert into public.windi_voice_periods(user_id,order_id,plan_id,starts_at,ends_at,credits,clone_limit)
  values(
    voice_order.user_id,voice_order.id,voice_order.plan_id,now(),
    now()+make_interval(days => voice_order.duration_days),voice_order.credits,voice_order.clone_limit
  ) returning id into period_id;
  if had_prior then update public.windi_voice_periods set ends_at=now() where id=prior_period.id; end if;
  insert into public.windi_voice_ledger(user_id,period_id,kind,amount)
  values(voice_order.user_id,period_id,'grant',voice_order.credits);
  update public.windi_voice_orders set status='paid',paid_at=now(),gateway_id=p_gateway where id=voice_order.id;
  return 'paid';
end;
$$;

grant execute on function public.windi_voice_pay(text,text,integer) to anon,authenticated,service_role;

