begin;

-- Video Workflow includes a non-expiring, one-time Windi Voice balance. Keep
-- it separate from monthly/trial periods so buying a Voice plan remains valid
-- and expiring plan credits can be consumed first.
alter table public.product_entitlements
  add column if not exists voice_credits integer not null default 0,
  add column if not exists voice_credits_used integer not null default 0;
alter table public.product_entitlements
  drop constraint if exists product_entitlements_voice_credits_check,
  drop constraint if exists product_entitlements_voice_credits_used_check;
alter table public.product_entitlements
  add constraint product_entitlements_voice_credits_check
    check(voice_credits >= 0),
  add constraint product_entitlements_voice_credits_used_check
    check(voice_credits_used >= 0 and voice_credits_used <= voice_credits);

alter table public.windi_voice_jobs alter column period_id drop not null;
alter table public.windi_voice_jobs
  add column if not exists entitlement_id uuid
    references public.product_entitlements(id) on delete restrict;
alter table public.windi_voice_jobs
  drop constraint if exists windi_voice_jobs_credit_source_check;
alter table public.windi_voice_jobs
  add constraint windi_voice_jobs_credit_source_check
    check((period_id is null) <> (entitlement_id is null));
create index if not exists windi_voice_jobs_entitlement_created
  on public.windi_voice_jobs(entitlement_id,created_at desc)
  where entitlement_id is not null;

alter table public.windi_voice_ledger alter column period_id drop not null;
alter table public.windi_voice_ledger
  add column if not exists entitlement_id uuid
    references public.product_entitlements(id) on delete restrict;
alter table public.windi_voice_ledger
  drop constraint if exists windi_voice_ledger_credit_source_check;
alter table public.windi_voice_ledger
  add constraint windi_voice_ledger_credit_source_check
    check((period_id is null) <> (entitlement_id is null));
create unique index if not exists windi_voice_ledger_entitlement_grant
  on public.windi_voice_ledger(entitlement_id)
  where entitlement_id is not null and job_id is null and kind='grant';

update public.products
set metadata = jsonb_set(metadata,'{voice_bonus_credits}','20000'::jsonb,true)
where metadata->>'sku'='windi-video-workflow-v1';

update public.product_entitlements
set voice_credits=greatest(voice_credits,20000),updated_at=now()
where kind='video_workflow_v1';

insert into public.windi_voice_ledger(user_id,entitlement_id,kind,amount)
select e.user_id,e.id,'grant',20000
from public.product_entitlements e
where e.kind='video_workflow_v1'
on conflict(entitlement_id) where entitlement_id is not null and job_id is null and kind='grant'
do nothing;

create or replace function public.windi_video_kit_pay(
  p_code text,
  p_gateway text,
  p_amount integer,
  p_payload jsonb
)
returns text language plpgsql security invoker set search_path='' as $$
declare
  target public.orders;
  item record;
  prior_status public.order_status;
  granted_entitlement uuid;
begin
  select o.status into prior_status
  from public.payment_events e
  left join public.orders o on o.id=e.order_id
  where e.gateway_id=p_gateway;
  if found then
    return case prior_status
      when 'PAID' then 'paid'
      when 'UNDERPAID' then 'underpaid'
      when 'OVERPAID' then 'overpaid'
      else 'review'
    end;
  end if;

  select * into target from public.orders where payment_code=p_code for update;
  if not found then return 'ignored';end if;
  perform pg_advisory_xact_lock(871942001);
  if target.status='PAID' then return 'paid';end if;

  insert into public.payment_events(gateway_id,order_id,amount,payload)
  values(p_gateway,target.id,p_amount,p_payload);
  if target.status<>'PENDING' or target.expires_at<=now() then
    update public.orders set status='REVIEW_REQUIRED' where id=target.id;
    return 'review';
  end if;
  if p_amount<target.total_amount_vnd then
    update public.orders set status='UNDERPAID' where id=target.id;
    return 'underpaid';
  end if;
  if p_amount>target.total_amount_vnd then
    update public.orders set status='OVERPAID' where id=target.id;
    return 'overpaid';
  end if;

  update public.orders set status='PAID' where id=target.id;
  for item in
    select i.id,i.product_id,p.type
    from public.order_items i
    join public.products p on p.id=i.product_id
    where i.order_id=target.id
  loop
    if item.type='VIDEO_KIT_LICENSE' then
      insert into public.product_entitlements(
        user_id,product_id,order_item_id,kind,voice_credits
      ) values(
        target.user_id,item.product_id,item.id,'video_workflow_v1',20000
      )
      on conflict(user_id,product_id) do update
        set updated_at=now()
      returning id into granted_entitlement;

      insert into public.windi_voice_ledger(
        user_id,entitlement_id,kind,amount
      ) values(
        target.user_id,granted_entitlement,'grant',20000
      )
      on conflict(entitlement_id)
        where entitlement_id is not null and job_id is null and kind='grant'
      do nothing;
    end if;
  end loop;
  delete from public.video_kit_reservations where order_id=target.id;
  return 'paid';
end $$;

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

revoke all on function public.windi_video_kit_pay(text,text,integer,jsonb),
  public.windi_voice_reserve(uuid,uuid,text,text,text,text,numeric),
  public.windi_voice_finish(uuid,boolean,text)
from public,anon,authenticated;
grant execute on function public.windi_video_kit_pay(text,text,integer,jsonb),
  public.windi_voice_reserve(uuid,uuid,text,text,text,text,numeric),
  public.windi_voice_finish(uuid,boolean,text)
to service_role;

notify pgrst,'reload schema';
commit;
