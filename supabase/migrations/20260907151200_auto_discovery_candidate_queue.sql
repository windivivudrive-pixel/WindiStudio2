begin;

-- `CANDIDATE` is the product's pending-editorial state. `REVIEW` means an
-- editor has already opened the item, so auto-discovered rows must not start
-- there.
update public.resources
set status = 'CANDIDATE'
where status = 'REVIEW'
  and import_metadata ? 'autoDiscovery';

-- Keep the existing validated import function and change only its initial
-- editorial lifecycle value. The prior migration always creates this function
-- before this correction is applied.
do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.import_windi_repo_discovery(jsonb,jsonb,text,text)'::regprocedure)
    into definition;
  definition := replace(definition, '''REVIEW''', '''CANDIDATE''');
  execute definition;
end;
$$;

commit;
