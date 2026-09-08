import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sepay-api-key',
};

Deno.serve(async (req) => {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Verify Environment Variable
        const SEPAY_API_KEY = Deno.env.get('SEPAY_API_KEY') || Deno.env.get('VITE_SEPAY_API_KEY');
        if (!SEPAY_API_KEY) {
            console.error("Missing SEPAY_API_KEY environment variable.");
            return new Response(JSON.stringify({ error: "Server misconfiguration." }), { status: 500, headers: corsHeaders });
        }

        // 2. Extract API Key from Header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Apikey ')) {
            console.error("Missing or invalid Authorization header format.");
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const incomingApiKey = authHeader.split('Apikey ')[1].trim();
        if (incomingApiKey !== SEPAY_API_KEY) {
            console.error("Invalid SePay API Key. Possible spoofing attempt.");
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabaseClient = createClient(
            Deno.env.get('VITE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const body = await req.json();
        console.log("Received SePay Webhook:", JSON.stringify(body));

        const { transferAmount, content, id: gateway_id } = body;

        if (!transferAmount || !content || !gateway_id) {
            throw new Error("Missing required fields from SePay webhook");
        }

        // 3. Extract Order Code from Content
        // Format WINDI + space + 8 alphanumeric characters (also backward compatible with WST and CF)
        const windiMatch = content.match(/WINDI\s*([A-Z0-9]{8})/i);
        const wstMatch = content.match(/WST\s*([A-Z0-9]{8})/i);
        const cfMatch = content.match(/CF[A-Z0-9]{6,12}/i);

        let paymentCode = '';
        if (windiMatch) {
            paymentCode = `WINDI ${windiMatch[1].toUpperCase()}`;
        } else if (wstMatch) {
            paymentCode = `WST ${wstMatch[1].toUpperCase()}`;
        } else if (cfMatch) {
            paymentCode = cfMatch[0].toUpperCase();
        } else {
            console.log("No valid order code found in content:", content);
            // Return 200 to acknowledge SePay so it doesn't retry
            return new Response(
                JSON.stringify({ message: "No order code found, ignored." }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log("Extracted Payment Code:", paymentCode);

        // 4. Find Order by payment_code
        let { data: order, error: orderError } = await supabaseClient
            .from('orders')
            .select('id')
            .eq('payment_code', paymentCode)
            .maybeSingle();

        // If not found and it's WINDI or WST code, try alternative spacing/prefix formats
        if (!order && (windiMatch || wstMatch)) {
            const rawSuffix = (windiMatch || wstMatch)![1].toUpperCase();
            const candidates = [
                `WINDI ${rawSuffix}`,
                `WINDI${rawSuffix}`,
                `WST ${rawSuffix}`,
                `WST${rawSuffix}`,
            ];
            for (const cand of candidates) {
                if (cand === paymentCode) continue;
                const res = await supabaseClient
                    .from('orders')
                    .select('id')
                    .eq('payment_code', cand)
                    .maybeSingle();
                if (res.data) {
                    order = res.data;
                    break;
                }
            }
        }

        if (orderError || !order) {
            console.error("Order not found for code:", paymentCode, orderError);
            return new Response(
                JSON.stringify({ message: "Order not found." }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 5. Execute Atomic RPC to process the order and grant items
        const { data: rpcResult, error: rpcError } = await supabaseClient.rpc('process_paid_order', {
            p_order_id: order.id,
            p_gateway_id: String(gateway_id),
            p_amount: transferAmount,
            p_payload: body
        });

        if (rpcError) {
            console.error("RPC Error processing order:", rpcError);
            // Return 500 so SePay retries
            return new Response(
                JSON.stringify({ error: "Failed to process order" }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`Successfully processed payment for order ${order.id}`);

        return new Response(
            JSON.stringify({ success: true, message: `Processed payment.` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error("Webhook Error:", error);
        return new Response(
            JSON.stringify({ error: "Internal Server Error" }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});