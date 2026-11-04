begin;
select pg_advisory_xact_lock(871942003);
alter table public.windi_gemini_links drop constraint if exists windi_gemini_links_activation_url_check;
alter table public.windi_gemini_links drop constraint if exists windi_gemini_links_product_activation_url_check;
alter table public.windi_gemini_links add constraint windi_gemini_links_product_activation_url_check check (
 (activation_url ~ '^https://one[.]google[.]com/offer/[A-Za-z0-9_-]{8,128}$') or
 (product_sku='gemini-18m' and activation_url ~ '^https://serviceactivation[.]link/subscription/new/[A-Za-z0-9_-]{16,}={0,2}$' and char_length(activation_url) <= char_length('https://serviceactivation.link/subscription/new/') + 514) or
 (product_sku='gemini-managed-6m' and activation_url ~ '^GEM6-[A-Z0-9]{16,128}$') or
 (product_sku='gemini-managed-12m' and activation_url ~ '^GEM12-[A-Z0-9]{16,128}$') or
 (product_sku='gemini-managed-24m' and activation_url ~ '^GEM24-[A-Z0-9]{16,128}$'));
create or replace function public.windi_gemini_stock(p_sku text) returns integer
language plpgsql security invoker set search_path='' as $$
declare remaining integer;
begin
  perform pg_advisory_xact_lock(871942003);
  if not exists(select 1 from public.windi_gemini_products where sku=p_sku) then raise exception 'GEMINI_INVALID_PRODUCT'; end if;
  update public.windi_gemini_orders set status='EXPIRED',activation_id=null where status='PENDING' and expires_at<=now();
  if exists(select 1 from public.windi_gemini_products where sku=p_sku and delivery_mode='manual' and sku not in ('gemini-managed-6m','gemini-managed-12m','gemini-managed-24m')) then return 1; end if;
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
    case when p.delivery_mode='manual' and p.sku not in ('gemini-managed-6m','gemini-managed-12m','gemini-managed-24m') then 1 else (select count(*)::integer from public.windi_gemini_links l where l.product_sku=p.sku and not l.disabled
      and l.valid_until>now()+interval '10 minutes' and not exists(select 1 from public.windi_gemini_orders o where o.activation_id=l.id)) end
    from public.windi_gemini_products p order by p.duration_months;
end $$;

create or replace function public.windi_gemini_order(p_user uuid,p_sku text) returns public.windi_gemini_orders
language plpgsql security invoker set search_path='' as $$
declare target public.windi_gemini_orders; product public.windi_gemini_products; link_id uuid;
begin
  perform public.windi_gemini_stock(p_sku);
  select * into product from public.windi_gemini_products where sku=p_sku;
  if not product.enabled or not product.published or not product.price_confirmed then raise exception 'GEMINI_DISABLED'; end if;
  select * into target from public.windi_gemini_orders where user_id=p_user and product_sku=p_sku and status='PENDING' order by created_at desc limit 1;
  if found then return target; end if;
  if exists(select 1 from public.windi_gemini_products where sku=p_sku and delivery_mode='manual' and sku not in ('gemini-managed-6m','gemini-managed-12m','gemini-managed-24m')) then
    insert into public.windi_gemini_orders(user_id,product_sku,duration_months,amount_vnd,terms_version,delivery_mode,product_title)
      values(p_user,p_sku,product.duration_months,product.price_vnd,product.terms_version,'manual',product.title) returning * into target;
    return target;
  end if;
  select l.id into link_id from public.windi_gemini_links l
    where l.product_sku=p_sku and not l.disabled and l.valid_until>now()+interval '10 minutes'
      and not exists(select 1 from public.windi_gemini_orders o where o.activation_id=l.id)
    order by l.valid_until,l.created_at,l.id limit 1 for update;
  if link_id is null then raise exception 'GEMINI_OUT_OF_STOCK'; end if;
  insert into public.windi_gemini_orders(user_id,activation_id,product_sku,duration_months,amount_vnd,terms_version,product_title)
    values(p_user,link_id,p_sku,product.duration_months,product.price_vnd,
      product.terms_version,product.title) returning * into target;
  return target;
end $$;
create or replace function public.windi_gemini_product_settings(p_sku text,p_enabled boolean) returns void
language plpgsql security invoker set search_path='' as $$
begin
  if p_enabled is null then raise exception 'INVALID_INPUT'; end if;
  if p_enabled and exists(select 1 from public.windi_gemini_products where sku=p_sku and (not published or not price_confirmed)) then raise exception 'SHOP_NOT_READY'; end if;
  if public.windi_gemini_stock(p_sku)=0 and p_enabled then raise exception 'GEMINI_OUT_OF_STOCK'; end if;
  update public.windi_gemini_products set enabled=p_enabled,updated_at=now() where sku=p_sku;
  if not p_enabled and exists(select 1 from public.windi_gemini_products where sku=p_sku and delivery_mode='manual' and sku not in ('gemini-managed-6m','gemini-managed-12m','gemini-managed-24m')) then
    update public.windi_gemini_orders set status='EXPIRED',activation_id=case when p_sku in ('gemini-managed-6m','gemini-managed-12m','gemini-managed-24m') then null else activation_id end where product_sku=p_sku and status='PENDING';
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
    when target.status<>'PENDING' or target.expires_at<=now() or (target.activation_id is null and target.delivery_mode<>'manual')
      or p_paid_at<target.created_at-interval '1 minute' or p_paid_at>target.expires_at or p_paid_at>now()+interval '5 minutes' then 'review'
    when target.activation_id is not null and not exists(select 1 from public.windi_gemini_links where id=target.activation_id and not disabled and valid_until>now()) then 'review'
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
