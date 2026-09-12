import { failure, identity, VoiceError, writer } from '@/lib/voice/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { user } = await identity();
    const db = writer();
    const { data: entitlement, error } = await db.from('product_entitlements').select('id,product_id').eq('user_id', user.id).eq('kind', 'video_workflow_v1').eq('status', 'active').maybeSingle();
    if (error) throw error;
    if (!entitlement) throw new VoiceError('Tài khoản chưa có giấy phép Windi Video Workflow.', 403);
    const { data: release, error: releaseError } = await db.from('product_releases').select('*').eq('product_id', entitlement.product_id).eq('is_published', true).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (releaseError) throw releaseError;
    if (!release) throw new VoiceError('Bản cài đặt chưa sẵn sàng để tải.', 503);
    const { data: signed, error: signError } = await db.storage.from(release.storage_bucket).createSignedUrl(release.storage_path, 120, { download: `Windi-Video-Workflow-${release.version}.zip` });
    if (signError) throw signError;
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip');
    const audit = await db.from('product_download_audit').insert({ entitlement_id: entitlement.id, release_id: release.id, user_id: user.id, ip_address: forwarded || null });
    if (audit.error) throw audit.error;
    return Response.redirect(signed.signedUrl, 307);
  } catch (error) { return failure(error); }
}
