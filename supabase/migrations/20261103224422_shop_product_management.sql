begin;
select pg_advisory_xact_lock(871942003);
alter table public.windi_gemini_products
 add column price_confirmed boolean not null default true,
 add column description text not null default '',
 add column category text not null default 'AI & CÔNG VIỆC',
 add column benefits text[] not null default '{}',
 add column warranty_status text not null default 'unspecified' check(warranty_status in ('included','none','unspecified')),
 add column warranty text not null default '',
 add column notes text not null default '',
 add column thumbnail text not null default '',
 add column published boolean not null default true,
 add column delivery_mode text not null default 'manual' check(delivery_mode in ('manual','link')),
 add column terms_version text not null default 'shop-v1';
update public.windi_gemini_products set delivery_mode='link',terms_version=case sku when 'gemini-18m' then 'gemini-18m-2026-10-27' else 'gemini-3m-2026-10-26' end where sku in ('gemini-3m','gemini-18m');
update public.windi_gemini_products set terms_version='gemini-managed-2026-11-03',thumbnail='/gemini-products/gemini-chinh-chu.png' where sku like 'gemini-managed-%';
update public.windi_gemini_products set thumbnail='/gemini-products/gemini-3-thang.png',warranty_status='none',notes='Gói không bảo hành. Đọc điều kiện kích hoạt trước khi mua.' where sku='gemini-3m';
alter table public.windi_gemini_products drop constraint windi_gemini_product_catalog_check;
alter table public.windi_gemini_products add constraint windi_gemini_product_catalog_check check (
 sku ~ '^[a-z0-9][a-z0-9-]{2,79}$' and duration_months between 1 and 120 and length(title) between 1 and 160
 and price_vnd between 1000 and 100000000 and original_price_vnd between price_vnd and 100000000);
alter table public.windi_gemini_orders add column delivery_mode text not null default 'link' check(delivery_mode in ('manual','link')),
 add column product_title text not null default '';
update public.windi_gemini_orders o set delivery_mode=p.delivery_mode,product_title=p.title from public.windi_gemini_products p where o.product_sku=p.sku;
alter table public.windi_gemini_orders drop constraint windi_gemini_order_product_price_check;
alter table public.windi_gemini_orders add constraint windi_gemini_order_product_price_check check(amount_vnd between 1000 and 100000000 and duration_months between 1 and 120);
alter table public.windi_gemini_orders drop constraint windi_gemini_orders_check;
alter table public.windi_gemini_orders add constraint windi_gemini_orders_check check(status<>'PAID' or (paid_at is not null and (activation_id is not null or delivery_mode='manual')));
insert into public.windi_gemini_products(sku,title,duration_months,price_vnd,original_price_vnd,enabled,thumbnail,description,benefits) values
 ('chatgpt-ready-1m','ChatGPT 1 tháng · Acc Cấp Sẵn',1,229000,229000,false,'/gemini-products/chatgpt-1-thang-acc-cap-san.png','Tài khoản ChatGPT cấp sẵn, thời hạn 1 tháng.',array['Tài khoản cấp sẵn','Thời hạn sử dụng 1 tháng']),
 ('chatgpt-personal-1m','ChatGPT 1 tháng chính chủ',1,1000,1000,false,'/gemini-products/chatgpt-1-thang.png','','{}'),
 ('claude-1m','Claude 1 tháng chính chủ',1,1000,1000,false,'/gemini-products/claude-1-thang.png','','{}'),
 ('youtube-1m','YouTube Premium 1 tháng',1,1000,1000,false,'/gemini-products/youtube-1-thang.png','','{}'),
 ('elevenlabs-1m','ElevenLabs Creator 1 tháng',1,1000,1000,false,'/gemini-products/elevenlabs-1-thang.png','','{}'),
 ('capcut-12m','CapCut Pro 1 năm',12,1000,1000,false,'/gemini-products/capcut-1-nam.png','','{}'),
 ('cursor-1m','Cursor Pro 1 tháng',1,1000,1000,false,'/gemini-products/cursor-1-thang.png','','{}'),
 ('gamma-6m','Gamma AI 6 tháng',6,1000,1000,false,'/gemini-products/gamma-6-thang.png','','{}');
-- Existing reference products keep their images; unknown prices stay explicitly unconfirmed.
update public.windi_gemini_products set price_confirmed=false where sku in ('chatgpt-personal-1m','claude-1m','youtube-1m','elevenlabs-1m','capcut-12m','cursor-1m','gamma-6m');
create or replace function public.windi_gemini_stock(p_sku text) returns integer
language plpgsql security invoker set search_path='' as $$
declare remaining integer;
begin
  perform pg_advisory_xact_lock(871942003);
  if not exists(select 1 from public.windi_gemini_products where sku=p_sku) then raise exception 'GEMINI_INVALID_PRODUCT'; end if;
  update public.windi_gemini_orders set status='EXPIRED',activation_id=null where status='PENDING' and expires_at<=now();
  if exists(select 1 from public.windi_gemini_products where sku=p_sku and delivery_mode='manual') then return 1; end if;
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
    case when p.delivery_mode='manual' then 1 else (select count(*)::integer from public.windi_gemini_links l where l.product_sku=p.sku and not l.disabled
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
  if exists(select 1 from public.windi_gemini_products where sku=p_sku and delivery_mode='manual') then
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
  if not p_enabled and exists(select 1 from public.windi_gemini_products where sku=p_sku and delivery_mode='manual') then
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
    when target.status<>'PENDING' or target.expires_at<=now() or (target.activation_id is null and target.delivery_mode<>'manual')
      or p_paid_at<target.created_at-interval '1 minute' or p_paid_at>target.expires_at or p_paid_at>now()+interval '5 minutes' then 'review'
    when target.delivery_mode<>'manual' and not exists(select 1 from public.windi_gemini_links where id=target.activation_id and not disabled and valid_until>now()) then 'review'
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


create function public.windi_shop_save_product(p_sku text,p_details jsonb,p_create boolean) returns void
language plpgsql security invoker set search_path='' as $$
declare existing public.windi_gemini_products;
begin
 perform pg_advisory_xact_lock(871942003);
 select * into existing from public.windi_gemini_products where sku=p_sku;
 if p_create and found then raise exception 'SHOP_SKU_EXISTS'; end if;
 if not p_create and not found then raise exception 'GEMINI_INVALID_PRODUCT'; end if;
 if not p_create and ((p_details->>'durationMonths')::integer<>existing.duration_months or p_details->>'deliveryMode'<>existing.delivery_mode) then raise exception 'SHOP_IMMUTABLE_DELIVERY'; end if;
 if p_create and p_details->>'deliveryMode'<>'manual' then raise exception 'SHOP_MANUAL_ONLY'; end if;
 if p_details->>'warrantyStatus'='included' and length(trim(p_details->>'warranty'))=0 then raise exception 'SHOP_WARRANTY_REQUIRED'; end if;
 insert into public.windi_gemini_products(sku,title,duration_months,price_vnd,original_price_vnd,description,category,benefits,warranty_status,warranty,notes,thumbnail,published,delivery_mode)
 values(p_sku,p_details->>'title',(p_details->>'durationMonths')::integer,(p_details->>'price')::integer,(p_details->>'originalPrice')::integer,p_details->>'description',p_details->>'category',array(select jsonb_array_elements_text(p_details->'benefits')),p_details->>'warrantyStatus',p_details->>'warranty',p_details->>'notes',p_details->>'thumbnail',(p_details->>'published')::boolean,p_details->>'deliveryMode')
 on conflict(sku) do update set price_confirmed=true,title=excluded.title,price_vnd=excluded.price_vnd,original_price_vnd=excluded.original_price_vnd,description=excluded.description,category=excluded.category,benefits=excluded.benefits,warranty_status=excluded.warranty_status,warranty=excluded.warranty,notes=excluded.notes,thumbnail=excluded.thumbnail,published=excluded.published,updated_at=now();
end $$;
revoke all on function public.windi_shop_save_product(text,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.windi_shop_save_product(text,jsonb,boolean) to service_role;
notify pgrst,'reload schema';
commit;
