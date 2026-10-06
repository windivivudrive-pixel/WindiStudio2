begin;

-- A stale editorial revision is an application conflict, not a transient
-- serialization failure. PostgREST 14 retries SQLSTATE 40001 indefinitely.
-- Patch the existing definition so all current publication checks survive.
do $migration$
declare
  definition text;
  old_raise text := '''Resource changed; reload before saving'' using errcode=''40001''';
  new_raise text := '''Resource changed; reload before saving'' using errcode=''PT409''';
begin
  select pg_get_functiondef('public.review_windi_resource(uuid,uuid,integer,text,jsonb,text,boolean,boolean)'::regprocedure)
    into definition;
  if position(old_raise in definition)>0 then
    execute replace(definition,old_raise,new_raise);
  elsif position(new_raise in definition)=0 then
    raise exception 'Editorial conflict guard did not match the expected function definition';
  end if;
end $migration$;

notify pgrst,'reload schema';
commit;
