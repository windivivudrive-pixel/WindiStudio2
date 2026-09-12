import {test,expect,vi} from 'vitest';
vi.mock('server-only',()=>({}));
vi.mock('../lib/products/license',()=>({productTokenIdentity:vi.fn()}));
vi.mock('../lib/voice/server',()=>({failure:(e:Error)=>Response.json({error:e.message},{status:403})}));
import {productTokenIdentity} from '../lib/products/license';
import {GET} from '../app/api/video-kits/access/route';
import {POST} from '../app/api/video-kits/devices/route';
test('account access needs no hardware identifier, including legacy clients',async()=>{
 vi.mocked(productTokenIdentity).mockResolvedValue({userId:'u',tokenId:'t',entitlementId:'e'});
 for(const handler of [GET,POST]){
  const result=await handler(new Request('https://windi.test/api/video-kits/access',{headers:{authorization:'Bearer account-token'}}));
  expect(result.status).toBe(200);expect(await result.json()).toMatchObject({active:true,accessMode:'account'});
 }
});
test('revoked or unpaid account cannot get access',async()=>{
 vi.mocked(productTokenIdentity).mockRejectedValue(new Error('Entitlement revoked'));
 const result=await GET(new Request('https://windi.test/api/video-kits/access'));
 expect(result.status).toBe(403);
});
