begin;

create or replace function public.windi_product_activate_device(
  p_user uuid,
  p_entitlement uuid,
  p_device_hash text,
  p_device_name text,
  p_replace boolean default false
)
returns public.product_devices language plpgsql security invoker set search_path='' as $$
declare active_device public.product_devices; result public.product_devices;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_entitlement::text,911));
  perform 1 from public.product_entitlements
    where id=p_entitlement and user_id=p_user and status='active' for update;
  if not found then raise exception 'ENTITLEMENT_NOT_FOUND';end if;
  select * into active_device from public.product_devices
    where entitlement_id=p_entitlement and status='active' for update;
  if found and active_device.device_hash<>p_device_hash and not p_replace then
    raise exception 'DEVICE_REPLACE_REQUIRED';
  end if;
  if found and active_device.device_hash<>p_device_hash then
    update public.product_devices set status='revoked',revoked_at=now()
      where id=active_device.id;
  end if;
  insert into public.product_devices(entitlement_id,user_id,device_hash,device_name)
  values(p_entitlement,p_user,p_device_hash,p_device_name)
  on conflict(entitlement_id,device_hash) do update
    set status='active',device_name=excluded.device_name,last_seen_at=now(),revoked_at=null
  returning * into result;
  return result;
end $$;

revoke all on function public.windi_product_activate_device(uuid,uuid,text,text,boolean)
  from public,anon,authenticated;
grant execute on function public.windi_product_activate_device(uuid,uuid,text,text,boolean)
  to service_role;

notify pgrst,'reload schema';
commit;
