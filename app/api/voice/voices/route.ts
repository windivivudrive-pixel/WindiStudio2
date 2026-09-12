import { failure, publicVoices, providerReady } from '@/lib/voice/server';
import { COMPARISON_VOICES } from '@/lib/voice/shared';

export async function GET() {
  try {
    const catalog = await publicVoices();
    const seen = new Set<string>();
    const voices = [];
    for (const voice of [...COMPARISON_VOICES, ...catalog.voices]) {
      if (!seen.has(voice.id)) {
        seen.add(voice.id);
        voices.push(voice);
      }
    }
    return Response.json({ ...catalog, voices, available: providerReady() }, { headers: { 'Cache-Control': 'no-store' } });
  }
  catch(error) { return failure(error); }
}
