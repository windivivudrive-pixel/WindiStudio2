import { createAutomationToken, voiceApiAccess } from '@/lib/voice/api';
import { boundedBody, failure, identity, VoiceError, writer } from '@/lib/voice/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { user } = await identity();
    const [tokens, access] = await Promise.all([
      writer()
      .from('automation_tokens')
      .select('id,name,token_prefix,last_four,created_at,last_used_at,revoked_at')
      .eq('user_id', user.id)
      .eq('purpose', 'voice_api')
      .order('created_at', { ascending: false }),
      voiceApiAccess(user.id),
    ]);
    if (tokens.error) throw tokens.error;
    return Response.json({
      data: tokens.data,
      access,
      can_create: access.hasPaidVoicePlan || access.hasWorkflowLicense,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const { user } = await identity(request);
    const body = await (await boundedBody(request, 10_000)).json() as { name?: unknown };
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 80) throw new VoiceError('Tên token phải có từ 1 đến 80 ký tự.');
    const db = writer();
    const access = await voiceApiAccess(user.id);
    if (!access.hasPaidVoicePlan && !access.hasWorkflowLicense) {
      throw new VoiceError('Cần gói Windi Voice trả phí hoặc giấy phép Windi Video Workflow để tạo token API.', 403);
    }
    const token = createAutomationToken();
    const { data, error } = await db.from('automation_tokens').insert({
      user_id: user.id,
      purpose: 'voice_api',
      name,
      token_prefix: token.prefix,
      token_hash: token.hash,
      last_four: token.lastFour,
    }).select('id,name,token_prefix,last_four,created_at').single();
    if (error) throw error;
    return Response.json({ ...data, token: token.secret }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request) {
  try {
    const { user } = await identity(request);
    const body = await (await boundedBody(request, 10_000)).json() as { id?: unknown };
    if (typeof body.id !== 'string') throw new VoiceError('Thiếu mã token.');
    const { data, error } = await writer().from('automation_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', body.id).eq('user_id', user.id).eq('purpose', 'voice_api').is('revoked_at', null).select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new VoiceError('Không tìm thấy token đang hoạt động.', 404);
    return Response.json({ success: true });
  } catch (error) { return failure(error); }
}
