import { adminVoicePage, isVoiceAdmin } from '@/lib/voice/admin';
import { automationIdentity } from '@/lib/voice/api';
import { failure, publicVoices, writer } from '@/lib/voice/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const identity = await automationIdentity(request);
    if(await isVoiceAdmin(identity.userId)) {
      const page=await adminVoicePage(new URL(request.url).searchParams.get('cursor')||undefined);
      return Response.json({data:page.voices,has_more:page.hasMore,next_page:page.nextPage},{headers:{'Cache-Control':'no-store'}});
    }
    const [library, clones] = await Promise.all([
      publicVoices(),
      writer().from('windi_voice_clones').select('provider_id,name,language').eq('user_id', identity.userId).eq('status', 'ready'),
    ]);
    if (clones.error) throw clones.error;
    return Response.json({
      data: [
        ...library.voices,
        ...(clones.data ?? []).map((voice) => ({ id: voice.provider_id, name: voice.name, language: voice.language, kind: 'clone' })),
      ],
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
