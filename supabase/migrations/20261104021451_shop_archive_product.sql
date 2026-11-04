begin;
alter table public.windi_gemini_products add column archived_at timestamptz;
alter table public.windi_gemini_products add constraint windi_shop_archived_not_for_sale check (archived_at is null or (not published and not enabled));
create function public.windi_shop_archive_product(p_sku text, p_archive boolean) returns void
language plpgsql security invoker set search_path='' as $$
begin
  perform pg_advisory_xact_lock(871942003);
  if p_archive is null then raise exception 'INVALID_INPUT'; end if;
  update public.windi_gemini_products
    set archived_at=case when p_archive then coalesce(archived_at,now()) else null end,
        enabled=false, published=false, updated_at=now()
    where sku=p_sku;
  if not found then raise exception 'GEMINI_INVALID_PRODUCT'; end if;
  if p_sku='gemini-3m' then update public.windi_gemini_settings set enabled=false,updated_at=now() where id; end if;
end $$;
revoke all on function public.windi_shop_archive_product(text,boolean) from public,anon,authenticated;
grant execute on function public.windi_shop_archive_product(text,boolean) to service_role;
notify pgrst,'reload schema';
commit;
