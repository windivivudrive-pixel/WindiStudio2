import { createClient } from '@supabase/supabase-js';

// Thay thế bằng URL và KEY từ Supabase Dashboard của bạn
// Tốt nhất là lấy từ process.env.SUPABASE_URL và process.env.SUPABASE_ANON_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey);