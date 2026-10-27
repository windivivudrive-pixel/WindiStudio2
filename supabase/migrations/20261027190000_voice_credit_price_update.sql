begin;

-- Keep retired rows and existing orders so prior purchases retain their terms.
update public.windi_voice_plans set active=false
where id in ('trial','starter','creator','studio');

insert into public.windi_voice_plans(id,name,price_vnd,credits,clone_limit,duration_days,active)
values
  ('credit_10k','10.000 credit',39000,10000,1,30,true),
  ('credit_100k','100.000 credit',169000,100000,2,30,true),
  ('credit_1m','1.000.000 credit',699000,1000000,5,30,true)
on conflict (id) do update set
  name=excluded.name, price_vnd=excluded.price_vnd, credits=excluded.credits,
  clone_limit=excluded.clone_limit, duration_days=excluded.duration_days, active=true;

create or replace function public.windi_voice_order(p_user uuid,p_plan text)
returns public.windi_voice_orders
language plpgsql security invoker set search_path = '' as $$
declare
  plan public.windi_voice_plans;
  current_order public.windi_voice_orders;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,73));
  select * into plan from public.windi_voice_plans
  where id=p_plan and active and id in ('credit_10k','credit_100k','credit_1m');
  if not found then raise exception 'INVALID_PLAN'; end if;

  update public.windi_voice_orders set status='expired'
  where user_id=p_user and status='pending' and expires_at<=now();

  select * into current_order from public.windi_voice_orders
  where user_id=p_user and status='pending' order by created_at desc limit 1;
  if found then
    if current_order.plan_id=p_plan and current_order.amount_vnd=plan.price_vnd
       and current_order.credits=plan.credits and current_order.clone_limit=plan.clone_limit
       and current_order.duration_days=plan.duration_days then
      return current_order;
    end if;
    -- Preserve the old payment code and its original deadline for webhook reconciliation.
    update public.windi_voice_orders set status='expired' where id=current_order.id;
  end if;

  insert into public.windi_voice_orders(user_id,plan_id,amount_vnd,credits,clone_limit,duration_days)
  values(p_user,plan.id,plan.price_vnd,plan.credits,plan.clone_limit,plan.duration_days)
  returning * into current_order;
  return current_order;
end $$;

revoke all on function public.windi_voice_order(uuid,text) from public,anon,authenticated;
grant execute on function public.windi_voice_order(uuid,text) to service_role;
notify pgrst,'reload schema';
commit;
