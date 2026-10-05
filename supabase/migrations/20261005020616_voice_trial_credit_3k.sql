begin;

-- Keep the 29,000 VND first-clone offer aligned for future orders and any
-- checkout that is still awaiting payment. Already-paid grants stay intact.
update public.windi_voice_plans
set credits = 3000
where id = 'trial';

update public.windi_voice_orders
set credits = 3000
where plan_id = 'trial'
  and status = 'pending';

commit;
