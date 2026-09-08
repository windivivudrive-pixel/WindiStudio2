begin;

alter table public.windi_voice_plans
  add column duration_days integer not null default 30 check (duration_days between 1 and 365);
alter table public.windi_voice_orders
  add column duration_days integer not null default 30 check (duration_days between 1 and 365);

alter table public.windi_voice_plans drop constraint if exists windi_voice_plans_price_vnd_check;
alter table public.windi_voice_plans add constraint windi_voice_plans_price_vnd_check check (price_vnd >= 0);
alter table public.windi_voice_plans drop constraint if exists windi_voice_plans_clone_limit_check;
alter table public.windi_voice_plans add constraint windi_voice_plans_clone_limit_check check (clone_limit >= 0);
alter table public.windi_voice_orders drop constraint if exists windi_voice_orders_amount_vnd_check;
alter table public.windi_voice_orders add constraint windi_voice_orders_amount_vnd_check check (amount_vnd >= 0);
alter table public.windi_voice_orders drop constraint if exists windi_voice_orders_clone_limit_check;
alter table public.windi_voice_orders add constraint windi_voice_orders_clone_limit_check check (clone_limit >= 0);

insert into public.windi_voice_plans(id,name,price_vnd,credits,clone_limit,duration_days,active) values
  ('welcome','Chào mừng',0,1500,0,7,false),
  ('trial','Clone thử đầu tiên',29000,10000,1,14,true)
on conflict (id) do update set
  name=excluded.name, price_vnd=excluded.price_vnd, credits=excluded.credits,
  clone_limit=excluded.clone_limit, duration_days=excluded.duration_days, active=excluded.active;

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
    new.id,'welcome',0,1500,0,7,'paid','welcome:' || new.id::text,now(),now()
  ) returning id into welcome_order;

  insert into public.windi_voice_periods(
    user_id,order_id,plan_id,starts_at,ends_at,credits,clone_limit
  ) values (
    new.id,welcome_order,'welcome',now(),now()+interval '7 days',1500,0
  ) returning id into welcome_period;

  insert into public.windi_voice_ledger(user_id,period_id,kind,amount)
  values(new.id,welcome_period,'grant',1500);
  return new;
end;
$$;
revoke all on function public.windi_voice_welcome_new_user() from public, anon, authenticated;

drop trigger if exists windi_voice_welcome_new_user on auth.users;
create trigger windi_voice_welcome_new_user
after insert on auth.users
for each row execute function public.windi_voice_welcome_new_user();

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

  update public.windi_voice_orders
  set status='expired'
  where user_id=p_user and status='pending' and expires_at<=now();
  select * into current_order from public.windi_voice_orders
  where user_id=p_user and status='pending'
  order by created_at desc limit 1;
  if found then
    if current_order.plan_id<>p_plan then raise exception 'PENDING_ORDER'; end if;
    return current_order;
  end if;

  insert into public.windi_voice_orders(user_id,plan_id,amount_vnd,credits,clone_limit,duration_days)
  values(p_user,plan.id,charge,plan.credits,plan.clone_limit,plan.duration_days)
  returning * into current_order;
  return current_order;
end;
$$;

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
  select * into voice_order from public.windi_voice_orders where payment_code=p_code;
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

create or replace function public.windi_voice_clone_reserve(p_user uuid,p_key uuid,p_name text,p_language text)
returns public.windi_voice_clones
language plpgsql
security invoker
set search_path = ''
as $$
declare
  active_period public.windi_voice_periods;
  clone_row public.windi_voice_clones;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,73));
  select * into clone_row from public.windi_voice_clones where user_id=p_user and request_key=p_key;
  if found then return clone_row; end if;
  select * into active_period from public.windi_voice_periods
  where user_id=p_user and starts_at<=now() and ends_at>now()
  order by ends_at desc limit 1 for update;
  if not found then raise exception 'NO_SUBSCRIPTION'; end if;
  if active_period.plan_id='welcome' then raise exception 'CLONE_REQUIRES_TRIAL'; end if;
  if active_period.clones_used>=active_period.clone_limit
    or (select count(*) from public.windi_voice_clones where user_id=p_user and status in ('ready','reserved','pending'))>=active_period.clone_limit then
    raise exception 'CLONE_LIMIT';
  end if;
  if exists(select 1 from public.windi_voice_clones where user_id=p_user and status in ('reserved','pending')) then raise exception 'REQUEST_PENDING'; end if;
  update public.windi_voice_periods set clones_used=clones_used+1 where id=active_period.id;
  insert into public.windi_voice_clones(user_id,period_id,request_key,name,language)
  values(p_user,active_period.id,p_key,p_name,p_language) returning * into clone_row;
  return clone_row;
end;
$$;

create or replace function public.windi_voice_clone_remove(p_user uuid,p_clone uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  clone_row public.windi_voice_clones;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,73));
  select * into clone_row from public.windi_voice_clones
  where id=p_clone and user_id=p_user and status='ready' for update;
  if not found then raise exception 'CLONE_NOT_FOUND'; end if;
  update public.windi_voice_clones set status='deleted' where id=clone_row.id;
  update public.windi_voice_periods
  set clones_used=greatest(clones_used-1,0)
  where id=clone_row.period_id;
end;
$$;

revoke all on function public.windi_voice_order(uuid,text),public.windi_voice_pay(text,text,integer),public.windi_voice_reserve(uuid,uuid,text,text,text,text,numeric),public.windi_voice_finish(uuid,boolean,text),public.windi_voice_clone_reserve(uuid,uuid,text,text),public.windi_voice_clone_finish(uuid,text),public.windi_voice_clone_remove(uuid,uuid) from public,anon,authenticated;
grant execute on function public.windi_voice_order(uuid,text),public.windi_voice_pay(text,text,integer),public.windi_voice_reserve(uuid,uuid,text,text,text,text,numeric),public.windi_voice_finish(uuid,boolean,text),public.windi_voice_clone_reserve(uuid,uuid,text,text),public.windi_voice_clone_finish(uuid,text),public.windi_voice_clone_remove(uuid,uuid) to service_role;

notify pgrst, 'reload schema';
commit;
