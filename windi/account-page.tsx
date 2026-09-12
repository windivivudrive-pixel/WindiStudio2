"use client";
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowUpRight,AudioLines,KeyRound,ReceiptText,UserRound} from 'lucide-react';
import {useAuth} from './auth-context';
import {VoiceId} from './voice-id';
import {VoiceApiTokens} from './voice-api-tokens';
import {VOICE_PLANS,type VoiceAccount} from '@/lib/voice/shared';
import type {AccountOrder} from '@/lib/account-orders';

const date=(value?:string|null)=>value?new Date(value).toLocaleString('vi-VN'):'Chưa có dữ liệu';
const number=(value:number)=>new Intl.NumberFormat('vi-VN').format(value);
const statusNames:Record<string,string>={paid:'Đã thanh toán',pending:'Chờ thanh toán',expired:'Hết hạn',review:'Đang đối soát',review_required:'Đang đối soát',underpaid:'Thanh toán thiếu',overpaid:'Thanh toán dư',refunded:'Đã hoàn tiền'};
type Kit={entitlement:{voice_credits:number;voice_credits_used:number}|null};
function useAccountData<T>(url:string){
  const [data,setData]=useState<T|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
  useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');fetch(url,{cache:'no-store',signal:controller.signal}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error||'Chưa tải được dữ liệu.');return b;}).then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[url,revision]);
  return {data,error,loading,retry:()=>setRevision(x=>x+1)};
}
function State({error,loading,retry}:{error:string;loading:boolean;retry:()=>void}){return error?<p role="alert">{error} <button className="voice-btn" onClick={retry}>Thử lại</button></p>:loading?<p role="status">Đang tải…</p>:null;}
export function AccountPage(){
  const {user,isLoading}=useAuth();
  if(isLoading)return <div className="account-page"><p role="status">Đang mở hồ sơ…</p></div>;
  if(!user)return <div className="account-page"><h1>Hồ sơ của tôi</h1><p>Đăng nhập để xem đơn hàng, giọng riêng và API key của bạn.</p><Link className="voice-btn" href="/login?next=/account">Đăng nhập</Link></div>;
  return <AccountContent key={user.id} user={user}/>;
}
function AccountContent({user}:{user:NonNullable<ReturnType<typeof useAuth>['user']>}){
  const voice=useAccountData<VoiceAccount>('/api/voice/account'),kit=useAccountData<Kit>('/api/video-kits/account');
  const name=user.user_metadata?.full_name||user.user_metadata?.name||user.email?.split('@')[0]||'Bạn';
  const avatar=user.user_metadata?.avatar_url||user.user_metadata?.picture;
  const p=voice.data?.period;
  return <div className="account-page">
    <header className="account-heading"><div><span className="account-eyebrow">WINDISTUDIO / TÀI KHOẢN</span><h1>Không gian của bạn.</h1><p>Giọng nói, công cụ và những gì bạn đã sở hữu.</p></div><Link className="voice-btn" href="/voice-studio">Mở Voice Studio <ArrowUpRight size={16}/></Link></header>
    <nav className="account-nav" aria-label="Các mục hồ sơ"><a href="#overview"><UserRound size={16}/> Tổng quan</a><a href="#voices"><AudioLines size={16}/> Giọng của tôi</a><a href="#orders"><ReceiptText size={16}/> Đơn hàng</a><a href="#api"><KeyRound size={16}/> API key</a></nav>
    <section id="overview" className="account-section"><div className="account-section-title"><span>01 / HỒ SƠ</span><h2>Mọi thứ trong một nơi.</h2></div>
      <div className="account-identity">{avatar?<img src={avatar} alt={name} referrerPolicy="no-referrer"/>:<span className="account-initial">{name.slice(0,1)}</span>}<div><h3>{name}</h3><p>{user.email}</p></div></div>
      <div className="account-stats"><article><span>Gói Voice</span><State {...voice}/>{!voice.loading&&!voice.error&&<><strong>{VOICE_PLANS.find(x=>x.id===p?.plan_id)?.name||p?.plan_id||'Chưa có gói đang hoạt động'}</strong><small>Hết hạn: {date(p?.ends_at)}</small></>}</article><article><span>Credit gói Voice</span>{!voice.loading&&!voice.error?<><strong>{number(Math.max(0,(p?.credits||0)-(p?.used_credits||0)))}</strong><small>Đã dùng {number(p?.used_credits||0)} / {number(p?.credits||0)}</small></>:<State {...voice}/>}</article><article><span>Windi Workflow</span><State {...kit}/>{!kit.loading&&!kit.error&&<><strong>{kit.data?.entitlement?'Đã sở hữu':'Chưa có giấy phép'}</strong><small>{kit.data?.entitlement?`${number(Math.max(0,kit.data.entitlement.voice_credits-kit.data.entitlement.voice_credits_used))} credit đi kèm còn lại`:'Khám phá trong Video Kits'}</small><Link href="/video-kits">Quản lý Workflow →</Link></>}</article></div>
    </section>
    <section id="voices" className="account-section"><div className="account-section-title"><span>02 / GIỌNG RIÊNG</span><h2>Giọng của bạn, sẵn sàng dùng.</h2></div><State {...voice}/>{!voice.loading&&!voice.error&&(!voice.data?.clones.length?<p>Bạn chưa có giọng clone. <Link href="/voice-studio">Tạo giọng đầu tiên →</Link></p>:<div className="account-clones">{voice.data.clones.map(c=><article key={c.id}><AudioLines size={23}/><h3>{c.name}</h3><p>{c.language.toUpperCase()} · {c.status==='ready'?'Sẵn sàng':c.status==='failed'?'Tạo chưa thành công':'Đang xử lý'}</p>{c.status==='ready'&&<VoiceId id={c.provider_id}/>}</article>)}</div>)}<Link href="/voice-studio">Xem toàn bộ thư viện và Voice ID →</Link></section>
    <Orders/>
    <section id="api" className="account-section"><div className="account-section-title"><span>04 / KẾT NỐI</span><h2>Mang giọng nói vào ứng dụng.</h2></div><VoiceApiTokens enabled/><CodeExample/></section>
  </div>;
}
function Orders(){
  const [kind,setKind]=useState('all'),[status,setStatus]=useState('all'),[orders,setOrders]=useState<AccountOrder[]>([]),[cursor,setCursor]=useState<string|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[selected,setSelected]=useState<AccountOrder|null>(null);
  const requestNumber=useRef(0);
  useEffect(()=>{if(selected){const detail=document.getElementById('account-order-detail');detail?.focus({preventScroll:true});detail?.scrollIntoView({block:'nearest'});}},[selected]);
  const load=useCallback(async(next?:string)=>{const n=++requestNumber.current;setLoading(true);setError('');try{const params=new URLSearchParams({kind,status});if(next)params.set('cursor',next);const r=await fetch(`/api/account/orders?${params}`,{cache:'no-store'});const b=await r.json();if(!r.ok)throw new Error(b.error||'Chưa tải được đơn hàng.');if(n!==requestNumber.current)return;setOrders(prev=>next?[...prev,...b.data]:b.data);setCursor(b.nextCursor);}catch(e){if(n===requestNumber.current)setError((e as Error).message);}finally{if(n===requestNumber.current)setLoading(false);}},[kind,status]);
  useEffect(()=>{setOrders([]);setCursor(null);setSelected(null);void load();return()=>{requestNumber.current++;};},[load]);
  return <section id="orders" className="account-section"><div className="account-section-title"><span>03 / ĐƠN HÀNG</span><h2>Lịch sử mua hàng.</h2></div><div className="account-filters"><label>Sản phẩm<select value={kind} onChange={e=>setKind(e.target.value)}><option value="all">Tất cả sản phẩm</option><option value="voice">Voice Studio</option><option value="workflow">Workflow / Video Kits</option></select></label><label>Trạng thái<select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Mọi trạng thái</option>{Object.entries(statusNames).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label></div>
    <State error={error} loading={loading} retry={()=>void load(orders.length?cursor||undefined:undefined)}/>
    {!loading&&!error&&!orders.length&&<p>Chưa có đơn hàng phù hợp.</p>}
    <div className="account-orders">{orders.map(o=><button key={`${o.kind}:${o.id}`} className="account-order" onClick={()=>setSelected(selected?.id===o.id&&selected?.kind===o.kind?null:o)} aria-expanded={selected?.id===o.id&&selected?.kind===o.kind} aria-controls="account-order-detail"><span><strong>{o.title}</strong><small>{date(o.createdAt)}</small><code>{o.paymentCode}</code></span><span><strong>{number(o.amount)}đ</strong><small className={o.status==='paid'?'account-paid':''}>{statusNames[o.status]||o.status}</small><small>Xem chi tiết →</small></span></button>)}</div>
    {cursor&&<button disabled={loading} className="voice-btn" onClick={()=>void load(cursor)}>Tải thêm 20 đơn</button>}
    {selected&&<article id="account-order-detail" className="account-order-detail" tabIndex={-1}><h3>Chi tiết đơn hàng</h3><dl><dt>Sản phẩm</dt><dd>{selected.title}</dd><dt>Mã đơn</dt><dd>{selected.id}</dd><dt>Mã thanh toán</dt><dd>{selected.paymentCode}</dd><dt>Trạng thái</dt><dd>{statusNames[selected.status]||selected.status}</dd><dt>Số tiền</dt><dd>{number(selected.amount)}đ</dd><dt>Ngày tạo</dt><dd>{date(selected.createdAt)}</dd><dt>Thanh toán lúc</dt><dd>{date(selected.paidAt)}</dd><dt>Quyền lợi / sản phẩm trong đơn</dt><dd>{selected.benefits.length?selected.benefits.map((b,i)=><p key={i}>{b}</p>):'Chưa có dữ liệu'}</dd></dl><button className="voice-btn" onClick={()=>setSelected(null)}>Đóng chi tiết</button></article>}
  </section>;
}
function CodeExample(){
  const [id,setId]=useState(''),[notice,setNotice]=useState('');
  useEffect(()=>{const selected=new URLSearchParams(window.location.search).get('voice');if(selected&&/^[0-9a-f-]{36}$/i.test(selected))setId(selected);},[]);
  const code=`export WINDI_API_KEY='API_KEY_CUA_BAN'\nexport WINDI_VOICE_ID='${id.replace(/[^a-zA-Z0-9-]/g,'')||'VOICE_ID_CUA_BAN'}'\n\ncurl 'https://windistudio.app/api/v1/voice/generations' \\\n  -H "Authorization: Bearer $WINDI_API_KEY" \\\n  -H 'Content-Type: application/json' \\\n  -H "Idempotency-Key: $(uuidgen)" \\\n  -d "{\\"text\\":\\"Xin chào từ WindiStudio\\",\\"voice_id\\":\\"$WINDI_VOICE_ID\\",\\"language\\":\\"vi\\",\\"speed\\":1}"`;
  return <div className="account-code"><h3>Dùng trong code</h3><p>Dán Voice ID từ thư viện hoặc giọng riêng. Mỗi lần tạo thành công sẽ dùng credit trong tài khoản.</p><label>Voice ID<input value={id} onChange={e=>setId(e.target.value)} placeholder="Dán Voice ID tại đây" spellCheck={false}/></label><pre><code>{code}</code></pre><button className="voice-btn" onClick={async()=>{try{await navigator.clipboard.writeText(code);setNotice('Đã sao chép ví dụ.');}catch{setNotice('Chưa sao chép được. Bạn có thể chọn đoạn code để sao chép.');}}}>Sao chép ví dụ</button><p role="status">{notice}</p><p>Thay API_KEY_CUA_BAN bằng key vừa tạo và giữ key ở phía server. Kết quả trả về mã bản tạo; tải âm thanh tại <code>/api/v1/voice/generations/ID/audio</code> với cùng API key.</p></div>;
}
