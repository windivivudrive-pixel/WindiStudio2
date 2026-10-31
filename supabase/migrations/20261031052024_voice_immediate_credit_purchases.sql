begin;

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

  period_start := now();

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


notify pgrst, 'reload schema';
commit;
