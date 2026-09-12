import {expect,test} from 'vitest';
import {parseOrderQuery,readAccountOrders} from '../lib/account-orders';
const uuid=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function fakeDb(){
 const source=Array.from({length:26},(_,i)=>({id:uuid(i+1),user_id:'mine',created_at:new Date(Date.UTC(2026,8,12,0,0,i)).toISOString(),plan_id:'creator',status:'paid',amount_vnd:12000,total_amount_vnd:25000,payment_code:`TEST${i}`,paid_at:null,credits:55,clone_limit:2,duration_days:14,order_items:[]}));
 source.push({...source[0],id:uuid(99),user_id:'someone-else'});
 return {from(table:string){let rows=source.map(r=>({...r,status:table==='orders'?'PAID':r.status})),limit=21;const q={select(){return q;},eq(k:string,v:string){rows=rows.filter(r=>r[k]===v);return q;},neq(k:string,v:string){rows=rows.filter(r=>r[k]!==v);return q;},order(){return q;},limit(n:number){limit=n;return q;},or(filter:string){const [,at,id]=filter.match(/created_at\.lt\.([^,]+),and\(created_at.eq.[^,]+,id.lt.([^\)]+)/)!;rows=rows.filter(r=>r.created_at<at||(r.created_at===at&&r.id<id));return q;},then(resolve:any){return Promise.resolve({data:rows.sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id)).slice(0,limit),error:null}).then(resolve);}};return q;}};
}
test('merged order pages are stable, owner-scoped, and preserve purchased benefits',async()=>{
 const db=fakeDb();let cursor:string|null=null;const seen:string[]=[];
 do{const page=await readAccountOrders(db as any,'mine',new URLSearchParams(cursor?{cursor}:{}));expect(page.data.length).toBeLessThanOrEqual(20);for(const row of page.data){seen.push(`${row.kind}:${row.id}`);expect(row.id).not.toBe(uuid(99));if(row.kind==='voice')expect(row.benefits).toContain('55 credit');}cursor=page.nextCursor;}while(cursor);
 expect(seen).toHaveLength(52);expect(new Set(seen).size).toBe(52);
});
test('order details cannot fetch another owner and filters are bounded',async()=>{
 const data=await readAccountOrders(fakeDb() as any,'mine',new URLSearchParams({kind:'voice',id:uuid(99)}));expect(data.data).toEqual([]);
 expect(()=>parseOrderQuery(new URLSearchParams({kind:'anything'}))).toThrow();
 expect(()=>parseOrderQuery(new URLSearchParams({cursor:'invalid'}))).toThrow();
 expect(()=>parseOrderQuery(new URLSearchParams({id:uuid(1)}))).toThrow();
});
