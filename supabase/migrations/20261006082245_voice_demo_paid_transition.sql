begin;
-- Temporary demos never occupy paid slots. Buying a plan keeps the current demo.
create or replace function public.windi_voice_clone_reserve_paid(p_user uuid,p_key uuid,p_name text,p_language text,p_accent text default null) returns public.windi_voice_clones
language plpgsql security invoker set search_path = '' as $$
declare active_period public.windi_voice_periods; clone_row public.windi_voice_clones;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,73));
 select * into clone_row from public.windi_voice_clones where user_id=p_user and request_key=p_key;
 if found then return clone_row; end if;
 if exists(select 1 from public.windi_voice_admins where user_id=p_user) then
  if exists(select 1 from public.windi_voice_clones where user_id=p_user and not is_demo and status in ('reserved','pending')) then raise exception 'REQUEST_PENDING'; end if;
  insert into public.windi_voice_clones(user_id,request_key,name,language,accent,admin_funded) values(p_user,p_key,p_name,p_language,p_accent,true) returning * into clone_row;
  return clone_row;
 end if;
 select * into active_period from public.windi_voice_periods where user_id=p_user and plan_id<>'welcome' and starts_at<=now() and ends_at>now() order by ends_at desc limit 1 for update;
 if not found then raise exception 'NO_SUBSCRIPTION'; end if;
 if active_period.plan_id='welcome' then raise exception 'CLONE_REQUIRES_TRIAL'; end if;
 if active_period.clones_used>=active_period.clone_limit or (select count(*) from public.windi_voice_clones where user_id=p_user and not is_demo and status in ('ready','reserved','pending'))>=active_period.clone_limit then raise exception 'CLONE_LIMIT'; end if;
 if exists(select 1 from public.windi_voice_clones where user_id=p_user and not is_demo and status in ('reserved','pending')) then raise exception 'REQUEST_PENDING'; end if;
 update public.windi_voice_periods set clones_used=clones_used+1 where id=active_period.id;
 insert into public.windi_voice_clones(user_id,period_id,request_key,name,language,accent) values(p_user,active_period.id,p_key,p_name,p_language,p_accent) returning * into clone_row;
 return clone_row;
end $$;

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
  new_period_id uuid;
  effective_paid_at timestamptz;
  period_start timestamptz;
  retained_clone public.windi_voice_clones;
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
  where user_id=voice_order.user_id and ends_at>now() and plan_id<>'welcome';
  period_start := greatest(now(),coalesce(period_start,now()));

  insert into public.windi_voice_periods(user_id,order_id,plan_id,starts_at,ends_at,credits,clone_limit)
  values(
    voice_order.user_id,voice_order.id,voice_order.plan_id,period_start,
    period_start+make_interval(days => voice_order.duration_days),voice_order.credits,voice_order.clone_limit
  ) returning id into new_period_id;
  insert into public.windi_voice_ledger(user_id,period_id,kind,amount)
  values(voice_order.user_id,new_period_id,'grant',voice_order.credits);
  update public.windi_voice_orders
  set status='paid',paid_at=effective_paid_at,gateway_id=p_gateway
  where id=voice_order.id;
    select * into retained_clone from public.windi_voice_clones
    where user_id=voice_order.user_id and (
      id=voice_order.demo_clone_id or
      (voice_order.demo_clone_id is null and is_demo and status='ready' and demo_expires_at>now())
    ) order by created_at desc limit 1 for update;
    if found and retained_clone.is_demo and retained_clone.status='ready'
      and retained_clone.demo_expires_at>now() and retained_clone.provider_id is not null
      and period_start<=now() then
      update public.windi_voice_clones set is_demo=false,demo_expires_at=null,period_id=new_period_id,cleanup_at=null
      where id=retained_clone.id;
      update public.windi_voice_periods set clones_used=1 where id=new_period_id;
      update public.windi_voice_orders set demo_clone_id=retained_clone.id where id=voice_order.id;
    end if;
  return 'paid';
end;
$$;

revoke all on function public.windi_voice_pay(text,text,integer,timestamptz) from public,anon,authenticated;
grant execute on function public.windi_voice_pay(text,text,integer,timestamptz) to service_role;


notify pgrst,'reload schema';
commit;
