import { failure, identity } from '@/lib/voice/server';
import { adminVoicePage, providerVoice, requireVoiceAdmin } from '@/lib/voice/admin';

export async function GET(request:Request) {
  try {
    const {user}=await identity();
    await requireVoiceAdmin(user.id);
    const params=new URL(request.url).searchParams;
    if(params.has('voice')) return Response.json({voice:await providerVoice(params.get('voice')!)},{headers:{'Cache-Control':'no-store'}});
    if(params.get('view')==='voices') return Response.json(await adminVoicePage(params.get('cursor')||undefined),{headers:{'Cache-Control':'no-store'}});
    return Response.json({error:'Không tìm thấy tài nguyên quản trị.'},{status:404,headers:{'Cache-Control':'no-store'}});
  } catch(error) {return failure(error);}
}
