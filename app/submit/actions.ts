'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { editorialWriter } from '@/lib/editorial';

export type SubmitResult = {
  ok: boolean;
  message: string;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 60);
}

export async function submitResourceAction(
  _prevState: SubmitResult | null,
  formData: FormData
): Promise<SubmitResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        ok: false,
        message: 'Vui lòng đăng nhập tài khoản Google trước khi gửi công cụ.',
      };
    }

    const rawUrl = String(formData.get('url') || '').trim();
    const type = String(formData.get('type') || 'SKILL').toUpperCase();
    const relationship = String(formData.get('relationship') || 'User').trim();
    const reason = String(formData.get('reason') || '').trim();

    if (!rawUrl || (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://'))) {
      return {
        ok: false,
        message: 'URL công cụ không hợp lệ. Vui lòng nhập link đầy đủ (ví dụ: https://github.com/...).',
      };
    }

    const validTypes = ['SKILL', 'MCP', 'OPEN_SOURCE', 'WORKFLOW'];
    if (!validTypes.includes(type)) {
      return {
        ok: false,
        message: 'Loại công cụ không hợp lệ.',
      };
    }

    if (reason.length < 10) {
      return {
        ok: false,
        message: 'Vui lòng nhập lý do tối thiểu 10 ký tự để ban biên tập hiểu công cụ giải quyết vấn đề gì.',
      };
    }

    // Extract repository / owner / name if GitHub URL
    let derivedName = '';
    let ownerName = '';
    const githubMatch = rawUrl.match(/github\.com\/([^/]+)\/([^/?#]+)/i);
    if (githubMatch) {
      ownerName = githubMatch[1];
      derivedName = githubMatch[2].replace(/\.git$/i, '');
    } else {
      try {
        const parsed = new URL(rawUrl);
        const segments = parsed.pathname.split('/').filter(Boolean);
        derivedName = segments[segments.length - 1] || parsed.hostname.replace('www.', '');
      } catch {
        derivedName = 'Tool Đề Xuất';
      }
    }

    const cleanName = derivedName
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const baseSlug = slugify(derivedName) || `tool-${Date.now().toString(36)}`;
    const writer = editorialWriter();

    // Check if canonical_url already exists
    const { data: existingUrl } = await writer
      .from('resources')
      .select('id, name, status, slug')
      .eq('canonical_url', rawUrl)
      .maybeSingle();

    if (existingUrl) {
      return {
        ok: false,
        message: `Công cụ này (${existingUrl.name}) đã có trong danh mục hoặc đang chờ duyệt (trạng thái: ${existingUrl.status}).`,
      };
    }

    // Ensure unique slug
    let candidateSlug = baseSlug;
    const { data: existingSlug } = await writer
      .from('resources')
      .select('id')
      .eq('slug', candidateSlug)
      .maybeSingle();

    if (existingSlug) {
      candidateSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const importMetadata = {
      submission: {
        submitter_id: user.id,
        submitter_email: user.email,
        relationship,
        reason,
        submitted_at: new Date().toISOString(),
      },
    };

    // Insert into public.resources as CANDIDATE
    const { data: insertedResource, error: insertError } = await writer
      .from('resources')
      .insert({
        name: cleanName,
        slug: candidateSlug,
        type,
        status: 'CANDIDATE',
        canonical_url: rawUrl,
        repository_url: rawUrl.includes('github.com') ? rawUrl : null,
        owner_name: ownerName || null,
        tagline: reason.slice(0, 120),
        description: reason,
        created_by: user.id,
        import_metadata: importMetadata,
      })
      .select('id, name, slug')
      .single();

    if (insertError) {
      console.error('Error inserting candidate resource:', insertError);
      return {
        ok: false,
        message: `Không thể lưu hồ sơ: ${insertError.message}`,
      };
    }

    // Attach source to resource_sources for editorial source verification
    try {
      await writer.from('resource_sources').insert({
        resource_id: insertedResource.id,
        source_type: rawUrl.includes('github.com') ? 'github' : 'manual',
        source_identifier: rawUrl,
        source_url: rawUrl,
        raw_metadata: {
          submitted_by: user.email,
          relationship,
        },
      });
    } catch {
      // Non-blocking if source insert fails
    }

    revalidatePath('/admin');
    revalidatePath('/submit');

    return {
      ok: true,
      message: `Đã gửi công cụ "${cleanName}" thành công! Hồ sơ đã được đưa vào hàng đợi kiểm duyệt Windi.`,
    };
  } catch (error) {
    console.error('Submit action error:', error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Có lỗi xảy ra trong quá trình gửi.',
    };
  }
}
