import {test,expect,vi} from 'vitest';
import JSZip from 'jszip';
vi.mock('server-only',()=>({}));
const mocks=vi.hoisted(()=>({identity:vi.fn(),writer:vi.fn()}));
vi.mock('../lib/voice/server',()=>({...mocks,VoiceError:class extends Error{constructor(message:string,public status=400){super(message)}},failure:(e:{message:string,status?:number})=>Response.json({error:e.message},{status:e.status||503})}));
import {POST} from '../app/api/video-kits/installer/route';
test('personal installer requires purchaser session',async()=>{mocks.identity.mockRejectedValue({status:401,message:'Login required'});expect((await POST(new Request('https://windi.test',{method:'POST'}))).status).toBe(401)});
test('installer binds a private workflow token, with no CLI login step',async()=>{
 mocks.identity.mockResolvedValue({user:{id:'buyer'}});
 const inserted:unknown[]=[];
 const entitlement={id:'e',product_id:'p'},release={version:'0.5.6-beta',sha256:'a'.repeat(64),storage_bucket:'private',storage_path:'release.zip'};
 mocks.writer.mockReturnValue({from:(table:string)=>{const q:any={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,maybeSingle:async()=>({data:table==='product_entitlements'?entitlement:release}),insert:async(v:unknown)=>{inserted.push(v);return {error:null}}};return q},storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:'https://storage.test/signed'}})})}});
 const response=await POST(new Request('https://windi.test/api/video-kits/installer',{method:'POST'}));expect(response.status).toBe(200);
 const zip=await JSZip.loadAsync(await response.arrayBuffer());
 const config=JSON.parse(await zip.file('windi-account.json')!.async('string'));
 expect(config.token).toMatch(/^windi_kit_/);expect(inserted[0]).toMatchObject({user_id:'buyer',purpose:'video_workflow'});
 expect(JSON.stringify(inserted)).not.toContain(config.token);
 const script=await zip.file('Cai Windi.command')!.async('string');expect(script).toContain('shasum -a 256');expect(script).not.toContain('windi login');
});
