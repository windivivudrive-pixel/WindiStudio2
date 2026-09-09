import {beforeEach,expect,test,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const state=vi.hoisted(()=>({identity:vi.fn(),writer:vi.fn(),cartesia:vi.fn(),providerReady:vi.fn(),resolveVoice:vi.fn(),resolveCloneAccent:vi.fn(),voiceAccents:vi.fn(),audioUrl:vi.fn(),paymentConfig:vi.fn(),previewPublicVoice:vi.fn()}));
vi.mock('../lib/voice/server',async(importOriginal)=>({...await importOriginal<typeof import('../lib/voice/server')>(),...state}));
import {POST as generate} from '../app/api/voice/generate/route';
import {POST as clone} from '../app/api/voice/clone/route';
import {POST as createOrder} from '../app/api/voice/orders/route';
import {POST as pay} from '../app/api/voice/payment-webhook/route';
import {GET as preview} from '../app/api/voice/preview/route';
import {GET as accents} from '../app/api/voice/accents/route';
import {VoiceError} from '../lib/voice/server';
const uid='00000000-0000-4000-8000-000000000011',id='00000000-0000-4000-8000-000000000022';
const payload={text:'Xin chào',voiceId:id,requestKey:id,language:'vi',speed:1};
const request=(body:unknown)=>new Request('http://localhost/api/voice/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
let rpc:ReturnType<typeof vi.fn>,upload:ReturnType<typeof vi.fn>,claim:ReturnType<typeof vi.fn>;
beforeEach(()=>{
 vi.resetAllMocks();
 state.identity.mockResolvedValue({user:{id:uid}});state.providerReady.mockReturnValue(true);state.resolveVoice.mockResolvedValue({id,name:'Voice'});state.resolveCloneAccent.mockResolvedValue(null);state.voiceAccents.mockResolvedValue([]);state.audioUrl.mockResolvedValue('https://example.test/signed');
 rpc=vi.fn().mockImplementation(async(name)=>({data:name==='windi_voice_reserve'||name==='windi_voice_clone_reserve'?{id,status:'reserved'}:null,error:null}));
 upload=vi.fn().mockResolvedValue({error:null});claim=vi.fn().mockResolvedValue({data:{id},error:null});
 const query={update:()=>query,eq:()=>query,select:()=>query,maybeSingle:claim};
 state.writer.mockReturnValue({rpc,from:()=>query,storage:{from:()=>({upload})}});
 state.paymentConfig.mockReturnValue({bank:'TEST',account:'1234',name:'Example'});
 state.previewPublicVoice.mockResolvedValue({voice:{id,name:'Linh'},audio:new Uint8Array([73,68,51]).buffer});
 process.env.SEPAY_API_KEY='test-webhook-secret';
});
test('unauthenticated requests cannot reserve credits or call Cartesia',async()=>{
 state.identity.mockRejectedValue(new VoiceError('Sign in',401));
 expect((await generate(request(payload))).status).toBe(401);expect(rpc).not.toHaveBeenCalled();expect(state.cartesia).not.toHaveBeenCalled();
});
test('missing provider config and invalid inputs never reserve quota',async()=>{
 state.providerReady.mockReturnValue(false);expect((await generate(request(payload))).status).toBe(503);
 state.providerReady.mockReturnValue(true);expect((await generate(request({...payload,text:' '}))).status).toBe(400);
 expect(rpc).not.toHaveBeenCalled();
});
test('foreign voice is rejected before debit',async()=>{
 state.resolveVoice.mockRejectedValue(new VoiceError('Foreign voice',403));
 expect((await generate(request(payload))).status).toBe(403);expect(rpc).not.toHaveBeenCalled();
});
test('actual request uses Sonic 3.6; MP3 is stored privately before success',async()=>{
 state.cartesia.mockResolvedValue(new Response(new Uint8Array([73,68,51,1,2,3]),{headers:{'Content-Type':'audio/mpeg'}}));
 const response=await generate(request(payload));expect(response.status).toBe(200);
 const upstream=JSON.parse(state.cartesia.mock.calls[0][1].body);
 expect(upstream).toMatchObject({model_id:'sonic-3.6',voice:id,transcript:'Xin chào',language:'vi'});
 expect(upload).toHaveBeenCalledWith(`${uid}/${id}.mp3`,expect.any(ArrayBuffer),{contentType:'audio/mpeg',upsert:false});
 expect(rpc).toHaveBeenCalledWith('windi_voice_finish',{p_job:id,p_success:true,p_path:`${uid}/${id}.mp3`});
});
test('duplicate claim does not generate twice',async()=>{
 claim.mockResolvedValue({data:null,error:null});
 expect((await generate(request(payload))).status).toBe(409);expect(state.cartesia).not.toHaveBeenCalled();
});
test('known provider rejection refunds; ambiguous timeout preserves reservation',async()=>{
 state.cartesia.mockResolvedValue(new Response('rate limited',{status:429}));
 expect((await generate(request(payload))).status).toBe(502);
 expect(rpc).toHaveBeenCalledWith('windi_voice_finish',{p_job:id,p_success:false});
 rpc.mockClear();state.cartesia.mockRejectedValue(new Error('timeout'));
 expect((await generate(request(payload))).status).toBe(503);
 expect(rpc.mock.calls.some(c=>c[0]==='windi_voice_finish')).toBe(false);
});
test('storage failure never returns a fake audio URL or claims completed',async()=>{
 state.cartesia.mockResolvedValue(new Response(new Uint8Array([1,2,3])));upload.mockResolvedValue({error:new Error('storage unavailable')});
 expect((await generate(request(payload))).status).toBe(503);expect(state.audioUrl).not.toHaveBeenCalled();
 expect(rpc.mock.calls.some(c=>c[0]==='windi_voice_finish')).toBe(false);
});
test('clone requires explicit voice rights confirmation before provider use',async()=>{
 const form=new FormData();form.set('clip',new File(['test'],'voice.mp3',{type:'audio/mpeg'}));form.set('name','My voice');form.set('requestKey',id);form.set('language','vi');
 const response=await clone(new Request('http://localhost/api/voice/clone',{method:'POST',body:form}));
 expect(response.status).toBe(400);expect(rpc).not.toHaveBeenCalled();expect(state.cartesia).not.toHaveBeenCalled();
});
test('clone validates, persists, and forwards an optional Cartesia accent',async()=>{
 const form=new FormData();form.set('clip',new File(['test'],'voice.mp3',{type:'audio/mpeg'}));form.set('name','My voice');form.set('requestKey',id);form.set('language','vi');form.set('accent','northern-vietnamese');form.set('consent','true');
 state.resolveCloneAccent.mockResolvedValue('northern-vietnamese');state.cartesia.mockResolvedValue(new Response(JSON.stringify({id}),{headers:{'Content-Type':'application/json'}}));
 const response=await clone(new Request('http://localhost/api/voice/clone',{method:'POST',body:form}));
 expect(response.status).toBe(200);expect(state.resolveCloneAccent).toHaveBeenCalledWith('vi','northern-vietnamese');
 expect(rpc).toHaveBeenCalledWith('windi_voice_clone_reserve',{p_user:uid,p_key:id,p_name:'My voice',p_language:'vi',p_accent:'northern-vietnamese'});
 const upstream=state.cartesia.mock.calls[0][1].body as FormData;
 expect(upstream.get('accent')).toBe('northern-vietnamese');
});
test('accent catalog is private to the signed-in studio user and language-scoped',async()=>{
 state.voiceAccents.mockResolvedValue([{id:'northern-vietnamese',name:'Northern Vietnamese',language:'vi',locale:'vi-VN',isLocaleDefault:true,isLocalizable:false}]);
 const response=await accents(new Request('http://localhost/api/voice/accents?language=vi'));
 expect(response.status).toBe(200);expect(await response.json()).toEqual({accents:[expect.objectContaining({id:'northern-vietnamese',language:'vi'})]});
 expect(state.voiceAccents).toHaveBeenCalledWith('vi');
});
function webhook(body:unknown,token='Apikey test-webhook-secret'){return new Request('http://localhost/api/voice/payment-webhook',{method:'POST',headers:{'Content-Type':'application/json',Authorization:token},body:JSON.stringify(body)});}
function orderRequest(planId:string){return new Request('http://localhost/api/voice/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({planId})});}
test('welcome credit cannot be bought and the one-time clone trial is purchasable',async()=>{
 expect((await createOrder(orderRequest('welcome'))).status).toBe(400);
 expect(rpc).not.toHaveBeenCalled();
 expect((await createOrder(orderRequest('trial'))).status).toBe(200);
 expect(rpc).toHaveBeenCalledWith('windi_voice_order',{p_user:uid,p_plan:'trial'});
});
const transaction={id:1,transferType:'in',accountNumber:'1234',transferAmount:69000,content:'WV1234567890ABCDEF'};
test('webhook rejects spoofed authentication and ignores outbound/wrong-account transfers',async()=>{
 expect((await pay(webhook(transaction,'Apikey wrong'))).status).toBe(401);
 expect(await (await pay(webhook({...transaction,transferType:'out'}))).json()).toMatchObject({status:'ignored'});
 expect(await (await pay(webhook({...transaction,accountNumber:'other'}))).json()).toMatchObject({status:'ignored'});
 expect(rpc).not.toHaveBeenCalled();
});
test('only exact transfer code and integer amount reach the atomic payment function',async()=>{
 expect((await pay(webhook({...transaction,transferAmount:'69000'}))).status).toBe(400);
 expect(await (await pay(webhook({...transaction,content:'WV1234567890ABCDEFA'}))).json()).toMatchObject({status:'ignored'});
  await pay(webhook(transaction));expect(rpc).toHaveBeenCalledWith('windi_voice_pay',{p_code:transaction.content,p_gateway:'1',p_amount:69000});
  rpc.mockClear();
  await pay(webhook({...transaction,id:2,content:'Chuyen khoan WINDI A1B2C3D4 thanh toan'}));
  expect(rpc).toHaveBeenCalledWith('windi_voice_pay',{p_code:'WINDI A1B2C3D4',p_gateway:'2',p_amount:69000});
  rpc.mockClear();
  await pay(webhook({...transaction,id:3,content:'WINDIA1B2C3D4'}));
  expect(rpc).toHaveBeenCalledWith('windi_voice_pay',{p_code:'WINDI A1B2C3D4',p_gateway:'3',p_amount:69000});
  rpc.mockClear();
  await pay(webhook({...transaction,id:4,content:'WST A1B2C3D4'}));
  expect(rpc).toHaveBeenCalledWith('windi_voice_pay',{p_code:'WST A1B2C3D4',p_gateway:'4',p_amount:69000});
});
test('oversized bodies are rejected even without Content-Length',async()=>{
 expect((await generate(request({...payload,text:'a'.repeat(100001)}))).status).toBe(413);expect(rpc).not.toHaveBeenCalled();
});
test('public catalog samples return an inline MP3 without a user credit reservation',async()=>{
 const response=await preview(new Request(`http://localhost/api/voice/preview?id=${id}`));
 expect(response.status).toBe(200);expect(response.headers.get('content-type')).toBe('audio/mpeg');
 expect(response.headers.get('content-disposition')).toContain('linh-preview.mp3');
 expect(state.previewPublicVoice).toHaveBeenCalledWith(expect.any(Request),id);
 expect(rpc).not.toHaveBeenCalled();expect(state.cartesia).not.toHaveBeenCalled();
});
test('preview validates the voice ID and provider availability before provider work',async()=>{
 expect((await preview(new Request('http://localhost/api/voice/preview?id=not-a-uuid'))).status).toBe(400);
 expect(state.previewPublicVoice).not.toHaveBeenCalled();
 state.providerReady.mockReturnValue(false);
 expect((await preview(new Request(`http://localhost/api/voice/preview?id=${id}`))).status).toBe(503);
 expect(state.previewPublicVoice).not.toHaveBeenCalled();
});
