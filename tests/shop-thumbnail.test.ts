import { beforeEach, expect, test, vi } from 'vitest';
vi.mock('server-only',()=>({}));
const state=vi.hoisted(()=>({admin:true,upload:vi.fn(),createBucket:vi.fn()}));
vi.mock('@/lib/gemini/server',()=>({privateHeaders:{'Cache-Control':'private, no-store'},requireGeminiAdmin:async()=>{if(!state.admin)throw new Error('Forbidden');},geminiFailure:(e:Error)=>Response.json({error:e.message},{status:400})}));
vi.mock('@/lib/voice/server',()=>({VoiceError:class extends Error{},writer:()=>({storage:{getBucket:async()=>({data:{},error:null}),createBucket:state.createBucket,from:()=>({upload:state.upload,getPublicUrl:()=>({data:{publicUrl:'https://example.com/thumbnail.png'}})})}})}));
import {POST} from '../app/api/gemini/thumbnail/route';
const request=(bytes:Uint8Array,type='image/png')=>{const body=new FormData();body.append('file',new Blob([bytes as BlobPart],{type}),'image.png');return new Request('http://localhost/api/gemini/thumbnail',{method:'POST',body});};
beforeEach(()=>{state.admin=true;state.upload.mockReset().mockResolvedValue({error:null});});
test('thumbnail upload checks admin, actual image signature and size',async()=>{
 state.admin=false;expect((await POST(request(new Uint8Array([1,2,3])))).status).toBe(400);state.admin=true;
 expect((await POST(request(new TextEncoder().encode('<svg onload="alert(1)"/>')))).status).toBe(400);
 expect((await POST(request(new Uint8Array(5*1024*1024+1)))).status).toBe(400);expect(state.upload).not.toHaveBeenCalled();
});
test('raster thumbnail is uploaded with a fresh filename and returned public URL',async()=>{
 const png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
 const response=await POST(request(png));expect(response.status).toBe(200);expect(await response.json()).toEqual({url:'https://example.com/thumbnail.png'});
 expect(state.upload).toHaveBeenCalledWith(expect.stringMatching(/^[a-f0-9-]+\.png$/),expect.any(Buffer),{contentType:'image/png',upsert:false});
});
