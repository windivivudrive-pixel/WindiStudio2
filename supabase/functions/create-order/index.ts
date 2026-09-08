import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generatePaymentCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'CF';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('VITE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Get the JWT from the Authorization header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
        }
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
        
        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
        }

        const body = await req.json();
        const { productIds } = body; // Array of product UUIDs

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return new Response(JSON.stringify({ error: 'Missing productIds' }), { status: 400, headers: corsHeaders });
        }

        // Fetch products to calculate total price
        const { data: products, error: productError } = await supabaseClient
            .from('products')
            .select('*')
            .in('id', productIds)
            .eq('is_active', true);

        if (productError || !products || products.length !== productIds.length) {
            return new Response(JSON.stringify({ error: 'Invalid or inactive products' }), { status: 400, headers: corsHeaders });
        }

        let totalAmount = 0;
        for (const p of products) {
            totalAmount += p.price_vnd;
        }

        // Generate unique payment code
        let paymentCode = '';
        let isUnique = false;
        while (!isUnique) {
            paymentCode = generatePaymentCode();
            const { data } = await supabaseClient.from('orders').select('id').eq('payment_code', paymentCode).single();
            if (!data) isUnique = true;
        }

        // Calculate expiry (e.g., 24 hours from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Create order
        const { data: order, error: orderError } = await supabaseClient
            .from('orders')
            .insert({
                user_id: user.id,
                total_amount_vnd: totalAmount,
                payment_code: paymentCode,
                expires_at: expiresAt.toISOString(),
                status: 'PENDING'
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // Create order items
        const orderItems = products.map(p => ({
            order_id: order.id,
            product_id: p.id,
            quantity: 1, // Simplify for now: 1 quantity per product ID sent
            price_vnd: p.price_vnd
        }));

        const { error: itemsError } = await supabaseClient.from('order_items').insert(orderItems);
        if (itemsError) throw itemsError;

        return new Response(
            JSON.stringify({ 
                success: true, 
                order: {
                    id: order.id,
                    total_amount_vnd: order.total_amount_vnd,
                    payment_code: order.payment_code,
                    expires_at: order.expires_at,
                    status: order.status
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error("Create Order Error:", error);
        return new Response(
            JSON.stringify({ error: "Internal Server Error" }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
