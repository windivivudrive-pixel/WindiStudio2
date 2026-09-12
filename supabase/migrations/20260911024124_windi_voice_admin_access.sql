begin;
-- Dedicated server-controlled membership. No client write grants.
create table public.windi_voice_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.windi_voice_admins enable row level security;
revoke all on public.windi_voice_admins from public,anon,authenticated;
grant select,insert,delete on public.windi_voice_admins to service_role;
alter table public.windi_voice_jobs add column admin_funded boolean not null default false;
alter table public.windi_voice_jobs drop constraint windi_voice_jobs_credit_source_check;
alter table public.windi_voice_jobs add constraint windi_voice_jobs_credit_source_check check(
 (admin_funded and period_id is null and entitlement_id is null) or
 (not admin_funded and ((period_id is null) <> (entitlement_id is null))));
alter table public.windi_voice_clones alter column period_id drop not null;
alter table public.windi_voice_clones add column admin_funded boolean not null default false;
alter table public.windi_voice_clones add constraint windi_voice_clones_funding_check check(
 (admin_funded and period_id is null) or (not admin_funded and period_id is not null));
create or replace function public.windi_voice_reserve(
  p_user uuid,
  p_key uuid,
  p_voice text,
  p_name text,
  p_text text,
  p_language text,
  p_speed numeric
)
returns public.windi_voice_jobs language plpgsql security invoker set search_path='' as $$
declare
  voice_period public.windi_voice_periods;
  entitlement public.product_entitlements;
  voice_job public.windi_voice_jobs;
  cost integer:=char_length(p_text);
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,73));
  select * into voice_job
  from public.windi_voice_jobs
  where user_id=p_user and request_key=p_key;
  if found then
    if voice_job.transcript<>p_text
      or voice_job.voice_id<>p_voice
      or voice_job.language<>p_language
      or voice_job.speed<>p_speed then
      raise exception 'REQUEST_CONFLICT';
    end if;
    return voice_job;
  end if;
  if cost<1 or cost>10000 then raise exception 'INVALID_TEXT';end if;
  if exists(
    select 1 from public.windi_voice_jobs
    where user_id=p_user and status in ('reserved','pending')
  ) then raise exception 'REQUEST_PENDING';end if;

  if exists(select 1 from public.windi_voice_admins where user_id=p_user) then
    insert into public.windi_voice_jobs(user_id,request_key,voice_id,voice_name,transcript,language,speed,credits,admin_funded)
    values(p_user,p_key,p_voice,p_name,p_text,p_language,p_speed,cost,true) returning * into voice_job;
    return voice_job;
  end if;

  -- Spend expiring Voice-plan credits before the lifetime Kit bonus.
  select * into voice_period
  from public.windi_voice_periods
  where user_id=p_user
    and starts_at<=now()
    and ends_at>now()
    and used_credits+cost<=credits
  order by ends_at asc
  limit 1 for update;

  if found then
    update public.windi_voice_periods
    set used_credits=used_credits+cost
    where id=voice_period.id;
    insert into public.windi_voice_jobs(
      user_id,period_id,request_key,voice_id,voice_name,transcript,language,speed,credits
    ) values(
      p_user,voice_period.id,p_key,p_voice,p_name,p_text,p_language,p_speed,cost
    ) returning * into voice_job;
    insert into public.windi_voice_ledger(
      user_id,period_id,job_id,kind,amount
    ) values(
      p_user,voice_period.id,voice_job.id,'reserve',-cost
    );
    return voice_job;
  end if;

  select * into entitlement
  from public.product_entitlements
  where user_id=p_user
    and kind='video_workflow_v1'
    and status='active'
    and voice_credits_used+cost<=voice_credits
  limit 1 for update;

  if found then
    update public.product_entitlements
    set voice_credits_used=voice_credits_used+cost,updated_at=now()
    where id=entitlement.id;
    insert into public.windi_voice_jobs(
      user_id,entitlement_id,request_key,voice_id,voice_name,transcript,language,speed,credits
    ) values(
      p_user,entitlement.id,p_key,p_voice,p_name,p_text,p_language,p_speed,cost
    ) returning * into voice_job;
    insert into public.windi_voice_ledger(
      user_id,entitlement_id,job_id,kind,amount
    ) values(
      p_user,entitlement.id,voice_job.id,'reserve',-cost
    );
    return voice_job;
  end if;

  if exists(
    select 1 from public.windi_voice_periods
    where user_id=p_user and starts_at<=now() and ends_at>now()
  ) or exists(
    select 1 from public.product_entitlements
    where user_id=p_user and kind='video_workflow_v1' and status='active'
  ) then raise exception 'INSUFFICIENT_CREDITS';end if;
  raise exception 'NO_SUBSCRIPTION';
end $$;

create or replace function public.windi_voice_finish(
  p_job uuid,
  p_success boolean,
  p_path text default null
)
returns void language plpgsql security invoker set search_path='' as $$
declare voice_job public.windi_voice_jobs;
begin
  select * into voice_job
  from public.windi_voice_jobs
  where id=p_job for update;
  if not found or voice_job.status not in ('reserved','pending') then return;end if;
  if p_success then
    if p_path is null
      or p_path<>voice_job.user_id::text||'/'||voice_job.id::text||'.mp3' then
      raise exception 'INVALID_AUDIO_PATH';
    end if;
    update public.windi_voice_jobs
    set status='ready',storage_path=p_path
    where id=voice_job.id;
    return;
  end if;

  update public.windi_voice_jobs set status='failed' where id=voice_job.id;
  if voice_job.admin_funded then return;end if;
  if voice_job.period_id is not null then
    update public.windi_voice_periods
    set used_credits=used_credits-voice_job.credits
    where id=voice_job.period_id;
    insert into public.windi_voice_ledger(
      user_id,period_id,job_id,kind,amount
    ) values(
      voice_job.user_id,voice_job.period_id,voice_job.id,'refund',voice_job.credits
    );
  else
    update public.product_entitlements
    set voice_credits_used=voice_credits_used-voice_job.credits,updated_at=now()
    where id=voice_job.entitlement_id;
    insert into public.windi_voice_ledger(
      user_id,entitlement_id,job_id,kind,amount
    ) values(
      voice_job.user_id,voice_job.entitlement_id,voice_job.id,'refund',voice_job.credits
    );
  end if;
end $$;

create or replace function public.windi_voice_clone_reserve(p_user uuid,p_key uuid,p_name text,p_language text,p_accent text default null) returns public.windi_voice_clones
language plpgsql security invoker set search_path = '' as $$
declare active_period public.windi_voice_periods; clone_row public.windi_voice_clones;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,73));
 select * into clone_row from public.windi_voice_clones where user_id=p_user and request_key=p_key;
 if found then return clone_row; end if;
 if exists(select 1 from public.windi_voice_admins where user_id=p_user) then
  if exists(select 1 from public.windi_voice_clones where user_id=p_user and status in ('reserved','pending')) then raise exception 'REQUEST_PENDING'; end if;
  insert into public.windi_voice_clones(user_id,request_key,name,language,accent,admin_funded) values(p_user,p_key,p_name,p_language,p_accent,true) returning * into clone_row;
  return clone_row;
 end if;
 select * into active_period from public.windi_voice_periods where user_id=p_user and starts_at<=now() and ends_at>now() order by ends_at desc limit 1 for update;
 if not found then raise exception 'NO_SUBSCRIPTION'; end if;
 if active_period.plan_id='welcome' then raise exception 'CLONE_REQUIRES_TRIAL'; end if;
 if active_period.clones_used>=active_period.clone_limit or (select count(*) from public.windi_voice_clones where user_id=p_user and status in ('ready','reserved','pending'))>=active_period.clone_limit then raise exception 'CLONE_LIMIT'; end if;
 if exists(select 1 from public.windi_voice_clones where user_id=p_user and status in ('reserved','pending')) then raise exception 'REQUEST_PENDING'; end if;
 update public.windi_voice_periods set clones_used=clones_used+1 where id=active_period.id;
 insert into public.windi_voice_clones(user_id,period_id,request_key,name,language,accent) values(p_user,active_period.id,p_key,p_name,p_language,p_accent) returning * into clone_row;
 return clone_row;
end $$;

revoke all on function public.windi_voice_clone_reserve(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.windi_voice_clone_reserve(uuid,uuid,text,text,text) to service_role;


revoke all on function public.windi_voice_reserve(uuid,uuid,text,text,text,text,numeric),public.windi_voice_finish(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.windi_voice_reserve(uuid,uuid,text,text,text,text,numeric),public.windi_voice_finish(uuid,boolean,text) to service_role;
notify pgrst,'reload schema';
commit;
