-- Set one fixed workflow price and remove the former first-100 launch discount.
update public.products
set price_vnd = 219000,
    metadata = metadata - 'launch_price_vnd' - 'launch_limit'
where metadata->>'sku' = 'windi-video-workflow-v1';
