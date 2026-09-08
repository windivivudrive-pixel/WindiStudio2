begin;

-- Easy Prompt is a generated, source-bound artifact. Keep it out of
-- import_metadata so its public visibility and regeneration lifecycle can be
-- governed independently from upstream crawler payloads.
create table public.resource_easy_prompts (
  resource_id uuid primary key references public.resources(id) on delete cascade,
  status text not null default 'PENDING' check(status in ('PENDING','GENERATED','FAILED','STALE')),
  prompt_vi text,
  prompt_en text,
  source_url text not null check(source_url ~ '^https://'),
  source_hash text not null check(source_hash ~ '^[a-f0-9]{64}$'),
  composer_version text not null check(length(trim(composer_version)) between 1 and 120),
  generated_at timestamptz,
  error_code text,
  retry_count integer not null default 0 check(retry_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(
    status <> 'GENERATED' or (
      prompt_vi is not null and length(prompt_vi) between 450 and 8000 and
      prompt_en is not null and length(prompt_en) between 450 and 8000 and
      generated_at is not null and error_code is null
    )
  ),
  check(status <> 'FAILED' or error_code is not null)
);
create index resource_easy_prompts_status_idx on public.resource_easy_prompts(status, updated_at desc);

create table public.resource_easy_prompt_runs (
  idempotency_key text primary key,
  payload_hash text not null check(payload_hash ~ '^[a-f0-9]{64}$'),
  imported_count integer not null check(imported_count > 0),
  created_at timestamptz not null default now()
);

alter table public.resource_easy_prompts enable row level security;
alter table public.resource_easy_prompt_runs enable row level security;
revoke all on public.resource_easy_prompts, public.resource_easy_prompt_runs from public, anon, authenticated;
grant select on public.resource_easy_prompts to anon, authenticated;
grant all on public.resource_easy_prompts, public.resource_easy_prompt_runs to service_role;
create policy easy_prompt_public_read on public.resource_easy_prompts for select to anon, authenticated
  using(status='GENERATED' and exists(
    select 1 from public.resources r where r.id=resource_id and r.status='PUBLISHED'
  ));
create policy easy_prompt_editor_read on public.resource_easy_prompts for select to authenticated
  using(exists(select 1 from public.editorial_members m where m.user_id=(select auth.uid())));

-- Source changes make the public prompt stale. It remains readable only after
-- an editor has reviewed and the service has regenerated it.
create or replace function public.mark_easy_prompt_stale()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if old.canonical_url is distinct from new.canonical_url
    or old.repository_url is distinct from new.repository_url
    or old.documentation_url is distinct from new.documentation_url
    or old.license is distinct from new.license
    or old.description is distinct from new.description
    or old.long_description is distinct from new.long_description
    or old.import_metadata is distinct from new.import_metadata then
    update public.resource_easy_prompts
      set status='STALE', updated_at=now(), error_code=null
      where resource_id=new.id and status='GENERATED';
  end if;
  return new;
end $$;
drop trigger if exists resource_easy_prompt_stale_trigger on public.resources;
create trigger resource_easy_prompt_stale_trigger
  after update of canonical_url,repository_url,documentation_url,license,description,long_description,import_metadata
  on public.resources for each row execute function public.mark_easy_prompt_stale();

-- The importer is service-only. It confirms each URL belongs to the resource
-- already in the catalog and never accepts browser-supplied publication state.
create or replace function public.sync_windi_easy_prompts(payload jsonb, run_key text, payload_hash text)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare item jsonb; target public.resources; previous_hash text; count_rows integer:=0;
begin
  if jsonb_typeof(payload)<>'array' or jsonb_array_length(payload) not between 1 and 250 then
    raise exception 'Expected 1-250 Easy Prompt records';
  end if;
  if run_key is null or length(run_key) not between 8 and 300 or payload_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid Easy Prompt run identity';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('windi-easy-prompt-sync',0));
  select r.payload_hash into previous_hash from public.resource_easy_prompt_runs r where r.idempotency_key=run_key;
  if previous_hash is not null then
    if previous_hash<>payload_hash then raise exception 'Idempotency key payload mismatch'; end if;
    return jsonb_build_object('status','already_imported','count',(select imported_count from public.resource_easy_prompt_runs where idempotency_key=run_key));
  end if;
  if (select count(distinct value->>'external_identity') from jsonb_array_elements(payload))<>jsonb_array_length(payload) then
    raise exception 'Duplicate Easy Prompt identity';
  end if;
  for item in select value from jsonb_array_elements(payload) loop
    if coalesce(item->>'external_identity','')='' or coalesce(item->>'source_url','') !~ '^https://'
      or coalesce(item->>'source_hash','') !~ '^[a-f0-9]{64}$'
      or coalesce(length(item->>'prompt_vi'),0) not between 450 and 8000
      or coalesce(length(item->>'prompt_en'),0) not between 450 and 8000
      or coalesce(item->>'composer_version','')='' then raise exception 'Invalid Easy Prompt payload'; end if;
    select * into target from public.resources where external_identity=item->>'external_identity' for update;
    if not found then raise exception 'Easy Prompt resource not found'; end if;
    if item->>'source_url' <> target.canonical_url then raise exception 'Easy Prompt source URL mismatch'; end if;
    if position(target.canonical_url in (item->>'prompt_vi'))=0 or position(target.canonical_url in (item->>'prompt_en'))=0 then
      raise exception 'Easy Prompt must cite canonical source';
    end if;
    insert into public.resource_easy_prompts(resource_id,status,prompt_vi,prompt_en,source_url,source_hash,composer_version,generated_at,error_code,retry_count,updated_at)
    values(target.id,'GENERATED',item->>'prompt_vi',item->>'prompt_en',item->>'source_url',item->>'source_hash',item->>'composer_version',now(),null,0,now())
    on conflict(resource_id) do update set
      status='GENERATED',prompt_vi=excluded.prompt_vi,prompt_en=excluded.prompt_en,source_url=excluded.source_url,
      source_hash=excluded.source_hash,composer_version=excluded.composer_version,generated_at=excluded.generated_at,
      error_code=null,retry_count=0,updated_at=now();
    count_rows:=count_rows+1;
  end loop;
  insert into public.resource_easy_prompt_runs(idempotency_key,payload_hash,imported_count) values(run_key,payload_hash,count_rows);
  return jsonb_build_object('status','imported','count',count_rows);
end $$;
revoke all on function public.sync_windi_easy_prompts(jsonb,text,text) from public,anon,authenticated;
grant execute on function public.sync_windi_easy_prompts(jsonb,text,text) to service_role;

-- Publishing stays one click for editors. Easy Prompt is an automatic
-- preparation gate, never a new checkbox or written-reason requirement.
create or replace function public.review_windi_resource(target_id uuid, actor uuid, expected_revision integer,
  next_state text, content jsonb, review_reason text, source_checked boolean, content_checked boolean)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare old_row public.resources; new_row public.resources; audit_reason text;
begin
  if not exists(select 1 from public.editorial_members where user_id=actor) then raise exception 'Editor access required' using errcode='42501'; end if;
  if next_state is null or next_state not in ('REVIEW','PUBLISHED','REJECTED','ARCHIVED') then raise exception 'Invalid editorial state'; end if;
  select * into old_row from public.resources where id=target_id for update;
  if not found then raise exception 'Resource not found'; end if;
  if expected_revision is null or old_row.editorial_revision<>expected_revision then raise exception 'Resource changed; reload before saving' using errcode='40001'; end if;
  if coalesce(length(trim(content->>'name')),0) not between 1 and 300
    or coalesce(length(content->>'description'),0)>12000 or coalesce(length(content->>'long_description'),0)>30000
    or coalesce(length(content->>'tagline'),0)>240 or coalesce(length(content->>'license'),0)>200 then raise exception 'Invalid editorial content'; end if;
  if next_state='PUBLISHED' and not exists(select 1 from public.resource_sources where resource_id=target_id) then
    raise exception 'Published resources need an imported source record';
  end if;
  if next_state='PUBLISHED' and not exists(select 1 from public.resource_easy_prompts where resource_id=target_id and status='GENERATED') then
    raise exception 'Easy Prompt is still being prepared';
  end if;
  audit_reason:=nullif(trim(coalesce(review_reason,'')), '');
  if audit_reason is null or length(audit_reason)<10 then
    audit_reason:=case next_state when 'PUBLISHED' then 'Editor xuất bản qua hàng duyệt nhanh.' when 'REJECTED' then 'Editor từ chối qua hàng duyệt nhanh.' when 'ARCHIVED' then 'Editor lưu trữ qua hàng duyệt nhanh.' else 'Editor cập nhật trạng thái hàng duyệt.' end;
  end if;
  update public.resources set name=trim(content->>'name'),tagline=trim(coalesce(content->>'tagline','')),description=trim(coalesce(content->>'description','')),
    long_description=trim(coalesce(content->>'long_description','')),license=trim(coalesce(content->>'license','')),status=next_state::public.resource_status,
    last_reviewed_at=now(),updated_at=now(),published_at=case when next_state='PUBLISHED' then coalesce(published_at,now()) else published_at end,
    editorial_revision=editorial_revision+1 where id=target_id returning * into new_row;
  insert into public.resource_editorial_actions(resource_id,actor_id,previous_status,next_status,reason,revision,before_content,after_content)
  values(target_id,actor,old_row.status,new_row.status,audit_reason,new_row.editorial_revision,
    jsonb_build_object('name',old_row.name,'tagline',old_row.tagline,'description',old_row.description,'long_description',old_row.long_description,'license',old_row.license),
    jsonb_build_object('name',new_row.name,'tagline',new_row.tagline,'description',new_row.description,'long_description',new_row.long_description,'license',new_row.license));
  return jsonb_build_object('id',target_id,'status',new_row.status,'revision',new_row.editorial_revision);
end $$;
revoke all on function public.review_windi_resource(uuid,uuid,integer,text,jsonb,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.review_windi_resource(uuid,uuid,integer,text,jsonb,text,boolean,boolean) to service_role;
notify pgrst,'reload schema';
commit;
