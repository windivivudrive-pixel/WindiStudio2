-- RPC to atomically process a paid order

CREATE OR REPLACE FUNCTION process_paid_order(p_order_id UUID, p_gateway_id TEXT, p_amount INTEGER, p_payload JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
BEGIN
    -- 1. Check if payment_event already exists to prevent replay
    IF EXISTS (SELECT 1 FROM public.payment_events WHERE gateway_id = p_gateway_id) THEN
        RETURN TRUE; -- Already processed, idempotent return
    END IF;

    -- 2. Lock the order row
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    -- 3. Check status
    IF v_order.status != 'PENDING' THEN
        -- Might be already processed or expired. Still record the event but mark review required if it's unexpected.
        INSERT INTO public.payment_events (gateway_id, order_id, amount, payload)
        VALUES (p_gateway_id, p_order_id, p_amount, p_payload);
        
        IF v_order.status = 'EXPIRED' THEN
            UPDATE public.orders SET status = 'REVIEW_REQUIRED' WHERE id = p_order_id;
        END IF;
        
        RETURN TRUE;
    END IF;

    -- 4. Check amount
    IF p_amount < v_order.total_amount_vnd THEN
        UPDATE public.orders SET status = 'UNDERPAID' WHERE id = p_order_id;
    ELSIF p_amount > v_order.total_amount_vnd THEN
        UPDATE public.orders SET status = 'OVERPAID' WHERE id = p_order_id;
    ELSE
        UPDATE public.orders SET status = 'PAID' WHERE id = p_order_id;
    END IF;

    -- Record event
    INSERT INTO public.payment_events (gateway_id, order_id, amount, payload)
    VALUES (p_gateway_id, p_order_id, p_amount, p_payload);

    -- 5. If fully paid, grant entitlements
    IF p_amount = v_order.total_amount_vnd THEN
        FOR v_item IN (SELECT oi.id, oi.product_id, p.type, p.metadata, oi.quantity 
                       FROM public.order_items oi 
                       JOIN public.products p ON oi.product_id = p.id 
                       WHERE oi.order_id = p_order_id)
        LOOP
            IF v_item.type = 'STUDIO_LICENSE' THEN
                -- Grant license (one per quantity)
                FOR i IN 1..v_item.quantity LOOP
                    INSERT INTO public.creatorflow_licenses (user_id, order_item_id, status)
                    VALUES (v_order.user_id, v_item.id, 'ACTIVE');
                END LOOP;
            ELSIF v_item.type = 'VOICE_UNITS' THEN
                -- Grant voice units based on metadata
                IF v_item.metadata ? 'voice_units' THEN
                    INSERT INTO public.voice_ledger (user_id, order_item_id, type, amount, description)
                    VALUES (
                        v_order.user_id, 
                        v_item.id, 
                        'GRANT', 
                        (v_item.metadata->>'voice_units')::BIGINT * v_item.quantity,
                        'Purchased Voice Units'
                    );
                END IF;
            END IF;
        END LOOP;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
