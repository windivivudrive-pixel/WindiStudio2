-- Standalone, additive catalog slice. Apply this exact file only after backup.
-- The earlier windi_core_foundation draft is NOT a prerequisite and must not be pushed.
-- No Auth, profiles, payment, image or Storage records are modified here.
begin;
do $$ begin
  create type public.resource_type as enum ('SKILL','MCP','OPEN_SOURCE','WORKFLOW','STACK');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.resource_status as enum ('CANDIDATE','REVIEW','PUBLISHED','REJECTED','DEPRECATED','ARCHIVED');
exception when duplicate_object then null; end $$;

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  external_identity text not null unique,
  slug text not null unique,
  type public.resource_type not null,
  status public.resource_status not null default 'CANDIDATE',
  name text not null check (length(name) between 1 and 300),
  tagline text, description text, long_description text,
  canonical_url text not null check (canonical_url ~ '^https://'),
  repository_url text, documentation_url text, homepage_url text,
  owner_name text, license text,
  is_official boolean not null default false,
  is_editor_pick boolean not null default false,
  is_community_pick boolean not null default false,
  is_sponsored boolean not null default false,
  import_metadata jsonb not null default '{}',
  published_at timestamptz, last_source_update_at timestamptz, last_reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (status <> 'PUBLISHED' or (published_at is not null and last_reviewed_at is not null))
);
create index resources_published_discovery_idx on public.resources(type, updated_at desc) where status = 'PUBLISHED';
create index resources_search_text_idx on public.resources using gin(to_tsvector('simple', name || ' ' || coalesce(tagline,'') || ' ' || coalesce(description,'')));

create table public.resource_sources (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  source_type text not null check(source_type in ('github','github_search','skills_sh','awesome_agent_skills','trendshift','mcp_registry','manual')),
  source_identifier text not null, source_url text not null check(source_url ~ '^https://'),
  raw_metadata jsonb not null default '{}', fetched_at timestamptz not null,
  unique(resource_id,source_type,source_identifier)
);
create index resource_sources_resource_idx on public.resource_sources(resource_id);
create table public.resource_metric_snapshots (
  id bigint generated always as identity primary key,
  resource_id uuid not null references public.resources(id) on delete cascade,
  source_type text not null, metric_key text not null,
  metric_value numeric not null check(metric_value >= 0), captured_at timestamptz not null,
  unique(resource_id, source_type, metric_key, captured_at)
);
create index resource_metrics_resource_time_idx on public.resource_metric_snapshots(resource_id,captured_at desc);

create table public.resource_community_evidence (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  source_url text not null check(source_url ~ '^https://'),
  platform text not null, author_name text not null,
  author_relationship text not null check(author_relationship in ('USER','MAINTAINER','AFFILIATE','UNKNOWN')),
  title text not null, summary_vi text not null,
  positive_notes text, limitation_notes text,
  resource_match text not null check(resource_match in ('EXACT','RELATED_PROJECT')),
  match_explanation text not null,
  status text not null default 'REVIEW' check(status in ('REVIEW','PUBLISHED','REJECTED','REMOVED')),
  observed_at timestamptz not null, verified_at timestamptz, source_published_at timestamptz,
  review_reason text, verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(resource_id,source_url),
  check(status <> 'PUBLISHED' or (verified_at is not null and verified_by is not null and coalesce(length(trim(review_reason)),0) > 0))
);
create index evidence_resource_status_idx on public.resource_community_evidence(resource_id,status);
create index evidence_verified_by_idx on public.resource_community_evidence(verified_by);
create table public.resource_evidence_media (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.resource_community_evidence(id) on delete cascade,
  kind text not null check(kind in ('IMAGE','YOUTUBE','VIMEO','SOURCE_LINK')),
  source_url text not null check(source_url ~ '^https://'),
  media_url text check(media_url is null or media_url ~ '^https://'),
  alt_text text not null, position integer not null default 0 check(position >= 0),
  rights_basis text not null default 'LINK_ONLY' check(rights_basis in ('LINK_ONLY','PLATFORM_EMBED','PERMISSION','LICENSE')),
  rights_source_url text check(rights_source_url is null or rights_source_url ~ '^https://'),
  rights_verified_at timestamptz,
  unique(evidence_id,source_url),
  check(rights_basis = 'LINK_ONLY' or (rights_source_url is not null and rights_verified_at is not null)),
  check(kind <> 'IMAGE' or rights_basis in ('LINK_ONLY','PERMISSION','LICENSE'))
);
create index evidence_media_evidence_idx on public.resource_evidence_media(evidence_id);
create table public.resource_evidence_jobs (
  resource_id uuid primary key references public.resources(id) on delete cascade,
  status text not null default 'NEEDS_RESEARCH' check(status in ('NEEDS_RESEARCH','RESEARCHING','REVIEW','COMPLETE','NO_RELIABLE_EVIDENCE')),
  last_checked_at timestamptz, next_check_at timestamptz, notes text,
  updated_at timestamptz not null default now()
);
create table public.resource_import_runs (
  idempotency_key text primary key, catalog_hash text not null,
  imported_count integer not null, created_at timestamptz not null default now()
);

-- Explicit privileges: imported metadata is never client writable.
alter table public.resources enable row level security;
alter table public.resource_sources enable row level security;
alter table public.resource_metric_snapshots enable row level security;
alter table public.resource_community_evidence enable row level security;
alter table public.resource_evidence_media enable row level security;
alter table public.resource_evidence_jobs enable row level security;
alter table public.resource_import_runs enable row level security;
revoke all on public.resources, public.resource_sources, public.resource_metric_snapshots,
  public.resource_community_evidence, public.resource_evidence_media, public.resource_evidence_jobs,
  public.resource_import_runs from public, anon, authenticated;
grant select on public.resources,public.resource_community_evidence,public.resource_evidence_media to anon,authenticated;
-- raw_metadata may contain untrusted upstream values: expose only attribution columns.
grant select(id,resource_id,source_type,source_identifier,source_url,fetched_at) on public.resource_sources to anon,authenticated;
grant select on public.resource_metric_snapshots to anon,authenticated;
grant all on public.resources, public.resource_sources, public.resource_metric_snapshots,
  public.resource_community_evidence, public.resource_evidence_media, public.resource_evidence_jobs,
  public.resource_import_runs to service_role;
grant usage,select on sequence public.resource_metric_snapshots_id_seq to service_role;
create policy catalog_published_read on public.resources for select to anon,authenticated using(status = 'PUBLISHED');
create policy catalog_sources_read on public.resource_sources for select to anon,authenticated
  using(exists(select 1 from public.resources r where r.id=resource_id and r.status='PUBLISHED'));
create policy catalog_metrics_read on public.resource_metric_snapshots for select to anon,authenticated
  using(exists(select 1 from public.resources r where r.id=resource_id and r.status='PUBLISHED'));
create policy community_evidence_published_read on public.resource_community_evidence for select to anon,authenticated
  using(status='PUBLISHED' and exists(select 1 from public.resources r where r.id=resource_id and r.status='PUBLISHED'));
create policy evidence_media_published_read on public.resource_evidence_media for select to anon,authenticated
  using(exists(select 1 from public.resource_community_evidence e where e.id=evidence_id and e.status='PUBLISHED'));

-- A single transactional, retry-safe import. No caller can smuggle status, scores or badges.
create or replace function public.import_windi_catalog(payload jsonb, run_key text, content_hash text)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare c jsonb; s jsonb; m jsonb; e jsonb; media jsonb; rid uuid; eid uuid; previous_hash text; count_rows integer := 0;
begin
  if jsonb_typeof(payload) <> 'array' or jsonb_array_length(payload) <> 200 then
    raise exception 'Expected 200 catalog candidates';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('windi-catalog-import',0));
  select catalog_hash into previous_hash from public.resource_import_runs where idempotency_key=run_key;
  if previous_hash is not null then
    if previous_hash <> content_hash then raise exception 'Idempotency key payload mismatch'; end if;
    return jsonb_build_object('status','already_imported','count',200);
  end if;
  for c in select value from jsonb_array_elements(payload) loop
    insert into public.resources(external_identity,slug,type,name,canonical_url,repository_url,owner_name,license,import_metadata,last_source_update_at)
    values(c->>'identity',c->>'slug',(c->>'type')::public.resource_type,c->>'name',c->>'canonicalUrl',c->>'repositoryUrl',c->>'publisher',c->>'license',coalesce(c->'metadata','{}'),(c->>'fetchedAt')::timestamptz)
    on conflict(external_identity) do update set
      import_metadata=excluded.import_metadata,last_source_update_at=excluded.last_source_update_at
    returning id into rid;
    for s in select value from jsonb_array_elements(coalesce(c->'sources','[]')) loop
      insert into public.resource_sources(resource_id,source_type,source_identifier,source_url,raw_metadata,fetched_at)
      values(rid,s->>'source',s->>'sourceId',s->>'sourceUrl',coalesce(s->'metadata','{}'),(s->>'fetchedAt')::timestamptz)
      on conflict(resource_id,source_type,source_identifier) do update set raw_metadata=excluded.raw_metadata,fetched_at=excluded.fetched_at,source_url=excluded.source_url;
    end loop;
    for m in select value from jsonb_array_elements(coalesce(c->'metrics','[]')) loop
      insert into public.resource_metric_snapshots(resource_id,source_type,metric_key,metric_value,captured_at)
      values(rid,m->>'source',m->>'kind',(m->>'value')::numeric,(m->>'observedAt')::timestamptz)
      on conflict(resource_id,source_type,metric_key,captured_at) do nothing;
    end loop;
    insert into public.resource_evidence_jobs(resource_id) values(rid) on conflict do nothing;
    for e in select value from jsonb_array_elements(coalesce(c->'evidence','[]')) loop
      insert into public.resource_community_evidence(resource_id,source_url,platform,author_name,author_relationship,title,summary_vi,positive_notes,limitation_notes,resource_match,match_explanation,observed_at)
      values(rid,e->>'source_url',e->>'platform',e->>'author_name',e->>'author_relationship',e->>'title',e->>'summary_vi',e->>'positive_notes',e->>'limitation_notes',e->>'resource_match',e->>'match_explanation',(e->>'observed_at')::timestamptz)
      on conflict(resource_id,source_url) do nothing returning id into eid;
      -- Never replace content/media of an entry already reviewed by an editor.
      if eid is not null then
        for media in select value from jsonb_array_elements(coalesce(e->'media','[]')) loop
          insert into public.resource_evidence_media(evidence_id,kind,source_url,media_url,alt_text,rights_basis)
          values(eid,media->>'kind',media->>'source_url',media->>'media_url',media->>'alt_text','LINK_ONLY');
        end loop;
        update public.resource_evidence_jobs set status='REVIEW',last_checked_at=now(),updated_at=now() where resource_id=rid and status='NEEDS_RESEARCH';
      end if;
    end loop;
    count_rows := count_rows+1;
  end loop;
  insert into public.resource_import_runs(idempotency_key,catalog_hash,imported_count) values(run_key,content_hash,count_rows);
  return jsonb_build_object('status','imported','count',count_rows);
end; $$;
revoke all on function public.import_windi_catalog(jsonb,text,text) from public,anon,authenticated;
grant execute on function public.import_windi_catalog(jsonb,text,text) to service_role;
notify pgrst,'reload schema';
commit;
