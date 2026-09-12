import {chromium} from '/Users/win/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {mkdir} from 'node:fs/promises';
import dotenv from 'dotenv';
import assert from 'node:assert/strict';
dotenv.config({path:'.env.local',quiet:true});
const origin='http://localhost:3000';
const user={id:'00000000-0000-4000-8000-000000000001',email:'creator@example.test',aud:'authenticated',role:'authenticated',user_metadata:{full_name:'Minh Nguyễn'},created_at:'2026-09-01T00:00:00Z'};
const voiceId='60cf30cf-dcad-4cb1-b2e9-b6c08a23569e';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext();
const token=`${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.fixture`;
const session={access_token:token,refresh_token:'fixture-only',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user};
const project=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
await context.addCookies([{name:`sb-${project}-auth-token`,value:`base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`,url:origin}]);
await context.grantPermissions(['clipboard-read','clipboard-write']);
const orders=[{id:'00000000-0000-4000-8000-000000000005',kind:'voice',title:'Voice · Creator',status:'paid',amount:269000,paymentCode:'WINDI TEST001',createdAt:'2026-09-12T01:00:00Z',paidAt:'2026-09-12T01:02:00Z',benefits:['150.000 credit','5 lượt clone','30 ngày']}];
let tokens=[],generated=false;
await context.route('**/*',async route=>{
 const url=new URL(route.request().url()),path=url.pathname;
 const json=body=>route.fulfill({json:body});
 if(path==='/auth/v1/user')return json(user);
 if(url.origin!==origin)return route.abort();
 if(path==='/api/voice/account')return json({available:true,paymentsAvailable:true,period:{plan_id:'creator',credits:150000,used_credits:32000,ends_at:'2026-10-12T00:00:00Z'},clones:[{id:'clone-record',provider_id:voiceId,name:'Giọng Minh',language:'vi',status:'ready'}],jobs:[],orders:[],trialEligible:false});
 if(path==='/api/voice/voices')return json({available:true,voices:[{id:voiceId,name:'Giọng mẫu fixture',language:'vi',kind:'public',description:'Giọng mẫu cho kiểm tra UI.'}]});
 if(path==='/api/video-kits/account')return json({entitlement:{voice_credits:20000,voice_credits_used:2500}});
 if(path==='/api/account/orders')return json({data:orders,nextCursor:null});
 if(path==='/api/v1/voice/tokens'){
   if(route.request().method()==='POST'){generated=true;tokens=[{id:'test-key',name:'Ứng dụng của tôi',token_prefix:'windi_voice_',last_four:'abcd',created_at:'2026-09-12T00:00:00Z',last_used_at:null,revoked_at:null}];return json({token:'windi_voice_FIXTURE_NOT_A_REAL_SECRET_abcd'});}
   if(route.request().method()==='DELETE'){tokens=tokens.map(t=>({...t,revoked_at:new Date().toISOString()}));return json({success:true});}
   return json({data:tokens,can_create:true,access:{hasWorkflowLicense:true}});
 }
 if(path.startsWith('/api/'))return json({data:[]});
 return route.continue();
});
const page=await context.newPage();
await mkdir('visual-checks/account',{recursive:true});
await page.goto(`${origin}/account`);await page.getByRole('heading',{name:'Không gian của bạn.'}).waitFor();await page.getByText('Giọng Minh',{exact:true}).waitFor();
for(const width of [375,768,1024,1440]){
 await page.setViewportSize({width,height:1000});
 for(const theme of ['light','dark']){
   await page.evaluate(theme=>document.documentElement.setAttribute('data-theme',theme),theme);
   await page.screenshot({path:`visual-checks/account/${width}-${theme}.png`,fullPage:true});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow ${width} ${theme}`);
 }
}
await page.getByRole('button',{name:`Sao chép Voice ID ${voiceId}`}).click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),voiceId);
await page.getByRole('button',{name:'Tạo API key',exact:true}).click();await page.getByText('Sao chép token này ngay').waitFor();assert.equal(generated,true);
await page.reload();await page.getByText('Giọng Minh',{exact:true}).waitFor();assert.equal(await page.getByText('windi_voice_FIXTURE_NOT_A_REAL_SECRET_abcd').count(),0);
await page.getByRole('button',{name:/Voice · Creator/}).click();await page.getByRole('heading',{name:'Chi tiết đơn hàng'}).waitFor();
page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'Thu hồi Ứng dụng của tôi'}).click();await page.getByRole('status').filter({hasText:'Đã thu hồi API key.'}).waitFor();
await page.goto(`${origin}/voice-studio`);
await page.getByRole('tab',{name:/Thư viện/}).click();
const card=page.locator('.voice-card').filter({has:page.getByRole('heading',{name:'Giọng mẫu fixture',exact:true})});await card.waitFor();
await card.getByRole('button',{name:`Sao chép Voice ID ${voiceId}`}).click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),voiceId);assert.equal(await page.locator('[role=tab][aria-selected=true]').textContent(),'Thư viện giọng');
await card.getByRole('button',{name:'Sử dụng',exact:true}).click();
await page.locator('.voice-settings').getByRole('button',{name:`Sao chép Voice ID ${voiceId}`}).click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),voiceId);
await page.getByRole('link',{name:/API key và cách dùng/}).click();await page.locator('.account-code input').waitFor();await page.waitForFunction(id=>document.querySelector('.account-code input')?.value===id,voiceId);
console.log('PASS: responsive screenshots, no overflow, copy clone/library/selected voice ID without triggering selection, Workflow API key create/revoke, secret hidden after reload, paid order detail and selected ID in code example. All API calls used fixtures.');
await browser.close();
