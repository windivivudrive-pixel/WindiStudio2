begin;

-- A pending order reserves its assigned link for no more than five minutes.
-- Keep deployment atomic with order creation, payment and stock reads.
select pg_advisory_xact_lock(871942003);

alter table public.windi_gemini_orders
  alter column expires_at set default (now() + interval '5 minutes');

-- Do not extend any existing pending order during rollout.
update public.windi_gemini_orders
  set expires_at=least(expires_at,created_at + interval '5 minutes')
  where status='PENDING';

-- Release reservations that have already reached the new deadline.
update public.windi_gemini_orders
  set status='EXPIRED',activation_id=null
  where status='PENDING' and expires_at<=now();

-- The stock RPC expires pending orders for every SKU and releases their links.
-- Run it periodically even when no buyer has the store open.
do $$
begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    if exists(select 1 from cron.job where jobname='windi-gemini-pending-expiry') then
      perform cron.unschedule('windi-gemini-pending-expiry');
    end if;
    perform cron.schedule(
      'windi-gemini-pending-expiry',
      '30 seconds',
      'select public.windi_gemini_stock(''gemini-3m'');'
    );
  end if;
end $$;

notify pgrst,'reload schema';
commit;
