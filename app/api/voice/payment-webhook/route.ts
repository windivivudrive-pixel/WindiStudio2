// Compatibility endpoint for SePay configurations created before the unified
// Voice + Video Kit webhook. New setups use /api/payment-webhook.
import { POST as unifiedPost } from '../../payment-webhook/route';

export const runtime = 'nodejs';
export async function POST(request: Request) { return unifiedPost(request); }
