import { automationIdentity, voiceTimingBucket } from '@/lib/voice/api';
import { failure, VoiceError, writer } from '@/lib/voice/server';

export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const identity = await automationIdentity(request);
    const { id } = await context.params;
    const db = writer();
    const { data: job, error } = await db
      .from('windi_voice_jobs')
      .select('id,status,voice_name,credits,created_at,timing_path')
      .eq('id', id)
      .eq('user_id', identity.userId)
      .maybeSingle();
    if (error) throw error;
    if (!job) throw new VoiceError('Không tìm thấy lần tạo giọng này.', 404);
    let timestamps = null;
    if (new URL(request.url).searchParams.get('include') === 'timestamps' && job.status === 'ready' && job.timing_path) {
      const downloaded = await db.storage.from(voiceTimingBucket).download(job.timing_path);
      if (downloaded.error) throw downloaded.error;
      timestamps = JSON.parse(await downloaded.data.text());
    }
    return Response.json({
      ...job,
      timestamps,
      audio_url: job.status === 'ready' ? `/api/v1/voice/generations/${job.id}/audio` : null,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
