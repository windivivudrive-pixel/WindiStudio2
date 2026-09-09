alter table public.windi_voice_clones add column accent text;

drop function public.windi_voice_clone_reserve(uuid,uuid,text,text);

create function public.windi_voice_clone_reserve(p_user uuid,p_key uuid,p_name text,p_language text,p_accent text default null) returns public.windi_voice_clones
language plpgsql security invoker set search_path = '' as $$
declare active_period public.windi_voice_periods; clone_row public.windi_voice_clones;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,73));
 select * into clone_row from public.windi_voice_clones where user_id=p_user and request_key=p_key;
 if found then return clone_row; end if;
 select * into active_period from public.windi_voice_periods where user_id=p_user and starts_at<=now() and ends_at>now() order by ends_at desc limit 1 for update;
 if not found then raise exception 'NO_SUBSCRIPTION'; end if;
 if active_period.plan_id='welcome' then raise exception 'CLONE_REQUIRES_TRIAL'; end if;
 if active_period.clones_used>=active_period.clone_limit or (select count(*) from public.windi_voice_clones where user_id=p_user and status in ('ready','reserved','pending'))>=active_period.clone_limit then raise exception 'CLONE_LIMIT'; end if;
 if exists(select 1 from public.windi_voice_clones where user_id=p_user and status in ('reserved','pending')) then raise exception 'REQUEST_PENDING'; end if;
 update public.windi_voice_periods set clones_used=clones_used+1 where id=active_period.id;
 insert into public.windi_voice_clones(user_id,period_id,request_key,name,language,accent) values(p_user,active_period.id,p_key,p_name,p_language,p_accent) returning * into clone_row;
 return clone_row;
end $$;

revoke all on function public.windi_voice_clone_reserve(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.windi_voice_clone_reserve(uuid,uuid,text,text,text) to service_role;

notify pgrst, 'reload schema';
