begin;

-- Change only current bundle prices. Orders retain their agreed amount and payment code.
do $$
declare affected integer;
begin
  update public.windi_voice_plans
  set price_vnd = case id
    when 'credit_10k' then 39000
    when 'credit_100k' then 139000
    when 'credit_1m' then 599000
  end
  where active and (
    (id = 'credit_10k' and price_vnd = 39000) or
    (id = 'credit_100k' and price_vnd in (169000, 139000)) or
    (id = 'credit_1m' and price_vnd in (699000, 599000))
  );
  get diagnostics affected = row_count;
  if affected <> 3 then
    raise exception 'Expected three active Voice Studio bundles with known prices, found %', affected;
  end if;
end $$;

commit;
