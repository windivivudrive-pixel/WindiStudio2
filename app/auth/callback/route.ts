import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {safeDestination} from '@/lib/auth-redirect';
export async function GET(request:Request) {
  const url=new URL(request.url),code=url.searchParams.get('code');
  if(code) {
    const client=await createClient();
    const {error}=await client.auth.exchangeCodeForSession(code);
    if(!error) return NextResponse.redirect(new URL(safeDestination(url.searchParams.get('next')),url.origin));
  }
  return NextResponse.redirect(new URL('/login?error=oauth',url.origin));
}
