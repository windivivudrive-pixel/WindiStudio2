import {beforeEach,expect,test,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const mocks=vi.hoisted(()=>({writer:vi.fn(),identity:vi.fn(),cartesia:vi.fn()}));
vi.mock('../lib/voice/server',()=>({...mocks,VoiceError:class extends Error {constructor(message:string,public status=400){super(message);}},failure:(e:any)=>Response.json({error:e.message},{status:e.status||503})}));
import {GET} from '../app/api/voice/admin/route';
import {isVoiceAdmin} from '../lib/voice/admin';
let member:any;
beforeEach(()=>{
 vi.resetAllMocks();vi.unstubAllEnvs();vi.unstubAllGlobals();member=null;
 mocks.identity.mockResolvedValue({user:{id:'u'}});
 mocks.writer.mockReturnValue({from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:member,error:null})})})})});
});
test('non-admin cannot fetch provider data',async()=>{
 const response=await GET(new Request('https://windi.test/api/voice/admin?view=voices'));
 expect(response.status).toBe(403);expect(mocks.cartesia).not.toHaveBeenCalled();
});
test('membership is checked fresh; revocation takes effect without a JWT refresh',async()=>{
 member={user_id:'u'};expect(await isVoiceAdmin('u')).toBe(true);member=null;expect(await isVoiceAdmin('u')).toBe(false);
});
test('the removed credit-usage endpoint is not exposed',async()=>{
 member={user_id:'u'};
 const response=await GET(new Request('https://windi.test/api/voice/admin'));
 expect(response.status).toBe(404);
});
