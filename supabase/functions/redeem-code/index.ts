import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const body = await req.json()
        const { code, userId, deviceId, localToken } = body

        if (!code || !userId) {
            return new Response(
                JSON.stringify({ success: false, message: 'Missing code or userId' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Extract IP address from request headers
        // Priority: cf-connecting-ip (Cloudflare) > x-real-ip > x-forwarded-for > connection remote address
        let ipAddress = req.headers.get('cf-connecting-ip')
            || req.headers.get('x-real-ip')
            || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || 'unknown'

        console.log('Redeem request:', {
            code: code.toUpperCase(),
            userId,
            deviceId: deviceId ? `${deviceId.substring(0, 8)}...` : 'none',
            localToken: localToken ? `${localToken.substring(0, 8)}...` : 'none',
            ipAddress
        })

        // Call the SQL function with all 4 identifiers
        const { data, error } = await supabaseClient.rpc('redeem_promo_code', {
            code_input: code,
            user_id_input: userId,
            device_id_input: deviceId || null,
            local_token_input: localToken || null,
            ip_address_input: ipAddress
        })

        if (error) {
            console.error('RPC Error:', error)
            return new Response(
                JSON.stringify({ success: false, message: `System Error: ${error.message}` }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log('Redeem result:', data)

        return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (err) {
        console.error('Unexpected error:', err)
        return new Response(
            JSON.stringify({ success: false, message: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
