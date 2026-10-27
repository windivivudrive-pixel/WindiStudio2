begin;

update public.windi_voice_plans
set clone_limit = case id
  when 'credit_100k' then 2
  when 'credit_1m' then 5
end
where id in ('credit_100k','credit_1m');

-- Orders awaiting payment should carry the same entitlements shown in the catalog.
update public.windi_voice_orders
set clone_limit = case plan_id
  when 'credit_100k' then 2
  when 'credit_1m' then 5
end
where status='pending'
  and plan_id in ('credit_100k','credit_1m');

notify pgrst, 'reload schema';
commit;
