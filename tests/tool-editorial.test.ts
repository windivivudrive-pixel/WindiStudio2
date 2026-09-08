import {beforeEach,expect,test,vi} from 'vitest';
import {facebookPost,simpleToolPrompt,toolIntroduction} from '../lib/tool-editorial';
import {resources} from '../lib/windi-data';
const auth=vi.hoisted(()=>({getUser:vi.fn(),getPublishedResource:vi.fn()}));
vi.mock('../lib/supabase/server',()=>({createClient:async()=>({auth:{getUser:auth.getUser}})}));
vi.mock('../lib/catalog-repository',()=>({getPublishedResource:auth.getPublishedResource}));
import {GET} from '../app/api/editor/social-copy/route';
const resource={...resources[0],purposes:['design','content'],description:'Tạo bố cục từ yêu cầu của bạn.'};
beforeEach(()=>{vi.resetAllMocks();auth.getPublishedResource.mockResolvedValue({resource});});
test('social post contains the actual tool link and topical tags, without invented popularity',()=>{
 const post=facebookPost(resource,'https://windistudio.app');
 expect(post).toContain(`/tool/${resource.slug}?utm_source=facebook`);
 expect(post).toContain('#ThietKe #SangTaoNoiDung');
 expect(post).toContain(resource.description);
 expect(post).not.toContain('15K');
 expect(toolIntroduction(resource).summary).toBe(resource.description);
 expect(simpleToolPrompt(resource)).toContain('Bảo mật dữ liệu:');
});
test.each([null,{email:'other@example.com',email_confirmed_at:'2026-01-01'},{email:'quochungdn151@gmail.com'},{email:'other@example.com',email_confirmed_at:'2026-01-01',user_metadata:{email:'quochungdn151@gmail.com'}}])('non-owner or unverified account cannot export',async(user)=>{
 auth.getUser.mockResolvedValue({data:{user},error:null});
 expect((await GET(new Request('https://windistudio.app/api/editor/social-copy?slug=test'))).status).toBe(403);
 expect(auth.getPublishedResource).not.toHaveBeenCalled();
});
test('verified owner can export published tools and missing tools return 404',async()=>{
 auth.getUser.mockResolvedValue({data:{user:{email:'quochungdn151@gmail.com',email_confirmed_at:'2026-01-01'}},error:null});
 const request=new Request(`https://windistudio.app/api/editor/social-copy?slug=${resource.slug}`);
 const response=await GET(request);
 expect(response.status).toBe(200);
 expect(response.headers.get('Cache-Control')).toContain('no-store');
 expect((await response.json()).text).toContain('#WindiStudio');
 auth.getPublishedResource.mockResolvedValue({resource:null});
 expect((await GET(request)).status).toBe(404);
});
