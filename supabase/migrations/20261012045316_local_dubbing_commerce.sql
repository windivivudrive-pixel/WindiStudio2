begin;
alter table public.product_entitlements drop constraint product_entitlements_kind_check;
alter table public.product_entitlements add constraint product_entitlements_kind_check
  check(kind in ('video_workflow_v1','local_dubbing_v1'));

-- Open sales only after a reviewed ZIP has been uploaded and published.
insert into public.products(name,type,description,price_vnd,is_active,metadata)
select 'Windi Dubbing Kit','VIDEO_KIT_LICENSE','Bộ kit lồng tiếng Việt, chỉnh lời dịch, chọn giọng và xuất video có phụ đề.',169000,false,
  '{"sku":"windi-dubbing-kit-v1","release_ready":false}'::jsonb
where not exists(select 1 from public.products where metadata->>'sku'='windi-dubbing-kit-v1');

create or replace function public.windi_dubbing_kit_order(p_user uuid)
returns public.orders language plpgsql security invoker set search_path='' as $$
declare product public.products; current_order public.orders;
begin
  perform pg_advisory_xact_lock(871942001);
  select * into product from public.products where metadata->>'sku'='windi-dubbing-kit-v1' limit 1;
  if not found or not product.is_active or coalesce((product.metadata->>'release_ready')::boolean,false)=false
    or not exists(select 1 from public.product_releases where product_id=product.id and is_published)
  then raise exception 'DUBBING_KIT_NOT_RELEASED'; end if;
  if exists(select 1 from public.product_entitlements where user_id=p_user and product_id=product.id and status='active')
  then raise exception 'DUBBING_KIT_ALREADY_OWNED'; end if;
  update public.orders o set status='EXPIRED' where o.user_id=p_user and o.status='PENDING' and o.expires_at<=now();
  select o.* into current_order from public.orders o join public.order_items i on i.order_id=o.id
    where o.user_id=p_user and o.status='PENDING' and i.product_id=product.id order by o.created_at desc limit 1;
  if found then return current_order; end if;
  insert into public.orders(user_id,total_amount_vnd,status,payment_code,created_at,expires_at)
    values(p_user,product.price_vnd,'PENDING','WINDI K'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),now(),now()+interval '10 minutes') returning * into current_order;
  insert into public.order_items(order_id,product_id,quantity,price_vnd) values(current_order.id,product.id,1,product.price_vnd);
  return current_order;
end $$;
revoke all on function public.windi_dubbing_kit_order(uuid) from public,anon,authenticated;
grant execute on function public.windi_dubbing_kit_order(uuid) to service_role;

create or replace function public.windi_video_kit_pay(p_code text,p_gateway text,p_amount integer,p_payload jsonb)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target public.orders;
  item record;
  prior_status public.order_status;
  granted_entitlement uuid;
  trial_order_id uuid;
  trial_period_id uuid;
begin
  select o.status into prior_status
  from public.payment_events e
  left join public.orders o on o.id=e.order_id
  where e.gateway_id=p_gateway;
  if found then
    return case prior_status
      when 'PAID' then 'paid'
      when 'UNDERPAID' then 'underpaid'
      when 'OVERPAID' then 'overpaid'
      else 'review'
    end;
  end if;

  select * into target from public.orders where payment_code=p_code for update;
  if not found then return 'ignored'; end if;
  perform pg_advisory_xact_lock(871942001);
  if target.status='PAID' then return 'paid'; end if;

  insert into public.payment_events(gateway_id,order_id,amount,payload)
  values(p_gateway,target.id,p_amount,p_payload);
  if target.status<>'PENDING' or target.expires_at<=now() then
    update public.orders set status='REVIEW_REQUIRED' where id=target.id;
    return 'review';
  end if;
  if p_amount<target.total_amount_vnd then
    update public.orders set status='UNDERPAID' where id=target.id;
    return 'underpaid';
  end if;
  if p_amount>target.total_amount_vnd then
    update public.orders set status='OVERPAID' where id=target.id;
    return 'overpaid';
  end if;

  update public.orders set status='PAID' where id=target.id;
  for item in
    select i.id,i.product_id,p.type,p.metadata
    from public.order_items i
    join public.products p on p.id=i.product_id
    where i.order_id=target.id
  loop
    if item.type='VIDEO_KIT_LICENSE' and item.metadata->>'sku'='windi-dubbing-kit-v1' then
      insert into public.product_entitlements(user_id,product_id,order_item_id,kind,voice_credits)
      values(target.user_id,item.product_id,item.id,'local_dubbing_v1',0)
      on conflict(user_id,product_id) do update set status='active',updated_at=now();
    elsif item.type='VIDEO_KIT_LICENSE' and item.metadata->>'sku'='windi-video-workflow-v1' then
      insert into public.product_entitlements(user_id,product_id,order_item_id,kind,voice_credits)
      values(target.user_id,item.product_id,item.id,'video_workflow_v1',0)
      on conflict(user_id,product_id) do update set updated_at=now()
      returning id into granted_entitlement;

      insert into public.windi_voice_orders(user_id,plan_id,amount_vnd,credits,clone_limit,duration_days,status,gateway_id,expires_at,paid_at)
      values(target.user_id,'trial',0,3000,1,30,'paid','workflow:'||granted_entitlement::text,now(),now())
      on conflict(gateway_id) do update set gateway_id=excluded.gateway_id
      returning id into trial_order_id;

      insert into public.windi_voice_periods(user_id,order_id,plan_id,starts_at,ends_at,credits,clone_limit)
      values(target.user_id,trial_order_id,'trial',now(),now()+interval '30 days',3000,1)
      on conflict(order_id) do nothing returning id into trial_period_id;
      if trial_period_id is not null then
        insert into public.windi_voice_ledger(user_id,period_id,kind,amount)
        values(target.user_id,trial_period_id,'grant',3000);
      end if;
    end if;
  end loop;

  delete from public.video_kit_reservations where order_id=target.id;
  return 'paid';
end
$$;

revoke all on function public.windi_video_kit_pay(text,text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.windi_video_kit_pay(text,text,integer,jsonb) to service_role;

notify pgrst, 'reload schema';
commit;
