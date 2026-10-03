import { voiceTimingBucket } from '@/lib/voice/api';
import { failure, identity, VoiceError, writer } from '@/lib/voice/server';
import { isUUID } from '@/lib/voice/shared';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { user } = await identity();
    const id = new URL(request.url).searchParams.get('id');
    if (!isUUID(id)) throw new VoiceError('File không hợp lệ.');
    const db = writer();
    const { data: job, error } = await db.from('windi_voice_jobs')
      .select('id,status,timing_path').eq('id', id).eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    if (!job || job.status !== 'ready' || !job.timing_path) throw new VoiceError('Không tìm thấy timestamp cho lần tạo giọng này.', 404);
    const downloaded = await db.storage.from(voiceTimingBucket).download(job.timing_path);
    if (downloaded.error) throw downloaded.error;
    return Response.json({ id: job.id, timestamps: JSON.parse(await downloaded.data.text()) }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) { return failure(error); }
}
