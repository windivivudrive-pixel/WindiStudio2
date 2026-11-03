begin;
select pg_advisory_xact_lock(871942003);
alter table public.windi_gemini_products drop constraint windi_gemini_product_catalog_check;
alter table public.windi_gemini_products add constraint windi_gemini_product_catalog_check check (
(sku='gemini-3m' and duration_months=3 and price_vnd=69000 and original_price_vnd=150000)
or (sku='gemini-18m' and duration_months=18 and price_vnd=49000 and original_price_vnd=49000)
or (sku='gemini-managed-6m' and duration_months=6 and price_vnd=189000 and original_price_vnd=189000)
or (sku='gemini-managed-12m' and duration_months=12 and price_vnd=329000 and original_price_vnd=329000)
or (sku='gemini-managed-24m' and duration_months=24 and price_vnd=599000 and original_price_vnd=599000));
insert into public.windi_gemini_products(sku,title,duration_months,price_vnd,original_price_vnd,enabled) values
('gemini-managed-6m','Gemini nâng chính chủ 6 tháng',6,189000,189000,false),
('gemini-managed-12m','Gemini nâng chính chủ 12 tháng',12,329000,329000,false),
('gemini-managed-24m','Gemini nâng chính chủ 24 tháng',24,599000,599000,false);
alter table public.windi_gemini_orders drop constraint windi_gemini_order_product_price_check;
alter table public.windi_gemini_orders add constraint windi_gemini_order_product_price_check check (
(product_sku='gemini-3m' and duration_months=3 and amount_vnd in (69000,150000))
or (product_sku='gemini-18m' and duration_months=18 and amount_vnd=49000)
or (product_sku='gemini-managed-6m' and duration_months=6 and amount_vnd=189000)
or (product_sku='gemini-managed-12m' and duration_months=12 and amount_vnd=329000)
or (product_sku='gemini-managed-24m' and duration_months=24 and amount_vnd=599000));
alter table public.windi_gemini_orders drop constraint windi_gemini_orders_check;
alter table public.windi_gemini_orders add constraint windi_gemini_orders_check check (
status <> 'PAID' or (paid_at is not null and (activation_id is not null or product_sku in ('gemini-managed-6m','gemini-managed-12m','gemini-managed-24m'))));
create or replace function public.windi_gemini_stock(p_sku text) returns integer
language plpgsql security invoker set search_path='' as $$
declare remaining integer;
begin
  perform pg_advisory_xact_lock(871942003);
  if not exists(select 1 from public.windi_gemini_products where sku=p_sku) then raise exception 'GEMINI_INVALID_PRODUCT'; end if;
  update public.windi_gemini_orders set status='EXPIRED',activation_id=null where status='PENDING' and expires_at<=now();
  if p_sku in ('gemini-managed-6m','gemini-managed-12m','gemini-managed-24m') then return 1; end if;
  select count(*)::integer into remaining from public.windi_gemini_links l
    where l.product_sku=p_sku and not l.disabled and l.valid_until>now()+interval '10 minutes'
      and not exists(select 1 from public.windi_gemini_orders o where o.activation_id=l.id);
  return remaining;
end $$;
create or replace function public.windi_gemini_catalog()
returns table(sku text,title text,duration_months integer,price_vnd integer,enabled boolean,stock integer)
language plpgsql security invoker set search_path='' as $$
begin
  perform public.windi_gemini_stock('gemini-3m');
  return query select p.sku,p.title,p.duration_months,p.price_vnd,p.enabled,
    case when p.sku in ('gemini-managed-6m','gemini-managed-12m','gemini-managed-24m') then 1 else (select count(*)::integer from public.windi_gemini_links l where l.product_sku=p.sku and not l.disabled
      and l.valid_until>now()+interval '10 minutes' and not exists(select 1 from public.windi_gemini_orders o where o.activation_id=l.id)) end
    from public.windi_gemini_products p order by p.duration_months;
end $$;

create or replace function public.windi_gemini_order(p_user uuid,p_sku text) returns public.windi_gemini_orders
language plpgsql security invoker set search_path='' as $$
declare target public.windi_gemini_orders; product public.windi_gemini_products; link_id uuid;
begin
  perform public.windi_gemini_stock(p_sku);
  select * into product from public.windi_gemini_products where sku=p_sku;
  if not product.enabled then raise exception 'GEMINI_DISABLED'; end if;
  select * into target from public.windi_gemini_orders where user_id=p_user and product_sku=p_sku and status='PENDING' order by created_at desc limit 1;
  if found then return target; end if;
  if p_sku in ('gemini-managed-6m','gemini-managed-12m','gemini-managed-24m') then
    insert into public.windi_gemini_orders(user_id,product_sku,duration_months,amount_vnd,terms_version)
      values(p_user,p_sku,product.duration_months,product.price_vnd,'gemini-managed-2026-11-03') returning * into target;
    return target;
  end if;
  select l.id into link_id from public.windi_gemini_links l
    where l.product_sku=p_sku and not l.disabled and l.valid_until>now()+interval '10 minutes'
      and not exists(select 1 from public.windi_gemini_orders o where o.activation_id=l.id)
    order by l.valid_until,l.created_at,l.id limit 1 for update;
  if link_id is null then raise exception 'GEMINI_OUT_OF_STOCK'; end if;
  insert into public.windi_gemini_orders(user_id,activation_id,product_sku,duration_months,amount_vnd,terms_version)
    values(p_user,link_id,p_sku,product.duration_months,product.price_vnd,
      case p_sku when 'gemini-18m' then 'gemini-18m-2026-10-27' else 'gemini-3m-2026-10-26' end) returning * into target;
  return target;
end $$;
create or replace function public.windi_gemini_product_settings(p_sku text,p_enabled boolean) returns void
language plpgsql security invoker set search_path='' as $$
begin
  if p_enabled is null then raise exception 'INVALID_INPUT'; end if;
  if public.windi_gemini_stock(p_sku)=0 and p_enabled then raise exception 'GEMINI_OUT_OF_STOCK'; end if;
  update public.windi_gemini_products set enabled=p_enabled,updated_at=now() where sku=p_sku;
  if not p_enabled and p_sku in ('gemini-managed-6m','gemini-managed-12m','gemini-managed-24m') then
    update public.windi_gemini_orders set status='EXPIRED' where product_sku=p_sku and status='PENDING';
  end if;
  if p_sku='gemini-3m' then update public.windi_gemini_settings set enabled=p_enabled,updated_at=now() where id; end if;
end $$;

create or replace function public.windi_gemini_pay(p_code text,p_gateway text,p_amount integer,p_paid_at timestamptz) returns text
language plpgsql security invoker set search_path='' as $$
declare target public.windi_gemini_orders; prior public.windi_gemini_payment_events; outcome text;
begin
  perform pg_advisory_xact_lock(871942003);
  select * into target from public.windi_gemini_orders where payment_code=p_code for update;
  if not found then return 'ignored'; end if;
  select * into prior from public.windi_gemini_payment_events where gateway_id=p_gateway;
  if found then return case when prior.order_id=target.id then prior.result else 'ignored' end; end if;
  if p_gateway is null or length(p_gateway)=0 or p_amount is null or p_amount<=0 or p_paid_at is null then raise exception 'INVALID_PAYMENT'; end if;
  outcome := case
    when target.status<>'PENDING' or target.expires_at<=now() or (target.activation_id is null and target.product_sku not in ('gemini-managed-6m','gemini-managed-12m','gemini-managed-24m'))
      or p_paid_at<target.created_at-interval '1 minute' or p_paid_at>target.expires_at or p_paid_at>now()+interval '5 minutes' then 'review'
    when target.product_sku not in ('gemini-managed-6m','gemini-managed-12m','gemini-managed-24m') and not exists(select 1 from public.windi_gemini_links where id=target.activation_id and not disabled and valid_until>now()) then 'review'
    when p_amount<target.amount_vnd then 'underpaid'
    when p_amount>target.amount_vnd then 'overpaid'
    else 'paid' end;
  insert into public.windi_gemini_payment_events(gateway_id,order_id,amount_vnd,transferred_at,result)
    values(p_gateway,target.id,p_amount,p_paid_at,outcome);
  -- A second transfer must never revoke an already delivered order.
  if target.status<>'PAID' then
    update public.windi_gemini_orders set
      status=case outcome when 'paid' then 'PAID' when 'underpaid' then 'UNDERPAID' when 'overpaid' then 'OVERPAID' else 'REVIEW_REQUIRED' end,
      paid_at=case when outcome='paid' then p_paid_at else null end where id=target.id;
  end if;
  return outcome;
end $$;

notify pgrst,'reload schema';
commit;
