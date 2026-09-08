import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Abstracted Voice Provider Interface
interface TTSRequest {
    voiceId: string;
    text: string;
    language?: string;
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
        const { voiceId, text, language = 'vi' }: TTSRequest = body;

        if (!voiceId || !text) {
            return new Response(JSON.stringify({ error: 'Missing voiceId or text' }), { status: 400, headers: corsHeaders });
        }

        // 1. Calculate Estimated Cost (e.g., 10 units per character for estimation)
        const estimatedCost = text.length * 10; 
        
        // 2. Check Balance and Reserve Quota
        // We do this by calling an RPC or doing it safely. Since ledger trigger handles balance check, we can just insert RESERVE.
        const { data: reserveLog, error: reserveError } = await supabaseClient
            .from('voice_ledger')
            .insert({
                user_id: user.id,
                type: 'RESERVE',
                amount: -estimatedCost, // Negative for reserve
                description: `Reserve for TTS request (${text.length} chars)`,
            })
            .select()
            .single();

        if (reserveError) {
            console.error("Reserve Error:", reserveError);
            return new Response(JSON.stringify({ error: 'Insufficient Voice Units or Server Error' }), { status: 402, headers: corsHeaders });
        }

        // 3. Call actual Cartesia / Provider API
        const CARTESIA_API_KEY = Deno.env.get('CARTESIA_API_KEY');
        let audioUrl = '';
        
        try {
            if (!CARTESIA_API_KEY) {
                throw new Error("Voice service provider not configured");
            }
            // Mock cartesia call
            console.log(`Calling Cartesia for voice ${voiceId} and text len ${text.length}`);
            
            // This would be replaced with actual Cartesia HTTP request
            // const cartesiaRes = await fetch('https://api.cartesia.ai/tts/bytes', { ... })
            // if (!cartesiaRes.ok) throw new Error('Provider failed');
            // const audioBytes = await cartesiaRes.arrayBuffer();
            // Then upload to R2/Supabase Storage...
            
            // Mock successful generation
            await new Promise(r => setTimeout(r, 1000));
            audioUrl = 'https://example.com/mock-audio.mp3'; // Mock URL
            
        } catch (providerError: any) {
            console.error("Provider Error:", providerError);
            // 4a. On Failure: Release Quota
            await supabaseClient
                .from('voice_ledger')
                .insert({
                    user_id: user.id,
                    type: 'RELEASE',
                    amount: estimatedCost, // Positive to refund
                    reference_id: reserveLog.id,
                    description: `Refund for failed TTS request`,
                });

            return new Response(JSON.stringify({ error: 'Voice generation failed', details: providerError.message }), { status: 500, headers: corsHeaders });
        }

        // 4b. On Success: Commit Quota (insert 0 amount log just to track completion)
        await supabaseClient
            .from('voice_ledger')
            .insert({
                user_id: user.id,
                type: 'COMMIT',
                amount: 0, 
                reference_id: reserveLog.id,
                description: `Successfully generated TTS`,
            });

        return new Response(
            JSON.stringify({ success: true, audioUrl }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error("TTS Error:", error);
        return new Response(
            JSON.stringify({ error: "Internal Server Error" }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
