begin;

select pg_advisory_xact_lock(871942003);

alter table public.windi_gemini_links
  drop constraint if exists windi_gemini_links_activation_url_check;

alter table public.windi_gemini_links
  add constraint windi_gemini_links_product_activation_url_check
  check (
    activation_url ~ '^https://one[.]google[.]com/offer/[A-Za-z0-9_-]{8,128}$'
    or (
      product_sku='gemini-18m'
      and activation_url ~ '^https://serviceactivation[.]link/subscription/new/[A-Za-z0-9_-]{16,255}$'
    )
  );

notify pgrst,'reload schema';
commit;
