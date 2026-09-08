'use server';

import { revalidatePath } from 'next/cache';
import { editorialWriter, requireEditor } from '@/lib/editorial';

const resourceIdPattern = /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i;

export type QueuePublishState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  destination: string | null;
};

function adminDestination(raw: FormDataEntryValue | null, notice: string) {
  const requested = typeof raw === 'string' && raw.startsWith('/admin') ? raw : '/admin';
  const url = new URL(requested, 'https://windi.local');
  if (url.origin !== 'https://windi.local' || url.pathname !== '/admin') return `/admin?notice=${notice}`;
  url.searchParams.set('notice', notice);
  return `${url.pathname}${url.search}`;
}

export async function publishFromQueue(_previous: QueuePublishState, form: FormData): Promise<QueuePublishState> {
  try {
    const destination = (notice: string) => adminDestination(form.get('return_to'), notice);
    const { user, allowed } = await requireEditor();
    if (!allowed) return { status: 'error', message: 'Tài khoản này không có quyền xuất bản.', destination: null };

    const id = String(form.get('id') || '');
    const revision = Number(form.get('revision'));
    if (!resourceIdPattern.test(id) || !Number.isSafeInteger(revision) || revision < 0) {
      return { status: 'error', message: 'Không nhận diện được hồ sơ cần duyệt.', destination: null };
    }

    const writer = editorialWriter();
    const { data: resource, error: readError } = await writer
      .from('resources')
      .select('name,tagline,description,long_description,license,slug,type')
      .eq('id', id)
      .maybeSingle();
    if (readError || !resource) return { status: 'error', message: 'Không tìm thấy hồ sơ này trong danh mục.', destination: null };

    const { error: publishError } = await writer.rpc('review_windi_resource', {
      target_id: id,
      actor: user.id,
      expected_revision: revision,
      next_state: 'PUBLISHED',
      content: {
        name: resource.name,
        tagline: resource.tagline || '',
        description: resource.description || '',
        long_description: resource.long_description || '',
        license: resource.license || '',
      },
      review_reason: '',
      source_checked: false,
      content_checked: false,
    });
    if (publishError) {
      console.error('publishFromQueue review_windi_resource error:', publishError);
      return {
        status: 'error',
        message: publishError.code === '40001'
          ? 'Hồ sơ vừa được sửa ở phiên khác. Hãy tải lại rồi thử lại.'
          : (publishError.message || 'Chưa lưu được. Hãy thử lại sau ít phút.'),
        destination: null,
      };
    }

    // The client displays the success state first, then navigates back to a
    // freshly rendered queue. Public paths are invalidated at the same time.
    revalidatePath('/admin');
    revalidatePath(`/admin/resources/${id}`);
    revalidatePath(resource.type === 'STACK' ? `/stack/${resource.slug}` : `/tool/${resource.slug}`);
    revalidatePath('/');
    revalidatePath('/discover');
    return { status: 'success', message: `Đã public ${resource.name}. Đang làm mới hàng đợi…`, destination: destination('published') };
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT') {
      throw err;
    }
    console.error('publishFromQueue error:', err);
    return { status: 'error', message: err?.message || 'Không kết nối được danh mục để xuất bản. Hãy thử lại.', destination: null };
  }
}

export async function rejectFromQueue(_previous: QueuePublishState, form: FormData): Promise<QueuePublishState> {
  try {
    const destination = (notice: string) => adminDestination(form.get('return_to'), notice);
    const { user, allowed } = await requireEditor();
    if (!allowed) return { status: 'error', message: 'Tài khoản này không có quyền biên tập.', destination: null };

    const id = String(form.get('id') || '');
    const revision = Number(form.get('revision'));
    if (!resourceIdPattern.test(id) || !Number.isSafeInteger(revision) || revision < 0) {
      return { status: 'error', message: 'Không nhận diện được hồ sơ cần duyệt.', destination: null };
    }

    const writer = editorialWriter();
    const { data: resource, error: readError } = await writer
      .from('resources')
      .select('name,tagline,description,long_description,license,slug,type')
      .eq('id', id)
      .maybeSingle();
    if (readError || !resource) return { status: 'error', message: 'Không tìm thấy hồ sơ này trong danh mục.', destination: null };

    const { error: rejectError } = await writer.rpc('review_windi_resource', {
      target_id: id,
      actor: user.id,
      expected_revision: revision,
      next_state: 'REJECTED',
      content: {
        name: resource.name,
        tagline: resource.tagline || '',
        description: resource.description || '',
        long_description: resource.long_description || '',
        license: resource.license || '',
      },
      review_reason: 'Editor từ chối qua hàng duyệt nhanh.',
      source_checked: false,
      content_checked: false,
    });
    if (rejectError) {
      console.error('rejectFromQueue review_windi_resource error:', rejectError);
      return {
        status: 'error',
        message: rejectError.code === '40001'
          ? 'Hồ sơ vừa được sửa ở phiên khác. Hãy tải lại rồi thử lại.'
          : (rejectError.message || 'Chưa lưu được. Hãy thử lại sau ít phút.'),
        destination: null,
      };
    }

    revalidatePath('/admin');
    revalidatePath(`/admin/resources/${id}`);
    return { status: 'success', message: `Đã từ chối ${resource.name}. Đang làm mới hàng đợi…`, destination: destination('rejected') };
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT') {
      throw err;
    }
    console.error('rejectFromQueue error:', err);
    return { status: 'error', message: err?.message || 'Không kết nối được danh mục để từ chối. Hãy thử lại.', destination: null };
  }
}
