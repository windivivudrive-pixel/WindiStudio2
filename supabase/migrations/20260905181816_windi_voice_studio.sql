-- Voice commerce is isolated from the legacy image/CreatorFlow wallet.
create table public.windi_voice_plans (
  id text primary key, name text not null, price_vnd integer not null check(price_vnd > 0),
  credits integer not null check(credits > 0), clone_limit integer not null check(clone_limit > 0), active boolean not null default true
);
insert into public.windi_voice_plans(id,name,price_vnd,credits,clone_limit) values
 ('starter','Starter',69000,30000,1),('creator','Creator',269000,150000,5),('studio','Studio',999000,600000,20);
create table public.windi_voice_orders (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.windi_voice_plans(id), amount_vnd integer not null check(amount_vnd > 0),
  credits integer not null check(credits > 0), clone_limit integer not null check(clone_limit > 0),
  payment_code text not null unique default ('WV'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16))),
  status text not null default 'pending' check(status in ('pending','paid','expired','review')),
  gateway_id text unique, created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '24 hours', paid_at timestamptz
);
create table public.windi_voice_periods (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null unique references public.windi_voice_orders(id), plan_id text not null references public.windi_voice_plans(id),
  starts_at timestamptz not null, ends_at timestamptz not null, credits integer not null check(credits > 0),
  used_credits integer not null default 0 check(used_credits >= 0 and used_credits <= credits),
  clone_limit integer not null, clones_used integer not null default 0 check(clones_used >= 0 and clones_used <= clone_limit),
  check(ends_at > starts_at)
);
create index windi_voice_periods_user_dates on public.windi_voice_periods(user_id,ends_at desc);
create table public.windi_voice_clones (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  period_id uuid not null references public.windi_voice_periods(id), request_key uuid not null,
  name text not null check(length(name) between 1 and 80), language text not null,
  provider_id text unique, status text not null default 'reserved' check(status in ('reserved','pending','ready','failed','deleted')),
  consent_at timestamptz not null default now(), consent_version text not null default 'voice-consent-v1',
  created_at timestamptz not null default now(), unique(user_id,request_key)
);
create index windi_voice_clones_user on public.windi_voice_clones(user_id,created_at desc);
create table public.windi_voice_jobs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  period_id uuid not null references public.windi_voice_periods(id), request_key uuid not null,
  voice_id text not null, voice_name text not null, transcript text not null check(char_length(transcript) between 1 and 10000),
  language text not null, speed numeric not null check(speed between 0.6 and 1.5), model text not null default 'sonic-3.6',
  credits integer not null check(credits > 0), status text not null default 'reserved' check(status in ('reserved','pending','ready','failed')),
  storage_path text, created_at timestamptz not null default now(), unique(user_id,request_key)
);
create index windi_voice_jobs_user_created on public.windi_voice_jobs(user_id,created_at desc);
create table public.windi_voice_ledger (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  period_id uuid not null references public.windi_voice_periods(id), job_id uuid references public.windi_voice_jobs(id),
  kind text not null check(kind in ('grant','reserve','refund')), amount integer not null,
  created_at timestamptz not null default now(), unique(job_id,kind)
);
create index windi_voice_ledger_user on public.windi_voice_ledger(user_id,created_at desc);
create index windi_voice_orders_user on public.windi_voice_orders(user_id,created_at desc);

alter table public.windi_voice_plans enable row level security;
alter table public.windi_voice_orders enable row level security;
alter table public.windi_voice_periods enable row level security;
alter table public.windi_voice_clones enable row level security;
alter table public.windi_voice_jobs enable row level security;
alter table public.windi_voice_ledger enable row level security;
revoke all on public.windi_voice_plans,public.windi_voice_orders,public.windi_voice_periods,public.windi_voice_clones,public.windi_voice_jobs,public.windi_voice_ledger from anon,authenticated;
grant select on public.windi_voice_plans to anon,authenticated;
grant select on public.windi_voice_orders,public.windi_voice_periods,public.windi_voice_clones,public.windi_voice_jobs,public.windi_voice_ledger to authenticated;
grant all on public.windi_voice_plans,public.windi_voice_orders,public.windi_voice_periods,public.windi_voice_clones,public.windi_voice_jobs,public.windi_voice_ledger to service_role;
create policy voice_plans_read on public.windi_voice_plans for select to anon,authenticated using(active);
create policy voice_orders_own on public.windi_voice_orders for select to authenticated using(user_id=(select auth.uid()));
create policy voice_periods_own on public.windi_voice_periods for select to authenticated using(user_id=(select auth.uid()));
create policy voice_clones_own on public.windi_voice_clones for select to authenticated using(user_id=(select auth.uid()));
create policy voice_jobs_own on public.windi_voice_jobs for select to authenticated using(user_id=(select auth.uid()));
create policy voice_ledger_own on public.windi_voice_ledger for select to authenticated using(user_id=(select auth.uid()));

-- All mutation RPCs are invoker-only, explicitly restricted to the server role.
create function public.windi_voice_order(p_user uuid,p_plan text) returns public.windi_voice_orders
language plpgsql security invoker set search_path = '' as $$
declare plan public.windi_voice_plans; o public.windi_voice_orders;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,73));
 select * into plan from public.windi_voice_plans where id=p_plan and active;
 if not found then raise exception 'INVALID_PLAN'; end if;
 if (select count(*) from public.windi_voice_clones where user_id=p_user and status in ('reserved','pending','ready'))>plan.clone_limit then raise exception 'CLONE_LIMIT'; end if;
 if exists(select 1 from public.windi_voice_periods where user_id=p_user and ends_at>now()) then raise exception 'ACTIVE_PERIOD'; end if;
 update public.windi_voice_orders set status='expired' where user_id=p_user and status='pending' and expires_at<=now();
 select * into o from public.windi_voice_orders where user_id=p_user and status='pending' order by created_at desc limit 1;
 if found then
   if o.plan_id<>p_plan then raise exception 'PENDING_ORDER'; end if;
   return o;
 end if;
 insert into public.windi_voice_orders(user_id,plan_id,amount_vnd,credits,clone_limit)
 values(p_user,plan.id,plan.price_vnd,plan.credits,plan.clone_limit) returning * into o;
 return o;
end $$;
create function public.windi_voice_pay(p_code text,p_gateway text,p_amount integer) returns text
language plpgsql security invoker set search_path = '' as $$
declare o public.windi_voice_orders; period_id uuid;
begin
 select * into o from public.windi_voice_orders where payment_code=p_code;
 if not found then return 'ignored'; end if;
 perform pg_advisory_xact_lock(hashtextextended(o.user_id::text,73));
 select * into o from public.windi_voice_orders where id=o.id for update;
 if o.status='paid' then
  if o.gateway_id=p_gateway then return 'paid'; end if;
  return 'review';
 end if;
 if o.status='review' then return 'review'; end if;
 if exists(select 1 from public.windi_voice_orders where gateway_id=p_gateway) then raise exception 'DUPLICATE_PAYMENT'; end if;
 if o.status<>'pending' or o.expires_at<=now() or o.amount_vnd<>p_amount or
   exists(select 1 from public.windi_voice_periods where user_id=o.user_id and ends_at>now()) then
   update public.windi_voice_orders set status='review',gateway_id=p_gateway where id=o.id;
   return 'review';
 end if;
 insert into public.windi_voice_periods(user_id,order_id,plan_id,starts_at,ends_at,credits,clone_limit)
 values(o.user_id,o.id,o.plan_id,now(),now()+interval '1 month',o.credits,o.clone_limit) returning id into period_id;
 insert into public.windi_voice_ledger(user_id,period_id,kind,amount) values(o.user_id,period_id,'grant',o.credits);
 update public.windi_voice_orders set status='paid',paid_at=now(),gateway_id=p_gateway where id=o.id;
 return 'paid';
end $$;
create function public.windi_voice_reserve(p_user uuid,p_key uuid,p_voice text,p_name text,p_text text,p_language text,p_speed numeric)
returns public.windi_voice_jobs language plpgsql security invoker set search_path = '' as $$
declare p public.windi_voice_periods; j public.windi_voice_jobs; cost integer := char_length(p_text);
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,73));
 select * into j from public.windi_voice_jobs where user_id=p_user and request_key=p_key;
 if found then
  if j.transcript<>p_text or j.voice_id<>p_voice or j.language<>p_language or j.speed<>p_speed then raise exception 'REQUEST_CONFLICT'; end if;
  return j;
 end if;
 select * into p from public.windi_voice_periods where user_id=p_user and starts_at<=now() and ends_at>now() order by ends_at desc limit 1 for update;
 if not found then raise exception 'NO_SUBSCRIPTION'; end if;
 if cost<1 or cost>10000 then raise exception 'INVALID_TEXT'; end if;
 if p.used_credits+cost>p.credits then raise exception 'INSUFFICIENT_CREDITS'; end if;
 if exists(select 1 from public.windi_voice_jobs where user_id=p_user and status in ('reserved','pending')) then raise exception 'REQUEST_PENDING'; end if;
 update public.windi_voice_periods set used_credits=used_credits+cost where id=p.id;
 insert into public.windi_voice_jobs(user_id,period_id,request_key,voice_id,voice_name,transcript,language,speed,credits)
 values(p_user,p.id,p_key,p_voice,p_name,p_text,p_language,p_speed,cost) returning * into j;
 insert into public.windi_voice_ledger(user_id,period_id,job_id,kind,amount) values(p_user,p.id,j.id,'reserve',-cost);
 return j;
end $$;
create function public.windi_voice_finish(p_job uuid,p_success boolean,p_path text default null) returns void
language plpgsql security invoker set search_path = '' as $$
declare j public.windi_voice_jobs;
begin
 select * into j from public.windi_voice_jobs where id=p_job for update;
 if not found or j.status not in ('reserved','pending') then return; end if;
 if p_success then
  if p_path is null or p_path<>j.user_id::text||'/'||j.id::text||'.mp3' then raise exception 'INVALID_AUDIO_PATH'; end if;
  update public.windi_voice_jobs set status='ready',storage_path=p_path where id=j.id;
 else
  update public.windi_voice_jobs set status='failed' where id=j.id;
  update public.windi_voice_periods set used_credits=used_credits-j.credits where id=j.period_id;
  insert into public.windi_voice_ledger(user_id,period_id,job_id,kind,amount) values(j.user_id,j.period_id,j.id,'refund',j.credits);
 end if;
end $$;
create function public.windi_voice_clone_reserve(p_user uuid,p_key uuid,p_name text,p_language text) returns public.windi_voice_clones
language plpgsql security invoker set search_path = '' as $$
declare p public.windi_voice_periods; c public.windi_voice_clones;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,73));
 select * into c from public.windi_voice_clones where user_id=p_user and request_key=p_key;
 if found then return c; end if;
 select * into p from public.windi_voice_periods where user_id=p_user and starts_at<=now() and ends_at>now() order by ends_at desc limit 1 for update;
 if not found then raise exception 'NO_SUBSCRIPTION'; end if;
 if p.clones_used>=p.clone_limit or (select count(*) from public.windi_voice_clones where user_id=p_user and status in ('ready','reserved','pending'))>=p.clone_limit then raise exception 'CLONE_LIMIT'; end if;
 if exists(select 1 from public.windi_voice_clones where user_id=p_user and status in ('reserved','pending')) then raise exception 'REQUEST_PENDING'; end if;
 update public.windi_voice_periods set clones_used=clones_used+1 where id=p.id;
 insert into public.windi_voice_clones(user_id,period_id,request_key,name,language) values(p_user,p.id,p_key,p_name,p_language) returning * into c;
 return c;
end $$;
create function public.windi_voice_clone_finish(p_clone uuid,p_provider text) returns void
language plpgsql security invoker set search_path = '' as $$
declare c public.windi_voice_clones;
begin
 select * into c from public.windi_voice_clones where id=p_clone for update;
 if not found or c.status not in ('reserved','pending') then return; end if;
 if p_provider is not null then
  update public.windi_voice_clones set status='ready',provider_id=p_provider where id=c.id;
 else
  update public.windi_voice_clones set status='failed' where id=c.id;
  update public.windi_voice_periods set clones_used=clones_used-1 where id=c.period_id;
 end if;
end $$;
revoke all on function public.windi_voice_order(uuid,text),public.windi_voice_pay(text,text,integer),public.windi_voice_reserve(uuid,uuid,text,text,text,text,numeric),public.windi_voice_finish(uuid,boolean,text),public.windi_voice_clone_reserve(uuid,uuid,text,text),public.windi_voice_clone_finish(uuid,text) from public,anon,authenticated;
grant execute on function public.windi_voice_order(uuid,text),public.windi_voice_pay(text,text,integer),public.windi_voice_reserve(uuid,uuid,text,text,text,text,numeric),public.windi_voice_finish(uuid,boolean,text),public.windi_voice_clone_reserve(uuid,uuid,text,text),public.windi_voice_clone_finish(uuid,text) to service_role;

-- Private audio; access uses short-lived server-signed URLs after ownership checks.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('windi-voice-audio','windi-voice-audio',false,52428800,array['audio/mpeg']) on conflict(id) do nothing;

create index windi_voice_orders_plan on public.windi_voice_orders(plan_id);
create index windi_voice_periods_plan on public.windi_voice_periods(plan_id);
create index windi_voice_clones_period on public.windi_voice_clones(period_id);
create index windi_voice_jobs_period on public.windi_voice_jobs(period_id);
create index windi_voice_ledger_period on public.windi_voice_ledger(period_id);
