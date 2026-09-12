import { automationIdentity } from '@/lib/voice/api';
import { audioUrl, failure } from '@/lib/voice/server';

export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const identity = await automationIdentity(request);
    const { id } = await context.params;
    return Response.redirect(await audioUrl(identity.userId, id, true), 307);
  } catch (error) { return failure(error); }
}
