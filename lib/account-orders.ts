import type {SupabaseClient} from '@supabase/supabase-js';
import {isUUID} from './voice/shared';

export type AccountOrder = {id:string;kind:'voice'|'workflow';title:string;status:string;amount:number;paymentCode:string;createdAt:string;paidAt:string|null;benefits:string[]};
type Position={at:string;id:string};
type Cursor={voice?:Position;workflow?:Position};
const statuses=['pending','paid','expired','review','underpaid','overpaid','review_required','refunded'];
export function parseOrderQuery(params:URLSearchParams) {
  const kind=params.get('kind')||'all',status=params.get('status')||'all',id=params.get('id');
  if(!['all','voice','workflow'].includes(kind)||!(status==='all'||statuses.includes(status))||(id&&(!isUUID(id)||kind==='all'))) throw new Error('Bộ lọc đơn hàng không hợp lệ.');
  let cursor:Cursor={};
  if(params.get('cursor')) {
    try {
      if(params.get('cursor')!.length>1200) throw new Error();
      cursor=JSON.parse(Buffer.from(params.get('cursor')!,'base64url').toString());
      if(!cursor||typeof cursor!=='object'||Array.isArray(cursor)) throw new Error();
      for(const [key,p] of Object.entries(cursor)) if(!['voice','workflow'].includes(key)||!p||!isUUID(p.id)||typeof p.at!=='string'||!/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|\+00:00)$/.test(p.at)||!Number.isFinite(Date.parse(p.at))) throw new Error();
    }catch{throw new Error('Trang đơn hàng không hợp lệ.');}
  }
  return {kind,status,id,cursor};
}
export async function readAccountOrders(db:SupabaseClient,userId:string,params:URLSearchParams) {
  const {kind,status,id,cursor}=parseOrderQuery(params);
  async function rows(source:'voice'|'workflow') {
    if(kind!=='all'&&kind!==source) return [];
    const columns=source==='voice'?'id,plan_id,amount_vnd,payment_code,status,created_at,paid_at,credits,clone_limit,duration_days':'id,total_amount_vnd,payment_code,status,created_at,order_items(id,quantity,price_vnd,products(name))';
    let q=db.from(source==='voice'?'windi_voice_orders':'orders').select(columns).eq('user_id',userId);
    if(source==='voice') q=q.neq('plan_id','welcome');
    if(id) q=q.eq('id',id);
    if(status!=='all') q=q.eq('status',source==='voice'?status:status.toUpperCase());
    const p=cursor[source];
    if(p&&!id) q=q.or(`created_at.lt.${p.at},and(created_at.eq.${p.at},id.lt.${p.id})`);
    const result=await q.order('created_at',{ascending:false}).order('id',{ascending:false}).limit(id?1:21);
    if(result.error) throw result.error;
    return (result.data||[]).map((row:any):AccountOrder=>source==='voice'?{
      id:row.id,kind:source,title:`Voice · ${row.plan_id}`,status:row.status,amount:row.amount_vnd,paymentCode:row.payment_code,createdAt:row.created_at,paidAt:row.paid_at,
      benefits:[row.credits!=null?`${row.credits.toLocaleString('vi-VN')} credit`:null,row.clone_limit!=null?`${row.clone_limit} lượt clone`:null,row.duration_days!=null?`${row.duration_days} ngày`:null].filter(Boolean) as string[],
    }:{id:row.id,kind:source,title:(row.order_items||[]).map((i:any)=>i.products?.name||'Workflow / Video Kit').join(', ')||'Workflow / Video Kit',status:row.status.toLowerCase(),amount:row.total_amount_vnd,paymentCode:row.payment_code,createdAt:row.created_at,paidAt:null,
      benefits:(row.order_items||[]).map((i:any)=>`${i.quantity} × ${i.products?.name||'Sản phẩm'} · ${i.price_vnd.toLocaleString('vi-VN')}đ`)});
  }
  const [voice,workflow]=await Promise.all([rows('voice'),rows('workflow')]);
  const merged=[...voice,...workflow].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)||b.id.localeCompare(a.id)||a.kind.localeCompare(b.kind));
  const data=merged.slice(0,20),next={...cursor};
  for(const order of data)next[order.kind]={at:order.createdAt,id:order.id};
  return {data,nextCursor:merged.length>20?Buffer.from(JSON.stringify(next)).toString('base64url'):null};
}
