import { createClient } from '@/lib/supabase/server';
import { getPublishedResource } from '@/lib/catalog-repository';
import { facebookPost } from '@/lib/tool-editorial';

export async function GET(request: Request) {
  const headers={'Cache-Control':'private, no-store'};
  try {
    const client=await createClient();
    const {data:{user},error}=await client.auth.getUser();
    const allowed=!error&&!!user?.email_confirmed_at&&user?.email?.toLowerCase()==='quochungdn151@gmail.com';
    if(!allowed)return Response.json({allowed:false},{status:403,headers});
    const url=new URL(request.url);
    const slug=url.searchParams.get('slug');
    if(!slug)return Response.json({allowed:true},{headers});
    const {resource}=await getPublishedResource(slug);
    if(!resource)return Response.json({error:'Không tìm thấy tool đã xuất bản.'},{status:404,headers});
    const origin=process.env.NEXT_PUBLIC_SITE_URL || 'https://windistudio.app';
    return Response.json({allowed:true,text:facebookPost(resource,origin)},{headers});
  } catch {return Response.json({error:'Chưa tạo được bài Facebook.'},{status:503,headers});}
}
