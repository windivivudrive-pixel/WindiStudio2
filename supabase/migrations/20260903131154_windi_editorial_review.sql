begin;
-- Separate editorial permissions from the legacy user-editable profile.
create table public.editorial_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check(role in ('admin','editor')),
  created_at timestamptz not null default now()
);
-- Membership is provisioned separately from a verified Auth identity.
-- Never bootstrap privileges from a legacy user-editable profile column.
alter table public.editorial_members enable row level security;
revoke all on public.editorial_members from public,anon,authenticated;
grant select on public.editorial_members to authenticated;
grant all on public.editorial_members to service_role;
create policy own_editorial_membership on public.editorial_members for select to authenticated using(user_id=(select auth.uid()));

alter table public.resources add column editorial_revision integer not null default 0;
create table public.resource_editorial_actions (
  id bigint generated always as identity primary key,
  resource_id uuid not null references public.resources(id),
  actor_id uuid not null references auth.users(id),
  previous_status public.resource_status not null,
  next_status public.resource_status not null,
  reason text not null check(length(trim(reason))>=10),
  revision integer not null,
  before_content jsonb not null,
  after_content jsonb not null,
  created_at timestamptz not null default now()
);
create index editorial_actions_resource_idx on public.resource_editorial_actions(resource_id,created_at desc);
create index editorial_actions_actor_idx on public.resource_editorial_actions(actor_id);
alter table public.resource_editorial_actions enable row level security;
revoke all on public.resource_editorial_actions from public,anon,authenticated,service_role;
grant select on public.resource_editorial_actions to authenticated;
grant select,insert on public.resource_editorial_actions to service_role;
grant usage,select on sequence public.resource_editorial_actions_id_seq to service_role;
create policy editor_audit_read on public.resource_editorial_actions for select to authenticated
using(exists(select 1 from public.editorial_members where user_id=(select auth.uid())));
create policy editor_candidate_read on public.resources for select to authenticated
using(exists(select 1 from public.editorial_members where user_id=(select auth.uid())));
create policy editor_sources_read on public.resource_sources for select to authenticated
using(exists(select 1 from public.editorial_members where user_id=(select auth.uid())));

create function public.review_windi_resource(target_id uuid, actor uuid, expected_revision integer,
  next_state text, content jsonb, review_reason text, source_checked boolean, content_checked boolean)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare old_row public.resources; new_row public.resources;
begin
  if not exists(select 1 from public.editorial_members where user_id=actor) then raise exception 'Editor access required' using errcode='42501'; end if;
  if next_state is null or next_state not in ('REVIEW','PUBLISHED','REJECTED','ARCHIVED') then raise exception 'Invalid editorial state'; end if;
  if coalesce(length(trim(review_reason)),0)<10 then raise exception 'A review reason is required'; end if;
  select * into old_row from public.resources where id=target_id for update;
  if not found then raise exception 'Resource not found'; end if;
  if expected_revision is null or old_row.editorial_revision<>expected_revision then raise exception 'Resource changed; reload before saving' using errcode='40001'; end if;
  if coalesce(length(trim(content->>'name')),0) not between 1 and 300
    or coalesce(length(content->>'description'),0)>12000 or coalesce(length(content->>'long_description'),0)>30000
    or coalesce(length(content->>'tagline'),0)>240 or coalesce(length(content->>'license'),0)>200
    then raise exception 'Invalid editorial content'; end if;
  if next_state='PUBLISHED' then
    if source_checked is not true or content_checked is not true
      or coalesce(length(trim(content->>'description')),0)<80
      or coalesce(length(trim(content->>'long_description')),0)<80
      or coalesce(length(trim(content->>'tagline')),0)<10
      or coalesce(length(trim(content->>'license')),0)<2
      or not exists(select 1 from public.resource_sources where resource_id=target_id)
      then raise exception 'Verify source, description, usage and license before publishing'; end if;
  end if;
  update public.resources set name=trim(content->>'name'),tagline=trim(content->>'tagline'),
    description=trim(content->>'description'),long_description=trim(content->>'long_description'),license=trim(content->>'license'),
    status=next_state::public.resource_status,last_reviewed_at=now(),updated_at=now(),
    published_at=case when next_state='PUBLISHED' then coalesce(published_at,now()) else published_at end,
    editorial_revision=editorial_revision+1 where id=target_id returning * into new_row;
  insert into public.resource_editorial_actions(resource_id,actor_id,previous_status,next_status,reason,revision,before_content,after_content)
    values(target_id,actor,old_row.status,new_row.status,trim(review_reason),new_row.editorial_revision,
      jsonb_build_object('name',old_row.name,'tagline',old_row.tagline,'description',old_row.description,'long_description',old_row.long_description,'license',old_row.license),
      jsonb_build_object('name',new_row.name,'tagline',new_row.tagline,'description',new_row.description,'long_description',new_row.long_description,'license',new_row.license));
  return jsonb_build_object('id',target_id,'status',new_row.status,'revision',new_row.editorial_revision);
end $$;
revoke all on function public.review_windi_resource(uuid,uuid,integer,text,jsonb,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.review_windi_resource(uuid,uuid,integer,text,jsonb,text,boolean,boolean) to service_role;
notify pgrst,'reload schema';
commit;
