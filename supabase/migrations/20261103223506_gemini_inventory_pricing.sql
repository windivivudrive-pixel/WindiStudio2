begin;
select pg_advisory_xact_lock(871942003);
-- Retain SKU/duration integrity while allowing admin-defined VND prices.
alter table public.windi_gemini_products drop constraint windi_gemini_product_catalog_check;
alter table public.windi_gemini_products add constraint windi_gemini_product_catalog_check check (
  price_vnd between 1000 and 100000000 and original_price_vnd between price_vnd and 100000000 and (
  (sku='gemini-3m' and duration_months=3) or (sku='gemini-18m' and duration_months=18) or
  (sku='gemini-managed-6m' and duration_months=6) or (sku='gemini-managed-12m' and duration_months=12) or
  (sku='gemini-managed-24m' and duration_months=24)));
alter table public.windi_gemini_orders drop constraint windi_gemini_order_product_price_check;
alter table public.windi_gemini_orders add constraint windi_gemini_order_product_price_check check (
  amount_vnd between 1000 and 100000000 and (
  (product_sku='gemini-3m' and duration_months=3) or (product_sku='gemini-18m' and duration_months=18) or
  (product_sku='gemini-managed-6m' and duration_months=6) or (product_sku='gemini-managed-12m' and duration_months=12) or
  (product_sku='gemini-managed-24m' and duration_months=24)));
create function public.windi_gemini_product_pricing(p_sku text,p_price integer,p_original_price integer) returns void
language plpgsql security invoker set search_path='' as $$
begin
  -- Same lock as order creation: every order snapshots one complete price revision.
  perform pg_advisory_xact_lock(871942003);
  if p_price is null or p_original_price is null or p_price < 1000 or p_price > 100000000
    or p_original_price < p_price or p_original_price > 100000000 then raise exception 'GEMINI_INVALID_PRICE'; end if;
  update public.windi_gemini_products set price_vnd=p_price,original_price_vnd=p_original_price,updated_at=now() where sku=p_sku;
  if not found then raise exception 'GEMINI_INVALID_PRODUCT'; end if;
  -- Existing orders retain their amount, payment code and reserved inventory.
end $$;
revoke all on function public.windi_gemini_product_pricing(text,integer,integer) from public,anon,authenticated;
grant execute on function public.windi_gemini_product_pricing(text,integer,integer) to service_role;
notify pgrst,'reload schema';
commit;
