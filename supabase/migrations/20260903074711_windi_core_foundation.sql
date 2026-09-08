-- WindiStudio foundation. This migration is additive: it preserves auth.users,
-- existing profiles, legacy transactions, and current payment/webhook records.
-- Image-generation tables are intentionally not dropped here; see README for retirement checklist.

create extension if not exists pgcrypto;

do $$ begin
  create type public.resource_type as enum ('SKILL', 'MCP', 'OPEN_SOURCE', 'WORKFLOW', 'STACK');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.resource_status as enum ('CANDIDATE', 'REVIEW', 'PUBLISHED', 'REJECTED', 'DEPRECATED', 'ARCHIVED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.visibility_level as enum ('PUBLIC', 'PRIVATE', 'UNLISTED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_purpose as enum ('LEGACY_CREDITS', 'DONATION', 'SUBSCRIPTION', 'PREMIUM_STACK');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role text not null default 'user',
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists website_url text;
alter table public.profiles add column if not exists theme_preference text check (theme_preference in ('light', 'dark', 'system'));
create unique index if not exists profiles_username_unique on public.profiles(lower(username)) where username is not null;
alter table public.profiles enable row level security;
drop policy if exists "Windi public profiles" on public.profiles;
create policy "Windi profile owner read" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "Windi profile owner update" on public.profiles;
create policy "Windi profile owner update" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Keep the existing payment history table as the durable ledger and add Windi-safe meaning.
alter table public.transactions add column if not exists purpose public.payment_purpose not null default 'LEGACY_CREDITS';
alter table public.transactions add column if not exists provider text;
alter table public.transactions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.transactions add column if not exists idempotency_key text;
create unique index if not exists transactions_idempotency_unique on public.transactions(idempotency_key) where idempotency_key is not null;

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  type public.resource_type not null,
  status public.resource_status not null default 'CANDIDATE',
  name text not null,
  tagline text,
  description text,
  long_description text,
  canonical_url text not null,
  repository_url text,
  documentation_url text,
  homepage_url text,
  owner_name text,
  owner_avatar_url text,
  license text,
  language text,
  is_official boolean not null default false,
  is_editor_pick boolean not null default false,
  is_community_pick boolean not null default false,
  is_sponsored boolean not null default false,
  published_at timestamptz,
  last_source_update_at timestamptz,
  last_reviewed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resources_canonical_url_unique unique (canonical_url)
);
create index if not exists resources_discovery_idx on public.resources(type, status, is_editor_pick desc, updated_at desc);
create index if not exists resources_search_idx on public.resources using gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(tagline, '') || ' ' || coalesce(description, '')));

create table if not exists public.resource_sources (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  source_type text not null check (source_type in ('github', 'skills_sh', 'mcp_registry', 'manual')),
  source_identifier text not null,
  source_url text not null,
  raw_metadata jsonb not null default '{}'::jsonb,
  fetched_at timestamptz,
  created_at timestamptz not null default now(),
  unique(source_type, source_identifier)
);

create table if not exists public.resource_metric_snapshots (
  id bigint generated always as identity primary key,
  resource_id uuid not null references public.resources(id) on delete cascade,
  source_id uuid references public.resource_sources(id) on delete set null,
  github_stars integer, forks integer, watchers integer, open_issues integer, contributors integer,
  install_count integer, download_count integer, community_votes integer, bookmarks integer,
  last_commit_at timestamptz, release_frequency_days numeric,
  captured_at timestamptz not null default now()
);
create index if not exists metric_snapshots_resource_time_idx on public.resource_metric_snapshots(resource_id, captured_at desc);

create table if not exists public.resource_scores (
  resource_id uuid primary key references public.resources(id) on delete cascade,
  utility smallint not null check (utility between 0 and 20),
  maintenance smallint not null check (maintenance between 0 and 15),
  adoption smallint not null check (adoption between 0 and 15),
  security smallint not null check (security between 0 and 15),
  documentation smallint not null check (documentation between 0 and 10),
  originality smallint not null check (originality between 0 and 10),
  compatibility smallint not null check (compatibility between 0 and 10),
  setup smallint not null check (setup between 0 and 5),
  editor_override_reason text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
create table if not exists public.resource_score_history (
  id bigint generated always as identity primary key,
  resource_id uuid not null references public.resources(id) on delete cascade,
  score jsonb not null,
  reason text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.categories add column if not exists slug text;
alter table public.categories add column if not exists description text;
alter table public.categories add column if not exists is_active boolean not null default true;
create unique index if not exists categories_slug_unique on public.categories(slug) where slug is not null;
alter table public.categories enable row level security;
create table if not exists public.tags (id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null unique, created_at timestamptz not null default now());
create table if not exists public.resource_categories (resource_id uuid not null references public.resources(id) on delete cascade, category_id bigint not null references public.categories(id) on delete cascade, primary key(resource_id, category_id));
create table if not exists public.resource_tags (resource_id uuid not null references public.resources(id) on delete cascade, tag_id uuid not null references public.tags(id) on delete cascade, primary key(resource_id, tag_id));
create table if not exists public.agents (id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null, created_at timestamptz not null default now());
create table if not exists public.resource_compatibilities (resource_id uuid not null references public.resources(id) on delete cascade, agent_id uuid not null references public.agents(id) on delete cascade, compatibility text not null default 'SUPPORTED', notes text, primary key(resource_id, agent_id));

create table if not exists public.bookmarks (user_id uuid not null references public.profiles(id) on delete cascade, resource_id uuid not null references public.resources(id) on delete cascade, created_at timestamptz not null default now(), primary key(user_id, resource_id));
create table if not exists public.collections (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, slug text not null, name text not null, description text, visibility public.visibility_level not null default 'PRIVATE', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id, slug));
create table if not exists public.collection_items (collection_id uuid not null references public.collections(id) on delete cascade, resource_id uuid not null references public.resources(id) on delete cascade, note text, position integer not null default 0, created_at timestamptz not null default now(), primary key(collection_id, resource_id));
create table if not exists public.stacks (id uuid primary key default gen_random_uuid(), owner_id uuid references public.profiles(id) on delete set null, slug text not null unique, name text not null, description text, use_case text, difficulty text, visibility public.visibility_level not null default 'PRIVATE', is_official boolean not null default false, is_premium boolean not null default false, status public.resource_status not null default 'CANDIDATE', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.stack_items (stack_id uuid not null references public.stacks(id) on delete cascade, resource_id uuid not null references public.resources(id) on delete cascade, position integer not null default 0, setup_note text, primary key(stack_id, resource_id));
create table if not exists public.follows (user_id uuid not null references public.profiles(id) on delete cascade, resource_id uuid not null references public.resources(id) on delete cascade, created_at timestamptz not null default now(), primary key(user_id, resource_id));

create table if not exists public.reviews (id uuid primary key default gen_random_uuid(), resource_id uuid not null references public.resources(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade, rating smallint check (rating between 1 and 5), body text not null, status text not null default 'PUBLISHED' check(status in ('PUBLISHED', 'HIDDEN', 'REMOVED')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(resource_id, user_id));
create table if not exists public.comments (id uuid primary key default gen_random_uuid(), resource_id uuid references public.resources(id) on delete cascade, parent_id uuid references public.comments(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade, body text not null, status text not null default 'PUBLISHED' check(status in ('PUBLISHED', 'HIDDEN', 'REMOVED')), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.resource_votes (user_id uuid not null references public.profiles(id) on delete cascade, resource_id uuid not null references public.resources(id) on delete cascade, value smallint not null check(value in (-1, 1)), created_at timestamptz not null default now(), primary key(user_id, resource_id));
create table if not exists public.reports (id uuid primary key default gen_random_uuid(), reporter_id uuid references public.profiles(id) on delete set null, resource_id uuid references public.resources(id) on delete cascade, comment_id uuid references public.comments(id) on delete cascade, reason text not null, details text, status text not null default 'OPEN' check(status in ('OPEN', 'RESOLVED', 'DISMISSED')), created_at timestamptz not null default now());
create table if not exists public.submissions (id uuid primary key default gen_random_uuid(), submitter_id uuid not null references public.profiles(id) on delete cascade, url text not null, name text, type public.resource_type not null, category_id bigint references public.categories(id) on delete set null, relationship text not null, reason text not null, status public.resource_status not null default 'REVIEW', created_at timestamptz not null default now(), reviewed_at timestamptz, reviewed_by uuid references public.profiles(id) on delete set null);
create table if not exists public.moderation_actions (id bigint generated always as identity primary key, actor_id uuid references public.profiles(id) on delete set null, target_type text not null, target_id uuid, action text not null, reason text not null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table if not exists public.sponsor_placements (id uuid primary key default gen_random_uuid(), resource_id uuid not null references public.resources(id) on delete cascade, label text not null default 'Sponsored', placement text not null, starts_at timestamptz not null, ends_at timestamptz, created_at timestamptz not null default now());
create table if not exists public.ingestion_jobs (id uuid primary key default gen_random_uuid(), source_type text not null, status text not null default 'QUEUED' check(status in ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED')), cursor text, result jsonb not null default '{}'::jsonb, error text, started_at timestamptz, finished_at timestamptz, created_at timestamptz not null default now());
create table if not exists public.subscriptions (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, plan_key text not null, status text not null, provider_subscription_id text unique, current_period_end timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.entitlements (user_id uuid not null references public.profiles(id) on delete cascade, feature_key text not null, source text not null, expires_at timestamptz, created_at timestamptz not null default now(), primary key(user_id, feature_key));

alter table public.resources enable row level security; alter table public.resource_sources enable row level security; alter table public.resource_metric_snapshots enable row level security; alter table public.resource_scores enable row level security; alter table public.resource_score_history enable row level security; alter table public.tags enable row level security; alter table public.resource_categories enable row level security; alter table public.resource_tags enable row level security; alter table public.agents enable row level security; alter table public.resource_compatibilities enable row level security; alter table public.bookmarks enable row level security; alter table public.collections enable row level security; alter table public.collection_items enable row level security; alter table public.stacks enable row level security; alter table public.stack_items enable row level security; alter table public.follows enable row level security; alter table public.reviews enable row level security; alter table public.comments enable row level security; alter table public.resource_votes enable row level security; alter table public.reports enable row level security; alter table public.submissions enable row level security; alter table public.moderation_actions enable row level security; alter table public.sponsor_placements enable row level security; alter table public.ingestion_jobs enable row level security; alter table public.subscriptions enable row level security; alter table public.entitlements enable row level security;

create policy "Public published resources" on public.resources for select using (status = 'PUBLISHED');
create policy "Public resource sources" on public.resource_sources for select using (exists(select 1 from public.resources r where r.id = resource_id and r.status = 'PUBLISHED'));
create policy "Public resource metrics" on public.resource_metric_snapshots for select using (exists(select 1 from public.resources r where r.id = resource_id and r.status = 'PUBLISHED'));
create policy "Public scores" on public.resource_scores for select using (exists(select 1 from public.resources r where r.id = resource_id and r.status = 'PUBLISHED'));
create policy "Public score history" on public.resource_score_history for select using (exists(select 1 from public.resources r where r.id = resource_id and r.status = 'PUBLISHED'));
create policy "Public tags" on public.tags for select using (true); create policy "Public agents" on public.agents for select using (true); create policy "Public compatibility" on public.resource_compatibilities for select using (exists(select 1 from public.resources r where r.id = resource_id and r.status = 'PUBLISHED'));
create policy "Public resource categories" on public.resource_categories for select using (exists(select 1 from public.resources r where r.id = resource_id and r.status = 'PUBLISHED'));
create policy "Public resource tags" on public.resource_tags for select using (exists(select 1 from public.resources r where r.id = resource_id and r.status = 'PUBLISHED'));
create policy "Public active categories" on public.categories for select using (is_active = true);
create policy "Bookmark ownership" on public.bookmarks for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Collection visibility" on public.collections for select using (visibility = 'PUBLIC' or (select auth.uid()) = user_id);
create policy "Collection ownership" on public.collections for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Collection items readable" on public.collection_items for select using (exists(select 1 from public.collections c where c.id = collection_id and (c.visibility = 'PUBLIC' or c.user_id = (select auth.uid()))));
create policy "Collection items ownership" on public.collection_items for all to authenticated using (exists(select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid()))) with check (exists(select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid())));
create policy "Stack visibility" on public.stacks for select using (visibility = 'PUBLIC' or owner_id = (select auth.uid()) or is_official);
create policy "Stack ownership" on public.stacks for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Stack items readable" on public.stack_items for select using (exists(select 1 from public.stacks s where s.id = stack_id and (s.visibility = 'PUBLIC' or s.owner_id = (select auth.uid()) or s.is_official)));
create policy "Stack items ownership" on public.stack_items for all to authenticated using (exists(select 1 from public.stacks s where s.id = stack_id and s.owner_id = (select auth.uid()))) with check (exists(select 1 from public.stacks s where s.id = stack_id and s.owner_id = (select auth.uid())));
create policy "Follow ownership" on public.follows for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Public reviews" on public.reviews for select using (status = 'PUBLISHED'); create policy "Review ownership" on public.reviews for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Public comments" on public.comments for select using (status = 'PUBLISHED'); create policy "Comment ownership" on public.comments for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Vote ownership" on public.resource_votes for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Report create" on public.reports for insert to authenticated with check ((select auth.uid()) = reporter_id); create policy "Report own read" on public.reports for select to authenticated using ((select auth.uid()) = reporter_id);
create policy "Submission ownership" on public.submissions for all to authenticated using ((select auth.uid()) = submitter_id) with check ((select auth.uid()) = submitter_id);
create policy "Subscription ownership" on public.subscriptions for select to authenticated using ((select auth.uid()) = user_id); create policy "Entitlement ownership" on public.entitlements for select to authenticated using ((select auth.uid()) = user_id);
-- All administrative writes run server-side with the service role and are recorded in moderation_actions.
