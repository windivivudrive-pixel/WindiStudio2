-- Keep the existing first-100 offer and release gate; preserve existing orders.
update public.products set price_vnd=369000, metadata=metadata || '{"launch_price_vnd":89000}'::jsonb where metadata->>'sku'='windi-video-workflow-v1';

create or replace function public.windi_video_kit_order(p_user uuid)
returns public.orders language plpgsql security invoker set search_path='' as $$
declare product public.products; current_order public.orders; item_count integer; launch_slot integer; charge integer;
begin
  perform pg_advisory_xact_lock(871942001);
  select * into product from public.products where metadata->>'sku'='windi-video-workflow-v1' limit 1;
  if not found or not product.is_active or coalesce((product.metadata->>'release_ready')::boolean,false)=false then raise exception 'VIDEO_KIT_NOT_RELEASED'; end if;
  if exists(select 1 from public.product_entitlements where user_id=p_user and product_id=product.id and status='active') then raise exception 'VIDEO_KIT_ALREADY_OWNED'; end if;
  update public.orders o set status='EXPIRED' where o.status='PENDING' and o.expires_at<=now();
  delete from public.video_kit_reservations where expires_at<=now();
  select o.* into current_order from public.orders o join public.order_items i on i.order_id=o.id where o.user_id=p_user and o.status='PENDING' and i.product_id=product.id order by o.created_at desc limit 1;
  if found then return current_order; end if;
  select count(*) into item_count from public.product_entitlements where product_id=product.id;
  item_count:=item_count+(select count(*) from public.video_kit_reservations where expires_at>now());
  if item_count<100 then
    select candidate into launch_slot from generate_series(1,100) candidate
    where not exists(select 1 from public.video_kit_reservations r where r.slot_number=candidate and r.expires_at>now())
      and candidate>(select count(*) from public.product_entitlements where product_id=product.id)
    order by candidate limit 1;
    if launch_slot is null then charge:=product.price_vnd;else charge:=coalesce((product.metadata->>'launch_price_vnd')::integer,product.price_vnd);end if;
  else launch_slot:=null;charge:=product.price_vnd;end if;
  insert into public.orders(user_id,total_amount_vnd,status,payment_code,created_at,expires_at)
  values(p_user,charge,'PENDING','WINDI K'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),now(),now()+interval '10 minutes') returning * into current_order;
  insert into public.order_items(order_id,product_id,quantity,price_vnd) values(current_order.id,product.id,1,charge);
  if launch_slot is not null then insert into public.video_kit_reservations(order_id,user_id,slot_number,expires_at) values(current_order.id,p_user,launch_slot,current_order.expires_at);end if;
  return current_order;
end $$;
