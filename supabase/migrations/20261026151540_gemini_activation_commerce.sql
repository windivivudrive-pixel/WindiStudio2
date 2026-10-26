begin;

-- All link inventory and payment data are server-only, including authenticated users.
create table public.windi_gemini_settings (
  id boolean primary key default true check (id),
  price_vnd integer not null default 150000 check (price_vnd = 150000),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.windi_gemini_settings(id) values(true);

create table public.windi_gemini_links (
  id uuid primary key default gen_random_uuid(),
  activation_url text not null unique check (activation_url ~ '^https://one[.]google[.]com/offer/[A-Za-z0-9_-]{8,128}$'),
  valid_until timestamptz not null,
  disabled boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.windi_gemini_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  activation_id uuid unique references public.windi_gemini_links(id),
  amount_vnd integer not null default 150000 check (amount_vnd = 150000),
  status text not null default 'PENDING' check(status in ('PENDING','PAID','EXPIRED','REVIEW_REQUIRED','UNDERPAID','OVERPAID','REFUNDED')),
  payment_code text not null unique default ('WINDI G'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '10 minutes'),
  paid_at timestamptz,
  terms_version text not null default 'gemini-3m-2026-10-26',
  check (status <> 'PAID' or (activation_id is not null and paid_at is not null))
);
create index windi_gemini_orders_owner on public.windi_gemini_orders(user_id,created_at desc);
create index windi_gemini_orders_expiry on public.windi_gemini_orders(expires_at) where status='PENDING';
create table public.windi_gemini_payment_events (
  gateway_id text primary key,
  order_id uuid not null references public.windi_gemini_orders(id),
  amount_vnd integer not null,
  transferred_at timestamptz not null,
  result text not null,
  created_at timestamptz not null default now()
);

alter table public.windi_gemini_settings enable row level security;
alter table public.windi_gemini_links enable row level security;
alter table public.windi_gemini_orders enable row level security;
alter table public.windi_gemini_payment_events enable row level security;
revoke all on public.windi_gemini_settings,public.windi_gemini_links,public.windi_gemini_orders,public.windi_gemini_payment_events from public,anon,authenticated;
grant all on public.windi_gemini_settings,public.windi_gemini_links,public.windi_gemini_orders,public.windi_gemini_payment_events to service_role;

-- Same transaction lock across expiry, checkout, payment and stock administration.
create function public.windi_gemini_stock() returns integer
language plpgsql security invoker set search_path='' as $$
declare remaining integer;
begin
  perform pg_advisory_xact_lock(871942003);
  update public.windi_gemini_orders set status='EXPIRED',activation_id=null
    where status='PENDING' and expires_at<=now();
  select count(*)::integer into remaining from public.windi_gemini_links l
    where not l.disabled and l.valid_until>now()+interval '10 minutes'
      and not exists(select 1 from public.windi_gemini_orders o where o.activation_id=l.id);
  return remaining;
end $$;

create function public.windi_gemini_order(p_user uuid) returns public.windi_gemini_orders
language plpgsql security invoker set search_path='' as $$
declare target public.windi_gemini_orders; link_id uuid;
begin
  perform public.windi_gemini_stock();
  if not exists(select 1 from public.windi_gemini_settings where id and enabled) then raise exception 'GEMINI_DISABLED'; end if;
  select * into target from public.windi_gemini_orders where user_id=p_user and status='PENDING' order by created_at desc limit 1;
  if found then return target; end if;
  select l.id into link_id from public.windi_gemini_links l
    where not l.disabled and l.valid_until>now()+interval '10 minutes'
      and not exists(select 1 from public.windi_gemini_orders o where o.activation_id=l.id)
    order by l.valid_until,l.created_at,l.id limit 1 for update;
  if link_id is null then raise exception 'GEMINI_OUT_OF_STOCK'; end if;
  insert into public.windi_gemini_orders(user_id,activation_id) values(p_user,link_id) returning * into target;
  return target;
end $$;

create function public.windi_gemini_pay(p_code text,p_gateway text,p_amount integer,p_paid_at timestamptz) returns text
language plpgsql security invoker set search_path='' as $$
declare target public.windi_gemini_orders; prior public.windi_gemini_payment_events; outcome text;
begin
  perform pg_advisory_xact_lock(871942003);
  select * into target from public.windi_gemini_orders where payment_code=p_code for update;
  if not found then return 'ignored'; end if;
  select * into prior from public.windi_gemini_payment_events where gateway_id=p_gateway;
  if found then return case when prior.order_id=target.id then prior.result else 'ignored' end; end if;
  if p_gateway is null or length(p_gateway)=0 or p_amount is null or p_amount<=0 or p_paid_at is null then raise exception 'INVALID_PAYMENT'; end if;
  outcome := case
    when target.status<>'PENDING' or target.expires_at<=now() or target.activation_id is null
      or p_paid_at<target.created_at-interval '1 minute' or p_paid_at>target.expires_at or p_paid_at>now()+interval '5 minutes' then 'review'
    when not exists(select 1 from public.windi_gemini_links where id=target.activation_id and not disabled and valid_until>now()) then 'review'
    when p_amount<target.amount_vnd then 'underpaid'
    when p_amount>target.amount_vnd then 'overpaid'
    else 'paid' end;
  insert into public.windi_gemini_payment_events(gateway_id,order_id,amount_vnd,transferred_at,result)
    values(p_gateway,target.id,p_amount,p_paid_at,outcome);
  -- A second transfer must never revoke an already delivered order.
  if target.status<>'PAID' then
    update public.windi_gemini_orders set
      status=case outcome when 'paid' then 'PAID' when 'underpaid' then 'UNDERPAID' when 'overpaid' then 'OVERPAID' else 'REVIEW_REQUIRED' end,
      paid_at=case when outcome='paid' then p_paid_at else null end where id=target.id;
  end if;
  return outcome;
end $$;

-- Import is atomic and duplicates cannot replenish an already sold link.
create function public.windi_gemini_import(p_urls text[],p_valid_until timestamptz) returns integer
language plpgsql security invoker set search_path='' as $$
declare added integer;
begin
  perform pg_advisory_xact_lock(871942003);
  if p_urls is null or cardinality(p_urls)<1 or cardinality(p_urls)>500 or p_valid_until is null or p_valid_until<=now()+interval '10 minutes' then raise exception 'INVALID_STOCK'; end if;
  insert into public.windi_gemini_links(activation_url,valid_until)
    select distinct unnest(p_urls),p_valid_until on conflict(activation_url) do nothing;
  get diagnostics added=row_count;
  return added;
end $$;

revoke all on function public.windi_gemini_stock(),public.windi_gemini_order(uuid),public.windi_gemini_pay(text,text,integer,timestamptz),public.windi_gemini_import(text[],timestamptz) from public,anon,authenticated;
grant execute on function public.windi_gemini_stock(),public.windi_gemini_order(uuid),public.windi_gemini_pay(text,text,integer,timestamptz),public.windi_gemini_import(text[],timestamptz) to service_role;
notify pgrst, 'reload schema';
commit;
