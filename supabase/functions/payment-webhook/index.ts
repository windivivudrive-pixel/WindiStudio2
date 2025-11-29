import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sepay-api-key', // Thêm header của SePay vào đây để tránh lỗi CORS
};

// Lấy API Key bí mật từ biến môi trường

Deno.serve(async (req) => {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // --- BẮT ĐẦU PHẦN XÁC THỰC BỔ SUNG ---

        // 1. Kiểm tra xem biến môi trường đã được cài đặt chưa
        if (!Deno.env.get('VITE_SEPAY_API_KEY')) {
            console.error("Missing SEPAY_API_KEY environment variable.");
            throw new Error("Server misconfiguration.");
        }

        // 2. Lấy API Key từ Header của request
        // SePay gửi header: "Authorization": "Apikey API_KEY_CUA_BAN"
        const authHeader = req.headers.get('Authorization');

        // 3. So sánh
        if (!authHeader || !authHeader.startsWith('Apikey ')) {
            console.error("Missing or invalid Authorization header format.");
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const incomingApiKey = authHeader.split('Apikey ')[1].trim();

        if (incomingApiKey !== Deno.env.get('VITE_SEPAY_API_KEY')) {
            console.error("Invalid SePay API Key. Possible spoofing attempt.");
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log("SePay API Key verified.");
        // --- KẾT THÚC PHẦN XÁC THỰC BỔ SUNG ---


        const supabaseClient = createClient(
            Deno.env.get('VITE_SUPABASE_URL') ?? '',
            Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const body = await req.json();
        console.log("Received SePay Webhook:", body);

        const { transferAmount, content, gateway, transactionDate, referenceCode } = body;

        if (!transferAmount || !content) {
            throw new Error("Missing transferAmount or content");
        }

        // 1. Extract Payment Code from Content
        // Simple regex to find the code after "WINDI"
        // Content format: "WINDI USER12345"
        // We want to capture "USER12345"

        const match = content.match(/WINDI\s*([a-zA-Z0-9]{5,11})/i);

        if (!match) {
            console.log("No valid payment code found in content:", content);
            return new Response(
                JSON.stringify({ message: "No payment code found, ignored." }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const paymentCode = match[1].toUpperCase();
        console.log("Extracted Payment Code:", paymentCode);

        // 2. Find User by Payment Code
        const { data: userProfile, error: userError } = await supabaseClient
            .from('profiles')
            .select('id, credits, email')
            .eq('payment_code', paymentCode)
            .single();

        if (userError || !userProfile) {
            console.error("User not found for code:", paymentCode, userError);
            // Trả về 200 OK để SePay không gửi lại.
            return new Response(
                JSON.stringify({ message: "User not found." }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 3. Calculate Credits (1000 VND = 1 Xu)
        const creditsToAdd = Math.floor(transferAmount / 1000);

        if (creditsToAdd <= 0) {
            return new Response(
                JSON.stringify({ message: "Amount too small to convert." }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 4. Update User Credits
        const newBalance = (userProfile.credits || 0) + creditsToAdd;

        const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({ credits: newBalance })
            .eq('id', userProfile.id);

        if (updateError) {
            throw new Error(`Failed to update credits: ${updateError.message}`);
        }

        // 5. Record Transaction
        // Check for existing PENDING transaction to update
        const { data: pendingTx } = await supabaseClient
            .from('transactions')
            .select('id')
            .eq('user_id', userProfile.id)
            .eq('amount_vnd', transferAmount)
            .eq('status', 'PENDING')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        let txError;

        if (pendingTx) {
            console.log("Found pending transaction, updating:", pendingTx.id);
            const { error } = await supabaseClient
                .from('transactions')
                .update({
                    status: 'SUCCESS',
                    content: content,
                    gateway_id: String(body.id),
                    credits_added: creditsToAdd // Ensure credits are recorded
                })
                .eq('id', pendingTx.id);
            txError = error;
        } else {
            console.log("No pending transaction found, creating new one.");
            const { error } = await supabaseClient
                .from('transactions')
                .insert({
                    user_id: userProfile.id,
                    amount_vnd: transferAmount,
                    credits_added: creditsToAdd,
                    type: 'DEPOSIT',
                    content: content,
                    status: 'SUCCESS',
                    gateway_id: String(body.id),
                    created_at: new Date().toISOString()
                });
            txError = error;
        }

        if (txError) {
            console.error("Failed to record transaction:", txError);
        }

        console.log(`Successfully added ${creditsToAdd} credits to user ${userProfile.email}`);

        return new Response(
            JSON.stringify({ success: true, message: `Added ${creditsToAdd} credits.` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error("Webhook Error:", error);
        // Với các lỗi server thực sự, trả về 500 để SePay có thể thử lại sau (nếu họ có cơ chế đó).

    }
});