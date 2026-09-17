import {test,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
vi.mock('server-only',()=>({}));
const mocks=vi.hoisted(()=>({identity:vi.fn(),writer:vi.fn()}));
vi.mock('../lib/voice/server',()=>({...mocks,VoiceError:class extends Error{constructor(message:string,public status=400){super(message)}},failure:(e:{message:string,status?:number})=>Response.json({error:e.message},{status:e.status||503})}));
import {POST} from '../app/api/video-kits/installer/route';
const root='Windi Connect Installer.app/Contents/Resources/windi-connect';
async function setup(badChecksum=false,owned=true){
 const zip=new JSZip();
 for(const file of ['scripts/install.mjs','scripts/bootstrap.ps1','scripts/bootstrap.sh'])zip.file(root+'/'+file,'release source');
 zip.file(root+'/package.json',JSON.stringify({version:'0.5.10'}));
 zip.file('Windi Connect Extension/manifest.json',JSON.stringify({version:'0.5.10'}));
 zip.file('Windi Connect Extension/background.js','extension source');
 const bytes=await zip.generateAsync({type:'nodebuffer'});
 const release={version:'0.5.10',sha256:badChecksum?'0'.repeat(64):createHash('sha256').update(bytes).digest('hex'),size_bytes:bytes.length,storage_bucket:'private',storage_path:'rev3.zip'};
 const insert=vi.fn(async()=>({error:null}));
 const download=vi.fn(async()=>({data:new Blob([bytes]),error:null}));
 mocks.identity.mockResolvedValue({user:{id:'buyer'}});
 mocks.writer.mockReturnValue({from:()=>{const q:any={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:owned?{id:'e',product_id:'p'}:null}),then:(resolve:any)=>Promise.resolve({data:[release]}).then(resolve),insert};return q},storage:{from:()=>({download})}});
 return {insert,download};
}
const request=()=>new Request('https://windi.test/api/video-kits/installer',{method:'POST'});
test('requires purchaser session',async()=>{
 mocks.identity.mockRejectedValue({status:401,message:'Login required'});
 expect((await POST(request())).status).toBe(401);
});
test('rejects accounts without entitlement before downloading',async()=>{
 const {download,insert}=await setup(false,false);
 expect((await POST(request())).status).toBe(403);
 expect(download).not.toHaveBeenCalled();expect(insert).not.toHaveBeenCalled();
});
test('delivers full release and account connection at the installer read path',async()=>{
 const {insert}=await setup();
 const response=await POST(request());expect(response.status).toBe(200);
 expect(response.headers.get('Content-Disposition')).toContain('Windi-Video-Workflow-v0.5.10-universal.zip');
 const zip=await JSZip.loadAsync(await response.arrayBuffer());
 expect(await zip.file('Windi Connect Extension/background.js')!.async('string')).toBe('extension source');
 expect(await zip.file(root+'/scripts/install.mjs')!.async('string')).toBe('release source');
 const config=JSON.parse(await zip.file(root+'/windi-account.json')!.async('string'));
 expect(config.token).toMatch(/^windi_kit_/);expect(config.apiUrl).toBe('https://windi.test');
 expect(JSON.stringify(insert.mock.calls)).not.toContain(config.token);
 const cmd=await zip.file('Cai Windi Windows.cmd')!.async('string');
 expect(cmd).toContain('%~dp0Windi Connect Installer.app');
 expect(cmd).not.toContain('Invoke-WebRequest');
 const guide=await zip.file('HUONG-DAN.txt')!.async('string');
 expect(guide).toContain('BƯỚC 3');
 expect(guide).toContain('https://windistudio.app/video-kits/huong-dan');
 expect(guide).toContain('Không chia sẻ');
 expect(guide).not.toContain('windi setup');
 expect(Object.keys(zip.files).filter(name=>/HUONG-DAN.*\.html$/i.test(name))).toEqual([]);
 expect(zip.file('Cai Windi.command')!.unixPermissions).toBe(0o100755);
 const installer=readFileSync('tools/windi-connect/scripts/install.mjs','utf8');
 expect(installer).toContain("path.join(root,'windi-account.json')");
});
test('checksum mismatch never issues an account token',async()=>{
 const {insert}=await setup(true);
 expect((await POST(request())).status).toBe(503);
 expect(insert).not.toHaveBeenCalled();
});
