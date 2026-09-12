import { failure, identity, paymentConfig, VoiceError, writer } from '@/lib/voice/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { user } = await identity(request);
    const bank = paymentConfig();
    if (!bank) throw new VoiceError('Thanh toán chưa được cấu hình.', 503);
    const { data, error } = await writer().rpc('windi_video_kit_order', { p_user: user.id });
    if (error) throw error;
    return Response.json({ order: data, bank }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
