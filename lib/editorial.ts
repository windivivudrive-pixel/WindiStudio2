import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';

export async function requireEditor() {
  const client = await createClient();
  const {data:{user},error} = await client.auth.getUser();
  if (error || !user) redirect('/login?next=/admin');
  const {data:membership,error:membershipError} = await client.from('editorial_members').select('role').eq('user_id',user.id).maybeSingle();
  if (membershipError) throw new Error('Chưa tải được quyền biên tập. Vui lòng thử lại.');
  return {client,user,allowed:!!membership && ['admin','editor'].includes(membership.role)};
}
export function editorialWriter() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Chưa cấu hình quyền ghi biên tập trên máy chủ.');
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
