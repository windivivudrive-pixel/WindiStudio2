begin;

create index if not exists windi_voice_orders_paid_plan
  on public.windi_voice_orders(user_id, plan_id)
  where status = 'paid';

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

  if plan.id='trial' and exists(
    select 1 from public.windi_voice_orders
    where user_id=p_user and status='paid' and plan_id in ('trial','starter','creator','studio')
  ) then
    raise exception 'TRIAL_ALREADY_USED';
  end if;

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
    if current_order.plan_id=p_plan then return current_order; end if;
    update public.windi_voice_orders set status='expired' where id=current_order.id;
  end if;

  insert into public.windi_voice_orders(user_id,plan_id,amount_vnd,credits,clone_limit,duration_days)
  values(p_user,plan.id,charge,plan.credits,plan.clone_limit,plan.duration_days)
  returning * into current_order;
  return current_order;
end;
$$;

revoke all on function public.windi_voice_order(uuid,text) from public,anon,authenticated;
grant execute on function public.windi_voice_order(uuid,text) to service_role;

-- Payment settlement is server-only. A later migration accidentally restored
-- EXECUTE to browser roles while updating the payment-code format.
revoke all on function public.windi_voice_pay(text,text,integer) from public,anon,authenticated;
grant execute on function public.windi_voice_pay(text,text,integer) to service_role;

notify pgrst, 'reload schema';
commit;
