begin;

-- This table is deliberately service-only. The explicit policy documents that
-- no end-user role can read or write sync idempotency records while satisfying
-- the RLS policy audit for an exposed-schema table.
create policy easy_prompt_runs_service_only on public.resource_easy_prompt_runs
  for all to service_role using (true) with check (true);

commit;
