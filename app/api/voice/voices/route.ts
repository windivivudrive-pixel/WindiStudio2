import { failure, providerReady } from '@/lib/voice/server';
import { CURATED_PUBLIC_VOICES, isHeyGenLibraryVoice } from '@/lib/voice/shared';

export async function GET() {
  try {
    const seen = new Set<string>();
    const voices = [];
    for (const voice of CURATED_PUBLIC_VOICES) {
      if (isHeyGenLibraryVoice(voice) && !seen.has(voice.id)) {
        seen.add(voice.id);
        voices.push(voice);
      }
    }
    return Response.json({ source: 'curated', voices, available: providerReady() }, { headers: { 'Cache-Control': 'no-store' } });
  }
  catch(error) { return failure(error); }
}
