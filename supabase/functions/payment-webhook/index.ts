

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Parse SePay Webhook Data
        const payload = await req.json()
        console.log("Received SePay webhook:", payload)

        // SePay payload structure:
        // {
        //   "gateway": "MBBank",
        //   "transactionDate": "...",
        //   "accountNumber": "...",
        //   "content": "WINDI USER12345",
        //   "transferType": "in",
        //   "transferAmount": 50000,
        //   ...
        // }

        const content = payload.content || payload.description || ""
        const amount = payload.transferAmount || payload.amount || 0

        // 2. Extract Payment Code
        // Regex to find "WINDI USER12345"
        const match = content.match(/WINDI\s*(USER\d+)/i)

        if (!match) {
            return new Response(JSON.stringify({ error: "No valid payment code found" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        const paymentCode = match[1].toUpperCase()
        console.log("Found payment code:", paymentCode)

        // 3. Initialize Supabase Admin Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // 4. Find User by Payment Code
        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id, credits, full_name')
            .eq('payment_code', paymentCode)
            .single()

        if (profileError || !userProfile) {
            console.error("User not found:", profileError)
            return new Response(JSON.stringify({ error: "User not found" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
            })
        }

        // 5. Calculate Credits (1 XU = 5000 VND)
        const creditsToAdd = Math.floor(amount / 5000)

        if (creditsToAdd <= 0) {
            return new Response(JSON.stringify({ message: "Amount too small" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // 6. Update User Credits
        const newBalance = (userProfile.credits || 0) + creditsToAdd
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ credits: newBalance })
            .eq('id', userProfile.id)

        if (updateError) {
            throw updateError
        }

        // 7. Record Transaction
        await supabase
            .from('transactions')
            .insert({
                user_id: userProfile.id,
                amount_vnd: amount,
                credits_added: creditsToAdd,
                type: 'DEPOSIT',
                content: content,
                status: 'SUCCESS'
            })

        console.log(`Success: Added ${creditsToAdd} credits to ${userProfile.full_name}`)

        return new Response(JSON.stringify({ success: true, credits_added: creditsToAdd }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error("Webhook error:", error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
