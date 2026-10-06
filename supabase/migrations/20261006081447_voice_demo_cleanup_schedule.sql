begin;
-- The worker token is provisioned in Vault and Edge secrets outside source control.
-- Only invoke when there are resources due, avoiding idle Edge invocations.
create function public.windi_voice_demo_cleanup_tick() returns bigint
language plpgsql security invoker set search_path='' as $$
declare worker_token text;request_id bigint;
begin
 if not exists(select 1 from public.windi_voice_clones where is_demo and provider_deleted_at is null
  and (status='deleted' or demo_expires_at<=now()) and (cleanup_until is null or cleanup_until<now())) then return null;end if;
 select decrypted_secret into worker_token from vault.decrypted_secrets where name='windi_voice_demo_cleanup_token' limit 1;
 if worker_token is null then raise exception 'DEMO_CLEANUP_NOT_CONFIGURED';end if;
 select net.http_post(
  url:='https://zpjphixcttehkkgxlmsn.supabase.co/functions/v1/voice-demo-cleanup',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||worker_token),
  body:='{}'::jsonb,timeout_milliseconds:=120000
 ) into request_id;
 return request_id;
end $$;
revoke all on function public.windi_voice_demo_cleanup_tick() from public,anon,authenticated,service_role;
select cron.schedule('windi-voice-demo-cleanup','30 seconds','select public.windi_voice_demo_cleanup_tick();');
commit;
