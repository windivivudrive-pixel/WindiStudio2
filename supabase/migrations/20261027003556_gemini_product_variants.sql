begin;
create table public.windi_gemini_products (
  sku text primary key,
  title text not null,
  duration_months integer not null,
  price_vnd integer not null,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint windi_gemini_product_catalog_check check (
    (sku='gemini-3m' and duration_months=3 and price_vnd=150000)
    or (sku='gemini-18m' and duration_months=18 and price_vnd=49000)
  )
);
alter table public.windi_gemini_products enable row level security;
revoke all on public.windi_gemini_products from public,anon,authenticated;
grant all on public.windi_gemini_products to service_role;
insert into public.windi_gemini_products(sku,title,duration_months,price_vnd,enabled)
  select 'gemini-3m','Gemini 3 tháng',3,150000,enabled from public.windi_gemini_settings where id;
insert into public.windi_gemini_products(sku,title,duration_months,price_vnd)
  values('gemini-18m','Gemini 18 tháng',18,49000);

-- Existing links and orders keep their original 3-month product and price.
alter table public.windi_gemini_links add column product_sku text not null default 'gemini-3m' references public.windi_gemini_products(sku);
alter table public.windi_gemini_links add constraint windi_gemini_link_product_unique unique(id,product_sku);
alter table public.windi_gemini_orders add column product_sku text not null default 'gemini-3m' references public.windi_gemini_products(sku);
alter table public.windi_gemini_orders add column duration_months integer not null default 3;
alter table public.windi_gemini_orders drop constraint windi_gemini_orders_amount_vnd_check;
alter table public.windi_gemini_orders add constraint windi_gemini_order_product_price_check check (
  (product_sku='gemini-3m' and duration_months=3 and amount_vnd=150000)
  or (product_sku='gemini-18m' and duration_months=18 and amount_vnd=49000)
);
alter table public.windi_gemini_orders add constraint windi_gemini_order_link_product_fk
  foreign key(activation_id,product_sku) references public.windi_gemini_links(id,product_sku);
create index windi_gemini_links_product on public.windi_gemini_links(product_sku,valid_until);
create index windi_gemini_orders_user_product on public.windi_gemini_orders(user_id,product_sku,created_at desc);

-- The legacy 3-month settings/API remain compatible during deployment.
create function public.windi_gemini_sync_legacy_settings() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  update public.windi_gemini_products set enabled=new.enabled,updated_at=now() where sku='gemini-3m';
  return new;
end $$;
create trigger windi_gemini_legacy_settings_sync after update on public.windi_gemini_settings
  for each row execute function public.windi_gemini_sync_legacy_settings();

create function public.windi_gemini_stock(p_sku text) returns integer
language plpgsql security invoker set search_path='' as $$
declare remaining integer;
begin
  perform pg_advisory_xact_lock(871942003);
  if not exists(select 1 from public.windi_gemini_products where sku=p_sku) then raise exception 'GEMINI_INVALID_PRODUCT'; end if;
  update public.windi_gemini_orders set status='EXPIRED',activation_id=null where status='PENDING' and expires_at<=now();
  select count(*)::integer into remaining from public.windi_gemini_links l
    where l.product_sku=p_sku and not l.disabled and l.valid_until>now()+interval '10 minutes'
      and not exists(select 1 from public.windi_gemini_orders o where o.activation_id=l.id);
  return remaining;
end $$;
create or replace function public.windi_gemini_stock() returns integer
language sql security invoker set search_path='' as $$select public.windi_gemini_stock('gemini-3m');$$;

create function public.windi_gemini_catalog()
returns table(sku text,title text,duration_months integer,price_vnd integer,enabled boolean,stock integer)
language plpgsql security invoker set search_path='' as $$
begin
  perform public.windi_gemini_stock('gemini-3m');
  return query select p.sku,p.title,p.duration_months,p.price_vnd,p.enabled,
    (select count(*)::integer from public.windi_gemini_links l where l.product_sku=p.sku and not l.disabled
      and l.valid_until>now()+interval '10 minutes' and not exists(select 1 from public.windi_gemini_orders o where o.activation_id=l.id))
    from public.windi_gemini_products p order by p.duration_months;
end $$;

create function public.windi_gemini_order(p_user uuid,p_sku text) returns public.windi_gemini_orders
language plpgsql security invoker set search_path='' as $$
declare target public.windi_gemini_orders; product public.windi_gemini_products; link_id uuid;
begin
  perform public.windi_gemini_stock(p_sku);
  select * into product from public.windi_gemini_products where sku=p_sku;
  if not product.enabled then raise exception 'GEMINI_DISABLED'; end if;
  select * into target from public.windi_gemini_orders where user_id=p_user and product_sku=p_sku and status='PENDING' order by created_at desc limit 1;
  if found then return target; end if;
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
create or replace function public.windi_gemini_order(p_user uuid) returns public.windi_gemini_orders
language sql security invoker set search_path='' as $$select public.windi_gemini_order(p_user,'gemini-3m');$$;

create function public.windi_gemini_import(p_urls text[],p_valid_until timestamptz,p_sku text) returns integer
language plpgsql security invoker set search_path='' as $$
declare added integer;
begin
  perform pg_advisory_xact_lock(871942003);
  if not exists(select 1 from public.windi_gemini_products where sku=p_sku) then raise exception 'GEMINI_INVALID_PRODUCT'; end if;
  if p_urls is null or cardinality(p_urls)<1 or cardinality(p_urls)>500 or p_valid_until is null or p_valid_until<=now()+interval '10 minutes' then raise exception 'INVALID_STOCK'; end if;
  insert into public.windi_gemini_links(activation_url,valid_until,product_sku)
    select distinct unnest(p_urls),p_valid_until,p_sku on conflict(activation_url) do nothing;
  get diagnostics added=row_count;
  return added;
end $$;
create or replace function public.windi_gemini_import(p_urls text[],p_valid_until timestamptz) returns integer
language sql security invoker set search_path='' as $$select public.windi_gemini_import(p_urls,p_valid_until,'gemini-3m');$$;

create function public.windi_gemini_product_settings(p_sku text,p_enabled boolean) returns void
language plpgsql security invoker set search_path='' as $$
begin
  if p_enabled is null then raise exception 'INVALID_INPUT'; end if;
  if public.windi_gemini_stock(p_sku)=0 and p_enabled then raise exception 'GEMINI_OUT_OF_STOCK'; end if;
  update public.windi_gemini_products set enabled=p_enabled,updated_at=now() where sku=p_sku;
  if p_sku='gemini-3m' then update public.windi_gemini_settings set enabled=p_enabled,updated_at=now() where id; end if;
end $$;

revoke all on function public.windi_gemini_stock(text),public.windi_gemini_catalog(),public.windi_gemini_order(uuid,text),public.windi_gemini_import(text[],timestamptz,text),public.windi_gemini_product_settings(text,boolean),public.windi_gemini_sync_legacy_settings() from public,anon,authenticated;
grant execute on function public.windi_gemini_stock(text),public.windi_gemini_catalog(),public.windi_gemini_order(uuid,text),public.windi_gemini_import(text[],timestamptz,text),public.windi_gemini_product_settings(text,boolean),public.windi_gemini_sync_legacy_settings() to service_role;
notify pgrst,'reload schema';
commit;
