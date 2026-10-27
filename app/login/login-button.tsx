'use client';
import {useState} from 'react';
import {LogIn} from 'lucide-react';
import {createClient} from '@/lib/supabase/browser';
import {RetroButton} from '@/windi/ui/retro';
export function LoginButton({next}:{next:string}) {
  const [error,setError]=useState(''),[pending,setPending]=useState(false);
  return <><RetroButton disabled={pending} onClick={async()=>{setPending(true);setError('');try{const secure=window.location.protocol==='https:'?'; Secure':'';document.cookie=`windi_auth_next=${encodeURIComponent(next)}; Path=/auth/callback; Max-Age=600; SameSite=Lax${secure}`;const {error}=await createClient().auth.signInWithOAuth({provider:'google',options:{redirectTo:`${window.location.origin}/auth/callback`,queryParams:{prompt:'select_account'}}});if(error)throw error;}catch{document.cookie=`windi_auth_next=; Path=/auth/callback; Max-Age=0; SameSite=Lax`;setPending(false);setError('Không mở được đăng nhập Google. Vui lòng thử lại.');}}}><LogIn size={16}/>{pending?'Đang mở Google…':'Tiếp tục với Google'}</RetroButton><p role="alert">{error}</p></>;
}
