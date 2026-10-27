import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {safeDestination} from '@/lib/auth-redirect';
export async function GET(request:Request) {
  const url=new URL(request.url),code=url.searchParams.get('code');
  const requestCookies=request.headers.get('cookie') || '';
  const cookieNext=requestCookies.match(/(?:^|;\s*)windi_auth_next=([^;]*)/)?.[1];
  let savedNext: string | undefined;
  try { savedNext=cookieNext ? decodeURIComponent(cookieNext) : undefined; } catch { savedNext=undefined; }
  const next=safeDestination(url.searchParams.get('next') || savedNext);
  const redirect=(destination:URL) => {
    const response=NextResponse.redirect(destination);
    response.cookies.set('windi_auth_next','',{path:'/auth/callback',maxAge:0,sameSite:'lax',secure:url.protocol==='https:'});
    return response;
  };
  if(code) {
    const client=await createClient();
    const {error}=await client.auth.exchangeCodeForSession(code);
    if(!error) return redirect(new URL(next,url.origin));
  }
  const loginUrl=new URL('/login',url.origin);
  loginUrl.searchParams.set('error','oauth');
  loginUrl.searchParams.set('next',next);
  return redirect(loginUrl);
}
