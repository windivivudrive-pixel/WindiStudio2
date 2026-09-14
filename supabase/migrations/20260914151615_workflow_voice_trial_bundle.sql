begin;

update public.products
set metadata=metadata || '{"voice_bonus_credits":0,"voice_trial_credits":10000,"voice_trial_clone_limit":1,"voice_trial_duration_days":14}'::jsonb
where metadata->>'sku'='windi-video-workflow-v1';

-- Existing owners keep every credit already granted. The new bundle applies
-- only when a new Workflow order is paid; no customer benefit is revoked.

create or replace function public.windi_video_kit_pay(p_code text,p_gateway text,p_amount integer,p_payload jsonb)
returns text language plpgsql security invoker set search_path='' as $$
declare target public.orders; item record; prior_status public.order_status; granted_entitlement uuid; trial_order_id uuid; trial_period_id uuid;
begin
 select o.status into prior_status from public.payment_events e left join public.orders o on o.id=e.order_id where e.gateway_id=p_gateway;
 if found then return case prior_status when 'PAID' then 'paid' when 'UNDERPAID' then 'underpaid' when 'OVERPAID' then 'overpaid' else 'review' end; end if;
 select * into target from public.orders where payment_code=p_code for update;
 if not found then return 'ignored'; end if;
 perform pg_advisory_xact_lock(871942001);
 if target.status='PAID' then return 'paid'; end if;
 insert into public.payment_events(gateway_id,order_id,amount,payload) values(p_gateway,target.id,p_amount,p_payload);
 if target.status<>'PENDING' or target.expires_at<=now() then update public.orders set status='REVIEW_REQUIRED' where id=target.id; return 'review'; end if;
 if p_amount<target.total_amount_vnd then update public.orders set status='UNDERPAID' where id=target.id; return 'underpaid'; end if;
 if p_amount>target.total_amount_vnd then update public.orders set status='OVERPAID' where id=target.id; return 'overpaid'; end if;
 update public.orders set status='PAID' where id=target.id;
 for item in select i.id,i.product_id,p.type from public.order_items i join public.products p on p.id=i.product_id where i.order_id=target.id loop
  if item.type='VIDEO_KIT_LICENSE' then
   insert into public.product_entitlements(user_id,product_id,order_item_id,kind,voice_credits)
   values(target.user_id,item.product_id,item.id,'video_workflow_v1',0)
   on conflict(user_id,product_id) do update set updated_at=now() returning id into granted_entitlement;
   insert into public.windi_voice_orders(user_id,plan_id,amount_vnd,credits,clone_limit,duration_days,status,gateway_id,expires_at,paid_at)
   values(target.user_id,'trial',0,10000,1,14,'paid','workflow:'||granted_entitlement::text,now(),now())
   on conflict(gateway_id) do update set gateway_id=excluded.gateway_id returning id into trial_order_id;
   insert into public.windi_voice_periods(user_id,order_id,plan_id,starts_at,ends_at,credits,clone_limit)
   values(target.user_id,trial_order_id,'trial',now(),now()+interval '14 days',10000,1)
   on conflict(order_id) do nothing returning id into trial_period_id;
   if trial_period_id is not null then insert into public.windi_voice_ledger(user_id,period_id,kind,amount) values(target.user_id,trial_period_id,'grant',10000); end if;
  end if;
 end loop;
 delete from public.video_kit_reservations where order_id=target.id;
 return 'paid';
end $$;

revoke all on function public.windi_video_kit_pay(text,text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.windi_video_kit_pay(text,text,integer,jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
