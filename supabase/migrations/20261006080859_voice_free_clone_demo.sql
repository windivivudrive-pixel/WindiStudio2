begin;
alter table public.windi_voice_clones
 add column is_demo boolean not null default false,
 add column demo_expires_at timestamptz,
 add column cleanup_at timestamptz,
 add column cleanup_token uuid,
 add column cleanup_until timestamptz,
 add column provider_deleted_at timestamptz;
alter table public.windi_voice_clones drop constraint windi_voice_clones_funding_check;
alter table public.windi_voice_clones add constraint windi_voice_clones_funding_check check(
 (is_demo and not admin_funded and period_id is null and demo_expires_at is not null) or
 (not is_demo and ((admin_funded and period_id is null) or (not admin_funded and period_id is not null))));
create index voice_demo_cleanup_due on public.windi_voice_clones(demo_expires_at) where is_demo and provider_deleted_at is null;
create table public.windi_voice_clone_demo_usage(
 user_id uuid primary key references auth.users(id) on delete cascade,
 attempts integer not null default 0 check(attempts between 0 and 2));
alter table public.windi_voice_clone_demo_usage enable row level security;
revoke all on public.windi_voice_clone_demo_usage from public,anon,authenticated;
grant all on public.windi_voice_clone_demo_usage to service_role;
create table public.windi_voice_clone_samples(
 clone_id uuid not null references public.windi_voice_clones(id) on delete cascade,
 preset text not null check(preset in ('greeting','news','paid')),
 status text not null default 'pending' check(status in ('pending','ready','failed')),
 lease_token uuid,lease_until timestamptz,storage_path text,
 primary key(clone_id,preset));
alter table public.windi_voice_clone_samples enable row level security;
revoke all on public.windi_voice_clone_samples from public,anon,authenticated;
grant all on public.windi_voice_clone_samples to service_role;
alter table public.windi_voice_orders add column demo_clone_id uuid references public.windi_voice_clones(id);
create index voice_orders_demo_clone on public.windi_voice_orders(demo_clone_id) where demo_clone_id is not null;

-- Preserve the existing paid/admin quotas behind a service-only implementation.
alter function public.windi_voice_clone_reserve(uuid,uuid,text,text,text) rename to windi_voice_clone_reserve_paid;
create function public.windi_voice_clone_reserve(p_user uuid,p_key uuid,p_name text,p_language text,p_accent text default null)
returns public.windi_voice_clones language plpgsql security invoker set search_path='' as $$
declare c public.windi_voice_clones; used integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,73));
 select * into c from public.windi_voice_clones where user_id=p_user and request_key=p_key;
 if found then return c;end if;
 if exists(select 1 from public.windi_voice_admins where user_id=p_user) or exists(
 select 1 from public.windi_voice_periods where user_id=p_user and plan_id<>'welcome' and starts_at<=now() and ends_at>now()) then
 return public.windi_voice_clone_reserve_paid(p_user,p_key,p_name,p_language,p_accent);end if;
 if exists(select 1 from public.windi_voice_orders where user_id=p_user and status='paid' and plan_id in ('trial','starter','creator','studio')) then raise exception 'NO_SUBSCRIPTION';end if;
 if exists(select 1 from public.windi_voice_clones where user_id=p_user and status in ('reserved','pending') and (not is_demo or demo_expires_at>now())) then raise exception 'REQUEST_PENDING';end if;
 insert into public.windi_voice_clone_demo_usage(user_id) values(p_user) on conflict do nothing;
 select attempts into used from public.windi_voice_clone_demo_usage where user_id=p_user for update;
 if used>=2 then raise exception 'DEMO_LIMIT';end if;
 -- Hide the former demo immediately; the API must delete its provider before cloning again.
 update public.windi_voice_clones set status='deleted',cleanup_at=now()
 where user_id=p_user and is_demo and status in ('ready','reserved','pending');
 update public.windi_voice_clone_demo_usage set attempts=attempts+1 where user_id=p_user;
 insert into public.windi_voice_clones(user_id,request_key,name,language,accent,is_demo,demo_expires_at)
 values(p_user,p_key,p_name,p_language,p_accent,true,now()+interval '19 minutes 30 seconds') returning * into c;
 return c;
end $$;

create or replace function public.windi_voice_clone_finish(p_clone uuid,p_provider text) returns void
language plpgsql security invoker set search_path='' as $$
declare c public.windi_voice_clones; owner_id uuid;
begin
 select user_id into owner_id from public.windi_voice_clones where id=p_clone;
 if owner_id is null then raise exception 'CLONE_NOT_FOUND';end if;
 perform pg_advisory_xact_lock(hashtextextended(owner_id::text,73));
 select * into c from public.windi_voice_clones where id=p_clone for update;
 if c.status not in ('reserved','pending') then
  if c.is_demo and c.status='deleted' and p_provider is not null and c.provider_id is null then
   update public.windi_voice_clones set provider_id=p_provider,provider_deleted_at=null,cleanup_at=now(),cleanup_token=null,cleanup_until=null where id=c.id;
  end if;
  return;
 end if;
 if p_provider is not null then
  if c.is_demo and c.demo_expires_at<=now() then
   update public.windi_voice_clones set provider_id=p_provider,status='deleted',cleanup_at=now() where id=c.id;
  else update public.windi_voice_clones set provider_id=p_provider,status='ready' where id=c.id;end if;
 else
  update public.windi_voice_clones set status='failed' where id=c.id;
  if c.is_demo then update public.windi_voice_clone_demo_usage set attempts=greatest(0,attempts-1) where user_id=c.user_id;
  else update public.windi_voice_periods set clones_used=greatest(0,clones_used-1) where id=c.period_id;end if;
 end if;
end $$;

-- Claim and promotion both use the user lock. A claimed demo cannot be sold/retained.
create function public.windi_voice_demo_cleanup_claim(p_user uuid default null)
returns setof public.windi_voice_clones language plpgsql security invoker set search_path='' as $$
declare candidate record;c public.windi_voice_clones;
begin
 for candidate in select id,user_id from public.windi_voice_clones
 where is_demo and provider_deleted_at is null and (p_user is null or user_id=p_user)
 and (status='deleted' or demo_expires_at<=now())
 and (cleanup_until is null or cleanup_until<now()) order by user_id,demo_expires_at limit 20 loop
 perform pg_advisory_xact_lock(hashtextextended(candidate.user_id::text,73));
 select * into c from public.windi_voice_clones where id=candidate.id for update;
 if c.is_demo and c.provider_deleted_at is null and (c.status='deleted' or c.demo_expires_at<=now()) and (c.cleanup_until is null or c.cleanup_until<now()) then
 update public.windi_voice_clones set status='deleted',cleanup_at=coalesce(cleanup_at,now()),cleanup_token=gen_random_uuid(),cleanup_until=now()+interval '2 minutes'
 where id=c.id returning * into c;
 return next c;
 end if;end loop;
end $$;
create function public.windi_voice_demo_cleanup_finish(p_clone uuid,p_token uuid,p_success boolean)
returns void language plpgsql security invoker set search_path='' as $$
begin
 update public.windi_voice_clones set provider_deleted_at=case when p_success then now() else null end,
 cleanup_token=null,cleanup_until=case when p_success then null else now()+interval '30 seconds' end
 where id=p_clone and is_demo and status='deleted' and cleanup_token=p_token;
 if found and p_success then delete from public.windi_voice_clone_samples where clone_id=p_clone;end if;
end $$;

create function public.windi_voice_clone_sample_claim(p_user uuid,p_clone uuid,p_preset text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.windi_voice_clones;s public.windi_voice_clone_samples;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,73));
 select * into c from public.windi_voice_clones where id=p_clone and user_id=p_user and status='ready' for update;
 if not found or (c.is_demo and c.demo_expires_at<=now()) then raise exception 'DEMO_EXPIRED';end if;
 if (c.is_demo and p_preset not in ('greeting','news')) or (not c.is_demo and p_preset<>'paid') then raise exception 'INVALID_INPUT';end if;
 insert into public.windi_voice_clone_samples(clone_id,preset) values(p_clone,p_preset) on conflict do nothing;
 select * into s from public.windi_voice_clone_samples where clone_id=p_clone and preset=p_preset for update;
 if s.status='ready' then return jsonb_build_object('status','ready','path',s.storage_path,'provider',c.provider_id);end if;
 if s.lease_until>now() then return jsonb_build_object('status','busy');end if;
 update public.windi_voice_clone_samples set status='pending',lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes'
 where clone_id=p_clone and preset=p_preset returning * into s;
 return jsonb_build_object('status','generate','token',s.lease_token,'provider',c.provider_id);
end $$;

create function public.windi_voice_demo_order(p_user uuid,p_clone uuid)
returns public.windi_voice_orders language plpgsql security invoker set search_path='' as $$
declare c public.windi_voice_clones;o public.windi_voice_orders;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,73));
 select * into c from public.windi_voice_clones where id=p_clone and user_id=p_user and is_demo and status='ready' and demo_expires_at>now() for update;
 if not found then raise exception 'DEMO_EXPIRED';end if;
 o:=public.windi_voice_order(p_user,'trial');
 update public.windi_voice_orders set demo_clone_id=c.id,expires_at=least(expires_at,c.demo_expires_at) where id=o.id returning * into o;
 return o;
end $$;

-- Defense in depth: a provider ID from a demo cannot reserve arbitrary TTS.
create function public.windi_voice_demo_tts_guard() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from public.windi_voice_clones where provider_id=new.voice_id and (is_demo or status='deleted')) then raise exception 'DEMO_LISTEN_ONLY';end if;
 return new;
end $$;
create trigger voice_demo_tts_guard before insert on public.windi_voice_jobs for each row execute function public.windi_voice_demo_tts_guard();
create or replace function public.windi_voice_pay(
  p_code text,
  p_gateway text,
  p_amount integer,
  p_paid_at timestamptz default null
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  voice_order public.windi_voice_orders;
  new_period_id uuid;
  effective_paid_at timestamptz;
  period_start timestamptz;
  retained_clone public.windi_voice_clones;
begin
  select * into voice_order
  from public.windi_voice_orders
  where payment_code=p_code or replace(payment_code,' ','')=replace(p_code,' ','');
  if not found then return 'ignored'; end if;

  perform pg_advisory_xact_lock(hashtextextended(voice_order.user_id::text,73));
  select * into voice_order from public.windi_voice_orders where id=voice_order.id for update;
  if voice_order.status='paid' then
    if voice_order.gateway_id=p_gateway then return 'paid'; end if;
    return 'review';
  end if;
  if voice_order.status='review' then return 'review'; end if;
  if exists(select 1 from public.windi_voice_orders where gateway_id=p_gateway) then
    raise exception 'DUPLICATE_PAYMENT';
  end if;

  effective_paid_at := coalesce(p_paid_at,now());
  if voice_order.status not in ('pending','expired')
    or (voice_order.status='expired' and p_paid_at is null)
    or effective_paid_at < voice_order.created_at-interval '1 minute'
    or effective_paid_at > voice_order.expires_at
    or effective_paid_at > now()+interval '5 minutes'
    or voice_order.amount_vnd<>p_amount then
    update public.windi_voice_orders set status='review',gateway_id=p_gateway where id=voice_order.id;
    return 'review';
  end if;

  select max(ends_at) into period_start
  from public.windi_voice_periods
  where user_id=voice_order.user_id and ends_at>now() and plan_id<>'welcome';
  period_start := greatest(now(),coalesce(period_start,now()));

  insert into public.windi_voice_periods(user_id,order_id,plan_id,starts_at,ends_at,credits,clone_limit)
  values(
    voice_order.user_id,voice_order.id,voice_order.plan_id,period_start,
    period_start+make_interval(days => voice_order.duration_days),voice_order.credits,voice_order.clone_limit
  ) returning id into new_period_id;
  insert into public.windi_voice_ledger(user_id,period_id,kind,amount)
  values(voice_order.user_id,new_period_id,'grant',voice_order.credits);
  update public.windi_voice_orders
  set status='paid',paid_at=effective_paid_at,gateway_id=p_gateway
  where id=voice_order.id;
  if voice_order.demo_clone_id is not null then
    select * into retained_clone from public.windi_voice_clones
    where id=voice_order.demo_clone_id and user_id=voice_order.user_id for update;
    if found and retained_clone.is_demo and retained_clone.status='ready'
      and retained_clone.demo_expires_at>now() and retained_clone.provider_id is not null
      and period_start<=now() then
      update public.windi_voice_clones set is_demo=false,demo_expires_at=null,period_id=new_period_id,cleanup_at=null
      where id=retained_clone.id;
      update public.windi_voice_periods set clones_used=1 where id=new_period_id;
    end if;
  end if;
  return 'paid';
end;
$$;

revoke all on function public.windi_voice_pay(text,text,integer,timestamptz) from public,anon,authenticated;
grant execute on function public.windi_voice_pay(text,text,integer,timestamptz) to service_role;


revoke all on function public.windi_voice_clone_reserve(uuid,uuid,text,text,text),public.windi_voice_demo_cleanup_claim(uuid),public.windi_voice_demo_cleanup_finish(uuid,uuid,boolean),public.windi_voice_clone_sample_claim(uuid,uuid,text),public.windi_voice_demo_order(uuid,uuid),public.windi_voice_demo_tts_guard() from public,anon,authenticated;
grant execute on function public.windi_voice_clone_reserve(uuid,uuid,text,text,text),public.windi_voice_demo_cleanup_claim(uuid),public.windi_voice_demo_cleanup_finish(uuid,uuid,boolean),public.windi_voice_clone_sample_claim(uuid,uuid,text),public.windi_voice_demo_order(uuid,uuid),public.windi_voice_demo_tts_guard() to service_role;
notify pgrst,'reload schema';
commit;
