begin;

-- Apply the revised prices to new orders. Preserve quoted payment amounts
-- on existing orders and all credit allowances and paid periods.
update public.windi_voice_plans
set price_vnd = case id
  when 'starter' then 99000
  when 'creator' then 269000
  when 'studio' then 1169000
end
where id in ('starter','creator','studio');

commit;
