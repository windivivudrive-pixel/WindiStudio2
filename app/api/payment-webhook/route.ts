import { processSepayWebhook } from '@/lib/payments/sepay';
import { failure } from '@/lib/voice/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try { return Response.json(await processSepayWebhook(request)); }
  catch (error) { return failure(error); }
}
