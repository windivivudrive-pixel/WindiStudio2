begin;

-- Publishing is a quick editorial decision. The queue already contains
-- source-backed candidates; an editor does not need to repeat manual checkboxes
-- or meet arbitrary prose/licence-length gates just to make a useful repository public.
-- We retain identity, optimistic locking, audit history and the automatic
-- source-record integrity check.
create or replace function public.review_windi_resource(target_id uuid, actor uuid, expected_revision integer,
  next_state text, content jsonb, review_reason text, source_checked boolean, content_checked boolean)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare old_row public.resources; new_row public.resources; audit_reason text;
begin
  if not exists(select 1 from public.editorial_members where user_id=actor) then
    raise exception 'Editor access required' using errcode='42501';
  end if;
  if next_state is null or next_state not in ('REVIEW','PUBLISHED','REJECTED','ARCHIVED') then
    raise exception 'Invalid editorial state';
  end if;

  select * into old_row from public.resources where id=target_id for update;
  if not found then raise exception 'Resource not found'; end if;
  if expected_revision is null or old_row.editorial_revision<>expected_revision then
    raise exception 'Resource changed; reload before saving' using errcode='40001';
  end if;
  if coalesce(length(trim(content->>'name')),0) not between 1 and 300
    or coalesce(length(content->>'description'),0)>12000
    or coalesce(length(content->>'long_description'),0)>30000
    or coalesce(length(content->>'tagline'),0)>240
    or coalesce(length(content->>'license'),0)>200 then
    raise exception 'Invalid editorial content';
  end if;

  -- This is an importer integrity check, not a checkbox the editor has to tick.
  if next_state='PUBLISHED' and not exists(select 1 from public.resource_sources where resource_id=target_id) then
    raise exception 'Published resources need an imported source record';
  end if;

  audit_reason:=nullif(trim(coalesce(review_reason,'')), '');
  if audit_reason is null or length(audit_reason)<10 then
    audit_reason:=case next_state
      when 'PUBLISHED' then 'Editor xuất bản qua hàng duyệt nhanh.'
      when 'REJECTED' then 'Editor từ chối qua hàng duyệt nhanh.'
      when 'ARCHIVED' then 'Editor lưu trữ qua hàng duyệt nhanh.'
      else 'Editor cập nhật trạng thái hàng duyệt.'
    end;
  end if;

  update public.resources set
    name=trim(content->>'name'),
    tagline=trim(coalesce(content->>'tagline','')),
    description=trim(coalesce(content->>'description','')),
    long_description=trim(coalesce(content->>'long_description','')),
    license=trim(coalesce(content->>'license','')),
    status=next_state::public.resource_status,
    last_reviewed_at=now(),
    updated_at=now(),
    published_at=case when next_state='PUBLISHED' then coalesce(published_at,now()) else published_at end,
    editorial_revision=editorial_revision+1
  where id=target_id
  returning * into new_row;

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
