import { completeVoiceGeneration } from '@/lib/voice/api';
import { boundedBody, audioUrl, failure, identity, providerReady, resolveVoice, VoiceError, writer } from '@/lib/voice/server';
import { validateSpeech } from '@/lib/voice/shared';

export const runtime = 'nodejs';
export const maxDuration = 120;

async function result(userId: string, job: { id: string; timing_path?: string | null }) {
  return Response.json({
    id: job.id,
    url: await audioUrl(userId, job.id),
    timestamps_url: job.timing_path ? `/api/voice/timestamps?id=${job.id}` : null,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  try {
    const { user } = await identity(request);
    if (!providerReady()) throw new VoiceError('Windi Clone Pro 2.1 chưa được kết nối.', 503);
    if (Number(request.headers.get('content-length')) > 100000) throw new VoiceError('Nội dung quá dài.', 413);
    const input = validateSpeech(await (await boundedBody(request)).json());
    const voice = await resolveVoice(user.id, input.voiceId);
    const db = writer();
    const { data: job, error } = await db.rpc('windi_voice_reserve', {
      p_user: user.id, p_key: input.requestKey, p_voice: voice.id, p_name: voice.name,
      p_text: input.text, p_language: input.language, p_speed: input.speed,
    });
    if (error) throw error;
    if (job.status === 'ready') return await result(user.id, job);
    // Atomic claim prevents retries from generating audio or charging twice.
    const claim = await db.from('windi_voice_jobs').update({ status: 'pending' })
      .eq('id', job.id).eq('status', 'reserved').select('id').maybeSingle();
    if (claim.error) throw claim.error;
    if (!claim.data) throw new VoiceError('Yêu cầu này đã được tiếp nhận. Kiểm tra Lịch sử trước khi tạo lại.', 409);
    const completed = await completeVoiceGeneration(user.id, input, { id: job.id, voice_id: voice.id });
    return await result(user.id, completed);
  } catch (error) { return failure(error); }
}
