import { automationIdentity, createVoiceGeneration, requireIdempotencyKey, validateVoiceApiInput } from '@/lib/voice/api';
import { boundedBody, failure } from '@/lib/voice/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const identity = await automationIdentity(request);
    const key = requireIdempotencyKey(request);
    const input = validateVoiceApiInput(await (await boundedBody(request)).json());
    const job = await createVoiceGeneration(identity, input, key);
    return Response.json({
      id: job.id,
      status: job.status,
      audio_url: job.status === 'ready' ? `/api/v1/voice/generations/${job.id}/audio` : null,
      timestamps_url: job.status === 'ready' ? `/api/v1/voice/generations/${job.id}?include=timestamps` : null,
    }, { status: job.status === 'ready' ? 201 : 202, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
