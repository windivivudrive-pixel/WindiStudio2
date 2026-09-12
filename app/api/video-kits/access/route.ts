import { productTokenIdentity } from '@/lib/products/license';
import { failure } from '@/lib/voice/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const owner = await productTokenIdentity(request);
    return Response.json({ active: true, entitlementId: owner.entitlementId, accessMode: 'account' },
      { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
