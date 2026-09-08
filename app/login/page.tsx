import {LoginButton} from './login-button';
import {RetroWindow} from '@/windi/ui/retro';
import {safeDestination} from '@/lib/auth-redirect';
export default async function Page({searchParams}:{searchParams:Promise<{next?:string;error?:string}>}) {
  const params=await searchParams;
  return <div className="page narrow-page"><header className="page-intro"><span className="eyebrow">ACCOUNT ACCESS</span><h1>Chào mừng trở lại.</h1><p>Đăng nhập bằng tài khoản Google của bạn.</p></header><RetroWindow title="ĐĂNG NHẬP" accent="blue"><div className="login-card">{params.error&&<p role="alert">Đăng nhập chưa hoàn tất. Vui lòng thử lại.</p>}<LoginButton next={safeDestination(params.next)}/></div></RetroWindow></div>;
}
