import { failure, publicVoices, providerReady } from '@/lib/voice/server';

export async function GET() {
  try {
    const catalog = await publicVoices();
    const seen = new Set<string>();
    const voices = [];
    for (const voice of catalog.voices) {
      if (!seen.has(voice.id)) {
        seen.add(voice.id);
        voices.push(voice);
      }
    }
    return Response.json({ ...catalog, voices, available: providerReady() }, { headers: { 'Cache-Control': 'no-store' } });
  }
  catch(error) { return failure(error); }
}
