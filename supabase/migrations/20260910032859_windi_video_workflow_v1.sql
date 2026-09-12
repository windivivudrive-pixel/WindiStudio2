-- The production project predates the generic commerce draft. Keep this
-- migration self-contained instead of requiring the legacy CreatorFlow schema.
begin;
do $$ begin
  create type public.product_type as enum ('STUDIO_LICENSE','VOICE_UNITS','VIDEO_KIT_LICENSE');
exception when duplicate_object then
  alter type public.product_type add value if not exists 'VIDEO_KIT_LICENSE';
end $$;
do $$ begin
  create type public.order_status as enum ('PENDING','PAID','EXPIRED','UNDERPAID','OVERPAID','REVIEW_REQUIRED','REFUNDED');
exception when duplicate_object then null;
end $$;
commit;

begin;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.product_type not null,
  description text,
  price_vnd integer not null check(price_vnd >= 0),
  is_active boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  total_amount_vnd integer not null check(total_amount_vnd > 0),
  status public.order_status not null default 'PENDING',
  payment_code text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null default 1 check(quantity > 0),
  price_vnd integer not null check(price_vnd >= 0),
  created_at timestamptz not null default now()
);
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  gateway_id text not null unique,
  order_id uuid references public.orders(id),
  amount integer not null check(amount > 0),
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists orders_user_created on public.orders(user_id,created_at desc);
create index if not exists order_items_order on public.order_items(order_id);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_events enable row level security;
revoke all on public.products,public.orders,public.order_items,public.payment_events from anon,authenticated;
grant select on public.products,public.orders,public.order_items to authenticated;
grant select on public.products to anon;
grant all on public.products,public.orders,public.order_items,public.payment_events to service_role;
create policy products_active_read on public.products for select to anon,authenticated using(is_active);
create policy orders_own_read on public.orders for select to authenticated using((select auth.uid())=user_id);
create policy order_items_own_read on public.order_items for select to authenticated
  using(exists(select 1 from public.orders o where o.id=order_id and o.user_id=(select auth.uid())));

alter table public.windi_voice_orders alter column payment_code
  set default ('WINDI V' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)));

alter table public.windi_voice_jobs
  add column if not exists timing_path text,
  add column if not exists api_request_hash text,
  add column if not exists automation_token_id uuid,
  add column if not exists provider_context_id text;
alter table public.windi_voice_jobs drop constraint if exists windi_voice_jobs_status_check;
alter table public.windi_voice_jobs add constraint windi_voice_jobs_status_check
  check(status in ('reserved','pending','ready','failed','unknown'));

create table public.product_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id),
  order_item_id uuid unique references public.order_items(id),
  kind text not null check(kind in ('video_workflow_v1')),
  status text not null default 'active' check(status in ('active','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,product_id)
);
create index product_entitlements_user on public.product_entitlements(user_id,created_at desc);

create table public.product_releases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  version text not null,
  storage_bucket text not null default 'windi-releases',
  storage_path text not null,
  sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
  size_bytes bigint not null check(size_bytes > 0),
  changelog text not null default '',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique(product_id,version), unique(storage_bucket,storage_path)
);
create index product_releases_latest on public.product_releases(product_id,created_at desc) where is_published;

create table public.product_devices (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null references public.product_entitlements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_hash text not null,
  device_name text not null check(char_length(device_name) between 1 and 120),
  status text not null default 'active' check(status in ('active','revoked')),
  activated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique(entitlement_id,device_hash)
);
create unique index product_devices_one_active on public.product_devices(entitlement_id) where status='active';
create index product_devices_user on public.product_devices(user_id,last_seen_at desc);

create table public.video_kit_reservations (
  order_id uuid primary key references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  slot_number integer not null check(slot_number between 1 and 100),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create unique index video_kit_reservation_slot on public.video_kit_reservations(slot_number);
create index video_kit_reservations_expiry on public.video_kit_reservations(expires_at);

create table public.automation_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null check(purpose in ('voice_api','video_workflow')),
  name text not null check(char_length(name) between 1 and 80),
  token_prefix text not null,
  token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
  last_four text not null check(char_length(last_four)=4),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index automation_tokens_user on public.automation_tokens(user_id,created_at desc);
create index automation_tokens_lookup on public.automation_tokens(token_prefix) where revoked_at is null;

alter table public.windi_voice_jobs
  add constraint windi_voice_jobs_automation_token_fk foreign key(automation_token_id) references public.automation_tokens(id) on delete set null;
create index windi_voice_jobs_token_created on public.windi_voice_jobs(automation_token_id,created_at desc) where automation_token_id is not null;

create table public.product_download_audit (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null references public.product_entitlements(id) on delete cascade,
  release_id uuid not null references public.product_releases(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  ip_address text,
  created_at timestamptz not null default now()
);
create index product_download_audit_user on public.product_download_audit(user_id,created_at desc);

alter table public.product_entitlements enable row level security;
alter table public.product_releases enable row level security;
alter table public.product_devices enable row level security;
alter table public.video_kit_reservations enable row level security;
alter table public.automation_tokens enable row level security;
alter table public.product_download_audit enable row level security;

revoke all on public.product_entitlements,public.product_releases,public.product_devices,public.video_kit_reservations,public.automation_tokens,public.product_download_audit from anon,authenticated;
grant select on public.product_entitlements,public.product_devices,public.automation_tokens to authenticated;
grant all on public.product_entitlements,public.product_releases,public.product_devices,public.video_kit_reservations,public.automation_tokens,public.product_download_audit to service_role;

create policy product_entitlements_own on public.product_entitlements for select to authenticated using((select auth.uid())=user_id);
create policy product_devices_own on public.product_devices for select to authenticated using((select auth.uid())=user_id);
create policy automation_tokens_own on public.automation_tokens for select to authenticated using((select auth.uid())=user_id);

insert into public.products(name,type,description,price_vnd,is_active,metadata)
select 'Windi Video Workflow V1','VIDEO_KIT_LICENSE','Giấy phép trọn đời V1 cho một máy đang hoạt động.',499000,false,
  '{"sku":"windi-video-workflow-v1","launch_price_vnd":299000,"launch_limit":100,"license":"lifetime-v1","active_devices":1,"release_ready":false}'::jsonb
where not exists(select 1 from public.products where metadata->>'sku'='windi-video-workflow-v1');

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('windi-releases','windi-releases',false,1073741824,array['application/zip','application/octet-stream']) on conflict(id) do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('windi-voice-timing','windi-voice-timing',false,5242880,array['application/json']) on conflict(id) do nothing;

create or replace function public.windi_video_kit_order(p_user uuid)
returns public.orders language plpgsql security invoker set search_path='' as $$
declare product public.products; current_order public.orders; item_count integer; launch_slot integer; charge integer;
begin
  perform pg_advisory_xact_lock(871942001);
  select * into product from public.products where metadata->>'sku'='windi-video-workflow-v1' limit 1;
  if not found or not product.is_active or coalesce((product.metadata->>'release_ready')::boolean,false)=false then raise exception 'VIDEO_KIT_NOT_RELEASED'; end if;
  if exists(select 1 from public.product_entitlements where user_id=p_user and product_id=product.id and status='active') then raise exception 'VIDEO_KIT_ALREADY_OWNED'; end if;
  update public.orders o set status='EXPIRED' where o.status='PENDING' and o.expires_at<=now();
  delete from public.video_kit_reservations where expires_at<=now();
  select o.* into current_order from public.orders o join public.order_items i on i.order_id=o.id where o.user_id=p_user and o.status='PENDING' and i.product_id=product.id order by o.created_at desc limit 1;
  if found then return current_order; end if;
  select count(*) into item_count from public.product_entitlements where product_id=product.id;
  item_count:=item_count+(select count(*) from public.video_kit_reservations where expires_at>now());
  if item_count<100 then
    select candidate into launch_slot from generate_series(1,100) candidate
    where not exists(select 1 from public.video_kit_reservations r where r.slot_number=candidate and r.expires_at>now())
      and candidate>(select count(*) from public.product_entitlements where product_id=product.id)
    order by candidate limit 1;
    if launch_slot is null then charge:=499000;else charge:=299000;end if;
  else launch_slot:=null;charge:=499000;end if;
  insert into public.orders(user_id,total_amount_vnd,status,payment_code,created_at,expires_at)
  values(p_user,charge,'PENDING','WINDI K'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),now(),now()+interval '10 minutes') returning * into current_order;
  insert into public.order_items(order_id,product_id,quantity,price_vnd) values(current_order.id,product.id,1,charge);
  if launch_slot is not null then insert into public.video_kit_reservations(order_id,user_id,slot_number,expires_at) values(current_order.id,p_user,launch_slot,current_order.expires_at);end if;
  return current_order;
end $$;

create or replace function public.windi_video_kit_pay(p_code text,p_gateway text,p_amount integer,p_payload jsonb)
returns text language plpgsql security invoker set search_path='' as $$
declare target public.orders; item record; prior_status public.order_status;
begin
  select o.status into prior_status from public.payment_events e left join public.orders o on o.id=e.order_id where e.gateway_id=p_gateway;
  if found then return case prior_status when 'PAID' then 'paid' when 'UNDERPAID' then 'underpaid' when 'OVERPAID' then 'overpaid' else 'review' end;end if;
  select * into target from public.orders where payment_code=p_code for update;
  if not found then return 'ignored';end if;
  perform pg_advisory_xact_lock(871942001);
  if target.status='PAID' then return 'paid';end if;
  insert into public.payment_events(gateway_id,order_id,amount,payload) values(p_gateway,target.id,p_amount,p_payload);
  if target.status<>'PENDING' or target.expires_at<=now() then update public.orders set status='REVIEW_REQUIRED' where id=target.id;return 'review';end if;
  if p_amount<target.total_amount_vnd then update public.orders set status='UNDERPAID' where id=target.id;return 'underpaid';end if;
  if p_amount>target.total_amount_vnd then update public.orders set status='OVERPAID' where id=target.id;return 'overpaid';end if;
  update public.orders set status='PAID' where id=target.id;
  for item in select i.id,i.product_id,p.type from public.order_items i join public.products p on p.id=i.product_id where i.order_id=target.id loop
    if item.type='VIDEO_KIT_LICENSE' then insert into public.product_entitlements(user_id,product_id,order_item_id,kind) values(target.user_id,item.product_id,item.id,'video_workflow_v1') on conflict(user_id,product_id) do nothing;end if;
  end loop;
  delete from public.video_kit_reservations where order_id=target.id;return 'paid';
end $$;

create or replace function public.windi_product_activate_device(p_user uuid,p_entitlement uuid,p_device_hash text,p_device_name text,p_replace boolean default false)
returns public.product_devices language plpgsql security invoker set search_path='' as $$
declare entitlement public.product_entitlements; active_device public.product_devices; result public.product_devices;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_entitlement::text,911));
  select * into entitlement from public.product_entitlements where id=p_entitlement and user_id=p_user and status='active' for update;
  if not found then raise exception 'ENTITLEMENT_NOT_FOUND';end if;
  select * into active_device from public.product_devices where entitlement_id=p_entitlement and status='active' for update;
  if found and active_device.device_hash<>p_device_hash and not p_replace then raise exception 'DEVICE_REPLACE_REQUIRED';end if;
  if found and active_device.device_hash<>p_device_hash then update public.product_devices set status='revoked',revoked_at=now() where id=active_device.id;end if;
  insert into public.product_devices(entitlement_id,user_id,device_hash,device_name)
  values(p_entitlement,p_user,p_device_hash,p_device_name)
  on conflict(entitlement_id,device_hash) do update set status='active',device_name=excluded.device_name,last_seen_at=now(),revoked_at=null
  returning * into result;
  return result;
end $$;

revoke all on function public.windi_video_kit_order(uuid),public.windi_video_kit_pay(text,text,integer,jsonb),public.windi_product_activate_device(uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.windi_video_kit_order(uuid),public.windi_video_kit_pay(text,text,integer,jsonb),public.windi_product_activate_device(uuid,uuid,text,text,boolean) to service_role;

notify pgrst,'reload schema';
commit;
