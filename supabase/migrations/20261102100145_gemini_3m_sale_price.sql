begin;

alter table public.windi_gemini_products
  add column original_price_vnd integer not null default 150000;
alter table public.windi_gemini_products
  drop constraint windi_gemini_product_catalog_check;
update public.windi_gemini_products
  set price_vnd=69000, original_price_vnd=150000, updated_at=now()
  where sku='gemini-3m';
update public.windi_gemini_products
  set original_price_vnd=price_vnd, updated_at=now()
  where sku='gemini-18m';
alter table public.windi_gemini_products
  add constraint windi_gemini_product_catalog_check check (
    (sku='gemini-3m' and duration_months=3 and price_vnd=69000 and original_price_vnd=150000)
    or (sku='gemini-18m' and duration_months=18 and price_vnd=49000 and original_price_vnd=49000)
  );

alter table public.windi_gemini_orders
  drop constraint windi_gemini_order_product_price_check;
alter table public.windi_gemini_orders
  add constraint windi_gemini_order_product_price_check check (
    (product_sku='gemini-3m' and duration_months=3 and amount_vnd in (69000,150000))
    or (product_sku='gemini-18m' and duration_months=18 and amount_vnd=49000)
  );
commit;
