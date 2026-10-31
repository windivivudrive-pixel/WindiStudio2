begin;
do $$
declare affected integer;
begin
  update public.windi_voice_plans
  set price_vnd = case id when 'credit_10k' then 29000 when 'credit_100k' then 99000 end
  where active and ((id = 'credit_10k' and price_vnd in (39000, 29000)) or (id = 'credit_100k' and price_vnd in (139000, 99000)));
  get diagnostics affected = row_count;
  if affected <> 2 then raise exception 'Expected two active voice bundles at known prices, found %', affected; end if;
end $$;
commit;
