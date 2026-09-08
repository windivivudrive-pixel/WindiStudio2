import { failure, publicVoices, providerReady } from '@/lib/voice/server';
export async function GET() {
  try { return Response.json({...await publicVoices(),available:providerReady()},{headers:{'Cache-Control':'no-store'}}); }
  catch(error) { return failure(error); }
}
