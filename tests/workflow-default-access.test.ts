import {afterEach,expect,test,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const provider=vi.hoisted(()=>vi.fn(async(id:string)=>({id,name:'Default Man Windi'})));
vi.mock('../lib/voice/admin',()=>({isVoiceAdmin:async()=>false,providerVoice:provider}));
import {resolveVoice} from '../lib/voice/server';
import {DEFAULT_WORKFLOW_VOICE_ID} from '../lib/voice/shared';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();provider.mockClear();});
test('only a Workflow owner can resolve the designated service voice without owning a clone',async()=>{
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://supabase.test');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','fixture');
 let licensed=true;const urls:string[]=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>{urls.push(String(url));return Response.json(String(url).includes('product_entitlements')&&licensed?[{id:'entitlement'}]:[]);}));
 expect((await resolveVoice('owner',DEFAULT_WORKFLOW_VOICE_ID)).id).toBe(DEFAULT_WORKFLOW_VOICE_ID);
 expect(urls[0]).toContain('user_id=eq.owner');expect(urls[0]).toContain('status=eq.active');
 licensed=false;
 await expect(resolveVoice('other-user',DEFAULT_WORKFLOW_VOICE_ID)).rejects.toThrow();
 expect(provider).toHaveBeenCalledTimes(1);
 await expect(resolveVoice('owner','00000000-0000-4000-8000-000000000055')).rejects.toThrow();
 expect(provider).toHaveBeenCalledTimes(1);
});
