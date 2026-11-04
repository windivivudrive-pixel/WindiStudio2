begin;
select pg_advisory_xact_lock(871942003);
create or replace function public.windi_gemini_catalog()
returns table(sku text,title text,duration_months integer,price_vnd integer,enabled boolean,stock integer)
language plpgsql security invoker set search_path='' as $$
begin
  perform public.windi_gemini_stock('gemini-3m');
  return query select p.sku,p.title,p.duration_months,p.price_vnd,p.enabled,
    case when p.delivery_mode='manual' and p.sku not in ('gemini-managed-6m','gemini-managed-12m','gemini-managed-24m') then 1 when p.sku in ('gemini-managed-6m','gemini-managed-12m','gemini-managed-24m') then greatest(1, (select count(*)::integer from public.windi_gemini_links l where l.product_sku=p.sku and not l.disabled and l.valid_until>now()+interval '10 minutes' and not exists(select 1 from public.windi_gemini_orders o where o.activation_id=l.id))) else (select count(*)::integer from public.windi_gemini_links l where l.product_sku=p.sku and not l.disabled
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
  if link_id is null then
    if p_sku not in ('gemini-managed-6m','gemini-managed-12m','gemini-managed-24m') then raise exception 'GEMINI_OUT_OF_STOCK'; end if;
    insert into public.windi_gemini_orders(user_id,product_sku,duration_months,amount_vnd,terms_version,delivery_mode,product_title)
      values(p_user,p_sku,product.duration_months,product.price_vnd,product.terms_version,'manual',product.title) returning * into target;
    return target;
  end if;
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
  if public.windi_gemini_stock(p_sku)=0 and p_enabled and p_sku not in ('gemini-managed-6m','gemini-managed-12m','gemini-managed-24m') then raise exception 'GEMINI_OUT_OF_STOCK'; end if;
  update public.windi_gemini_products set enabled=p_enabled,updated_at=now() where sku=p_sku;
  if not p_enabled and exists(select 1 from public.windi_gemini_products where sku=p_sku and delivery_mode='manual' and sku not in ('gemini-managed-6m','gemini-managed-12m','gemini-managed-24m')) then
    update public.windi_gemini_orders set status='EXPIRED',activation_id=case when p_sku in ('gemini-managed-6m','gemini-managed-12m','gemini-managed-24m') then null else activation_id end where product_sku=p_sku and status='PENDING';
  end if;
  if p_sku='gemini-3m' then update public.windi_gemini_settings set enabled=p_enabled,updated_at=now() where id; end if;
end $$;

notify pgrst,'reload schema';
commit;
