begin;

create table public.repo_discovery_observations (
  id bigint generated always as identity primary key,
  run_key text not null,
  external_identity text not null check (external_identity ~ '^repo:https://github\.com/[a-z0-9_.-]+/[a-z0-9_.-]+$'),
  repository_url text not null check (repository_url ~ '^https://github\.com/[a-z0-9_.-]+/[a-z0-9_.-]+$'),
  github_stars integer not null check (github_stars >= 0),
  fit_score numeric not null check (fit_score between 0 and 100),
  needs text[] not null default '{}',
  pushed_at timestamptz,
  observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(run_key, external_identity)
);
create index repo_discovery_identity_time_idx
  on public.repo_discovery_observations(external_identity, observed_at desc);

create table public.repo_discovery_runs (
  run_key text primary key,
  content_hash text not null,
  observed_count integer not null check (observed_count between 0 and 200),
  selected_count integer not null check (selected_count between 0 and 10),
  inserted_count integer not null check (inserted_count between 0 and 10),
  result jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.repo_discovery_observations enable row level security;
alter table public.repo_discovery_runs enable row level security;
revoke all on public.repo_discovery_observations, public.repo_discovery_runs from public, anon, authenticated;
grant all on public.repo_discovery_observations, public.repo_discovery_runs to service_role;
grant usage, select on sequence public.repo_discovery_observations_id_seq to service_role;

create or replace function public.import_windi_repo_discovery(
  p_observations jsonb,
  p_selected jsonb,
  p_run_key text,
  p_content_hash text
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  item jsonb;
  rid uuid;
  previous_hash text;
  selected_count integer;
  eligible_count integer;
  inserted_count integer := 0;
  observation_count integer;
  inserted_identities jsonb := '[]'::jsonb;
  skipped_identities jsonb := '[]'::jsonb;
  result_payload jsonb;
begin
  if jsonb_typeof(p_observations) <> 'array' or jsonb_typeof(p_selected) <> 'array' then
    raise exception 'Observations and selected candidates must be arrays';
  end if;
  if coalesce(length(trim(p_run_key)), 0) not between 8 and 120
    or coalesce(length(trim(p_content_hash)), 0) <> 64 then
    raise exception 'Invalid run identity';
  end if;

  observation_count := jsonb_array_length(p_observations);
  selected_count := jsonb_array_length(p_selected);
  if observation_count > 200 then raise exception 'At most 200 observations per run'; end if;
  if selected_count <> 0 and selected_count not between 5 and 10 then
    raise exception 'A non-empty review batch must contain 5 to 10 candidates';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('windi-repo-discovery', 0));
  select content_hash into previous_hash from public.repo_discovery_runs where run_key = p_run_key;
  if previous_hash is not null then
    if previous_hash <> p_content_hash then raise exception 'Idempotency key payload mismatch'; end if;
    return (select result from public.repo_discovery_runs where run_key = p_run_key);
  end if;

  for item in select value from jsonb_array_elements(p_observations) loop
    if coalesce(item->>'identity', '') !~ '^repo:https://github\.com/[a-z0-9_.-]+/[a-z0-9_.-]+$'
      or coalesce(item->>'canonicalUrl', '') !~ '^https://github\.com/[a-z0-9_.-]+/[a-z0-9_.-]+$'
      or coalesce((item->>'stars')::integer, -1) < 0
      or coalesce((item->>'fitScore')::numeric, -1) not between 0 and 100 then
      raise exception 'Invalid discovery observation';
    end if;
    insert into public.repo_discovery_observations(
      run_key, external_identity, repository_url, github_stars, fit_score, needs, pushed_at, observed_at
    ) values (
      p_run_key, item->>'identity', item->>'canonicalUrl', (item->>'stars')::integer,
      (item->>'fitScore')::numeric,
      array(select jsonb_array_elements_text(coalesce(item->'needs', '[]'::jsonb))),
      nullif(item->>'pushedAt', '')::timestamptz,
      (item->>'observedAt')::timestamptz
    ) on conflict(run_key, external_identity) do nothing;
  end loop;

  if exists (
    select 1 from jsonb_array_elements(p_selected) s
    where not exists (
      select 1 from jsonb_array_elements(p_observations) o
      where o->>'identity' = s->>'identity'
    )
  ) then raise exception 'Selected candidate was not observed in this run'; end if;

  select count(*) into eligible_count
  from jsonb_array_elements(p_selected) s
  where not exists(select 1 from public.resources r where r.external_identity = s->>'identity');
  if eligible_count <> 0 and eligible_count not between 5 and 10 then
    raise exception 'Concurrent catalog changes left fewer than five new candidates';
  end if;

  for item in select value from jsonb_array_elements(p_selected) loop
    if exists(select 1 from public.resources where external_identity = item->>'identity') then
      skipped_identities := skipped_identities || jsonb_build_array(item->>'identity');
      continue;
    end if;
    if coalesce(item->>'identity', '') !~ '^repo:https://github\.com/[a-z0-9_.-]+/[a-z0-9_.-]+$'
      or coalesce(item->>'canonicalUrl', '') !~ '^https://github\.com/[a-z0-9_.-]+/[a-z0-9_.-]+$'
      or coalesce(length(trim(item->>'name')), 0) not between 1 and 300
      or coalesce((item#>>'{ranking,total}')::numeric, -1) not between 0 and 100 then
      raise exception 'Invalid selected candidate';
    end if;

    insert into public.resources(
      external_identity, slug, type, status, name, tagline, description, long_description,
      canonical_url, repository_url, documentation_url, homepage_url, owner_name, license,
      import_metadata, last_source_update_at
    ) values (
      item->>'identity',
      left(regexp_replace(lower(item->>'name'), '[^a-z0-9]+', '-', 'g'), 86) || '-' || substr(md5(item->>'identity'), 1, 8),
      'OPEN_SOURCE', 'REVIEW', trim(item->>'name'), left(nullif(trim(item->>'tagline'), ''), 240),
      nullif(trim(item->>'description'), ''), nullif(trim(item->>'longDescription'), ''),
      item->>'canonicalUrl', item->>'canonicalUrl', nullif(item->>'documentationUrl', ''),
      nullif(item->>'homepageUrl', ''), split_part(replace(item->>'identity', 'repo:https://github.com/', ''), '/', 1),
      nullif(item->>'license', ''),
      jsonb_build_object(
        'autoDiscovery', jsonb_build_object(
          'version', 'nontech-growth-v1', 'runKey', p_run_key, 'ranking', item->'ranking',
          'needs', item->'needs', 'access', item->>'access', 'flags', item->'flags',
          'readme', item->'readme', 'reviewStatus', 'NOT_TESTED'
        ),
        'verification', 'automatic_discovery_awaiting_editor_review',
        'securityReview', 'NOT_REVIEWED'
      ),
      nullif(item->>'pushedAt', '')::timestamptz
    ) returning id into rid;

    insert into public.resource_sources(resource_id, source_type, source_identifier, source_url, raw_metadata, fetched_at)
    values(
      rid, 'github', (item->>'identity') || ':auto-discovery', item->>'canonicalUrl',
      jsonb_build_object('sources', item->'sources', 'githubStars', (item->>'stars')::integer),
      (item->>'observedAt')::timestamptz
    );
    insert into public.resource_metric_snapshots(resource_id, source_type, metric_key, metric_value, captured_at)
    values(rid, 'github', 'github_stars', (item->>'stars')::integer, (item->>'observedAt')::timestamptz)
    on conflict do nothing;
    insert into public.resource_evidence_jobs(resource_id, status, notes)
    values(rid, 'NEEDS_RESEARCH', 'Ứng viên tự động; cần editor kiểm tra trải nghiệm nontech, tiếng Việt, giá và an toàn.')
    on conflict(resource_id) do nothing;

    inserted_count := inserted_count + 1;
    inserted_identities := inserted_identities || jsonb_build_array(item->>'identity');
  end loop;

  result_payload := jsonb_build_object(
    'status', 'imported', 'observedCount', observation_count, 'selectedCount', selected_count,
    'insertedCount', inserted_count, 'insertedIdentities', inserted_identities,
    'skippedIdentities', skipped_identities, 'resourceStatus', 'REVIEW'
  );
  insert into public.repo_discovery_runs(run_key, content_hash, observed_count, selected_count, inserted_count, result)
  values(p_run_key, p_content_hash, observation_count, selected_count, inserted_count, result_payload);
  return result_payload;
end;
$$;

revoke all on function public.import_windi_repo_discovery(jsonb, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.import_windi_repo_discovery(jsonb, jsonb, text, text) to service_role;
notify pgrst, 'reload schema';
commit;
