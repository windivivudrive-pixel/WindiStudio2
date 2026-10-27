begin;

-- Keep existing plan rows for historical orders, but stop selling the retired tiers.
update public.windi_voice_plans
set active=false
where id in ('trial','starter','creator','studio');

insert into public.windi_voice_plans(id,name,price_vnd,credits,clone_limit,duration_days,active)
values
  ('credit_10k','10.000 credit',39000,10000,1,30,true),
  ('credit_100k','100.000 credit',269000,100000,2,30,true),
  ('credit_1m','1.000.000 credit',899000,1000000,5,30,true)
on conflict (id) do update set
  name=excluded.name,
  price_vnd=excluded.price_vnd,
  credits=excluded.credits,
  clone_limit=excluded.clone_limit,
  duration_days=excluded.duration_days,
  active=true;

-- Paid bundles permanently replace the free demo entitlement for this account.
create or replace function public.windi_voice_clone_reserve(
  p_user uuid,p_key uuid,p_name text,p_language text,p_accent text default null
)
returns public.windi_voice_clones
language plpgsql security invoker set search_path='' as $$
declare c public.windi_voice_clones; used integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,73));
 select * into c from public.windi_voice_clones where user_id=p_user and request_key=p_key;
 if found then return c;end if;
 if exists(select 1 from public.windi_voice_admins where user_id=p_user) or exists(
   select 1 from public.windi_voice_periods
   where user_id=p_user and plan_id<>'welcome' and starts_at<=now() and ends_at>now()
 ) then
   return public.windi_voice_clone_reserve_paid(p_user,p_key,p_name,p_language,p_accent);
 end if;
 if exists(
   select 1 from public.windi_voice_orders
   where user_id=p_user and status='paid' and plan_id in (
     'trial','starter','creator','studio','credit_10k','credit_100k','credit_1m'
   )
 ) then raise exception 'NO_SUBSCRIPTION';end if;
 if exists(select 1 from public.windi_voice_clones where user_id=p_user and status in ('reserved','pending') and (not is_demo or demo_expires_at>now())) then raise exception 'REQUEST_PENDING';end if;
 insert into public.windi_voice_clone_demo_usage(user_id) values(p_user) on conflict do nothing;
 select attempts into used from public.windi_voice_clone_demo_usage where user_id=p_user for update;
 if used>=2 then raise exception 'DEMO_LIMIT';end if;
 update public.windi_voice_clones set status='deleted',cleanup_at=now()
 where user_id=p_user and is_demo and status in ('ready','reserved','pending');
 update public.windi_voice_clone_demo_usage set attempts=attempts+1 where user_id=p_user;
 insert into public.windi_voice_clones(user_id,request_key,name,language,accent,is_demo,demo_expires_at)
 values(p_user,p_key,p_name,p_language,p_accent,true,now()+interval '19 minutes 30 seconds') returning * into c;
 return c;
end $$;

create or replace function public.windi_voice_demo_order(p_user uuid,p_clone uuid)
returns public.windi_voice_orders language plpgsql security invoker set search_path='' as $$
declare c public.windi_voice_clones;o public.windi_voice_orders;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,73));
 select * into c from public.windi_voice_clones
 where id=p_clone and user_id=p_user and is_demo and status='ready' and demo_expires_at>now() for update;
 if not found then raise exception 'DEMO_EXPIRED';end if;
 o:=public.windi_voice_order(p_user,'credit_10k');
 update public.windi_voice_orders set demo_clone_id=c.id,expires_at=least(expires_at,c.demo_expires_at)
 where id=o.id returning * into o;
 return o;
end $$;

notify pgrst,'reload schema';
commit;
