
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

        // Create client with Service Role Key to bypass RLS
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const {
            page = 0,
            limit = 60,
            categoryId,
            userId,
            imageType,
            daysAgo,
            onlyFavorites,
            id // Add ID support
        } = await req.json();

        let query = supabase
            .from('generations')
            .select('*, profiles(email)');

        // If ID is provided, fetch specific item
        if (id) {
            query = query.eq('id', id);
        } else {
            // Apply filters
            if (onlyFavorites) {
                query = query.eq('is_favorite', true);
            }
            if (categoryId) {
                query = query.eq('category_id', categoryId);
            }

            if (userId) {
                query = query.eq('user_id', userId);
            }

            if (imageType) {
                query = query.eq('image_type', imageType);
            }

            if (daysAgo) {
                const date = new Date();
                date.setDate(date.getDate() - daysAgo);
                query = query.gte('created_at', date.toISOString());
            }

            // Apply Order and Pagination LAST
            query = query.order('created_at', { ascending: false })
                .range(page * limit, (page + 1) * limit - 1);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching gallery:', error);
            throw error;
        }

        // Transform data to match frontend expectations
        const formattedData = (data || []).map((item: any) => ({
            id: item.id,
            thumbnail: item.image_url,
            images: [item.image_url],
            prompt: item.prompt,
            timestamp: new Date(item.created_at).getTime(),
            mode: item.mode,
            modelName: item.model_name,
            cost: item.cost_credits,
            imageType: item.image_type,
            isFavorite: item.is_favorite,
            categoryId: item.category_id,
            userEmail: item.profiles?.email
        }));

        return new Response(
            JSON.stringify({ images: formattedData }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );

    } catch (error: any) {
        console.error("Edge Function Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }
});
