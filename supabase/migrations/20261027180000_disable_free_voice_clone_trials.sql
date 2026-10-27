begin;

-- Clone reservations now require an active paid period or admin entitlement.
-- Keep the legacy demo tables and cleanup functions so existing demo voices expire safely.
create or replace function public.windi_voice_clone_reserve(
  p_user uuid,p_key uuid,p_name text,p_language text,p_accent text default null
)
returns public.windi_voice_clones
language plpgsql security invoker set search_path='' as $$
declare existing_clone public.windi_voice_clones;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,73));
 select * into existing_clone
 from public.windi_voice_clones
 where user_id=p_user and request_key=p_key;
 if found then return existing_clone;end if;

 if exists(select 1 from public.windi_voice_admins where user_id=p_user) or exists(
   select 1 from public.windi_voice_periods
   where user_id=p_user and plan_id<>'welcome' and starts_at<=now() and ends_at>now()
 ) then
   return public.windi_voice_clone_reserve_paid(p_user,p_key,p_name,p_language,p_accent);
 end if;

 raise exception 'NO_SUBSCRIPTION';
end $$;

notify pgrst,'reload schema';
commit;
