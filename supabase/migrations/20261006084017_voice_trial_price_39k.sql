begin;
-- Apply the new price to new orders; preserve historical orders and allowances.
update public.windi_voice_plans set price_vnd=39000 where id='trial';
notify pgrst,'reload schema';
commit;
