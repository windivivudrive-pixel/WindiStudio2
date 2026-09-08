'use client';

import { useActionState, useRef, useState } from 'react';
import { reviewResource } from './actions';
import { type CreatorBrief, popularityLabel } from '@/lib/creator-catalog';
import type { ScoreBreakdown } from '@/lib/windi-data';

export function ReviewForm({
  resource,
  brief,
  scores,
}: {
  resource: {
    id: string;
    name: string;
    tagline: string | null;
    description: string | null;
    long_description: string | null;
    license: string | null;
    canonical_url?: string;
    editorial_revision: number;
    status: string;
    is_editor_pick?: boolean;
    is_official?: boolean;
  };
  brief?: CreatorBrief | null;
  scores?: (ScoreBreakdown & { editor_override_reason?: string | null }) | null;
}) {
  const [state, action, pending] = useActionState(reviewResource, { message: '', ok: false });
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  const copySocial = async () => {
    const fields = new FormData(formRef.current!);
    const text = [
      fields.get('tagline'),
      fields.get('description'),
      fields.get('long_description'),
      brief
        ? `GitHub: ${popularityLabel(brief)} (ghi nhận ${new Date(brief.github.observedAt).toLocaleDateString('vi-VN')}). Sao không phải số người dùng.`
        : '',
      `Giấy phép: ${fields.get('license') || 'Chưa xác nhận điều kiện sử dụng.'}`,
      `Nguồn chính chủ: ${brief?.github.url || resource.canonical_url || ''}`,
      brief ? `README đối chiếu: ${brief.readme.url}` : '',
      ...(brief?.extraSources || []).map((url) => `Tài liệu thêm: ${url}`),
      'Biên tập từ tài liệu tác giả, chưa phải đánh giá sau khi Windi cài chạy. Ví dụ là gợi ý ứng dụng; chưa xác minh thứ hạng Trending hiện tại.',
    ]
      .filter(Boolean)
      .join('\n\n');
    setDraft(text);
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('Đã sao chép bản nháp. Kiểm tra lại số liệu và nội dung trước khi đăng.');
    } catch {
      setCopyStatus('Không truy cập được clipboard. Bạn có thể sao chép bản nháp bên dưới.');
    }
  };

  return (
    <form ref={formRef} action={action} className="retro-form">
      <input type="hidden" name="id" value={resource.id} />
      <input type="hidden" name="revision" value={resource.editorial_revision} />

      <div className="social-draft-tools">
        <button type="button" className="retro-button" onClick={copySocial}>
          Sao chép bài social
        </button>
        <p className="small-copy">
          Dùng nội dung đang có trong form, kể cả phần bạn vừa sửa. Không tự đăng lên mạng xã hội.
        </p>
        <p role="status">{copyStatus}</p>
        {draft && (
          <details open>
            <summary>Bản nháp để đăng social</summary>
            <textarea readOnly aria-label="Bản nháp bài social" value={draft} />
          </details>
        )}
      </div>

      <label>
        Tên công cụ
        <input required name="name" maxLength={300} defaultValue={resource.name} />
      </label>

      <label>
        Mô tả một dòng
        <input name="tagline" maxLength={240} defaultValue={resource.tagline || ''} />
      </label>

      <label>
        Công cụ này giúp gì?
        <textarea
          name="description"
          maxLength={12000}
          defaultValue={resource.description || ''}
          placeholder="Viết ngắn gọn bằng tiếng Việt để người mới hiểu ngay công cụ này làm gì."
        />
      </label>

      <label>
        Dùng khi nào · bắt đầu thế nào · cần lưu ý gì?
        <textarea
          className="editor-long-copy"
          name="long_description"
          maxLength={30000}
          defaultValue={resource.long_description || ''}
          placeholder="Có thể bổ sung ví dụ thực tế và hướng dẫn bắt đầu khi bạn muốn. Không bắt buộc để xuất bản."
        />
      </label>

      <label>
        Giấy phép / điều kiện sử dụng
        <input
          name="license"
          maxLength={200}
          defaultValue={resource.license || ''}
          placeholder="Nếu nguồn có nêu, ghi lại tại đây. Không bắt buộc để xuất bản."
        />
      </label>

      {/* Editorial Flags */}
      <fieldset style={{ border: '1.5px solid var(--border)', borderRadius: '9px', padding: '12px', background: 'var(--surface-2)' }}>
        <legend style={{ font: '800 11px var(--font-geist-mono)', padding: '0 6px' }}>HUY HIỆU BIÊN TẬP (EDITORIAL FLAGS)</legend>
        <div style={{ display: 'grid', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              name="is_editor_pick"
              defaultChecked={Boolean(resource.is_editor_pick)}
            />
            <span>✦ <strong>Editor&apos;s Pick</strong> (Đánh dấu hiển thị tại mục Editor Picks / Spotlight trang chủ)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              name="is_official"
              defaultChecked={Boolean(resource.is_official)}
            />
            <span>✓ <strong>Official Tool</strong> (Công cụ chính thức từ công ty/tổ chức phát hành)</span>
          </label>
        </div>
      </fieldset>

      {/* Windi Score Breakdown Editor */}
      <fieldset style={{ border: '1.5px solid var(--border)', borderRadius: '9px', padding: '12px', background: 'var(--surface-2)' }}>
        <legend style={{ font: '800 11px var(--font-geist-mono)', padding: '0 6px' }}>CHẤM ĐIỂM WINDI SCORE (4 TIÊU CHÍ · TỔNG 100 ĐIỂM)</legend>
        <p className="small-copy" style={{ margin: '0 0 10px' }}>
          Tối ưu cho người dùng phổ thông & thực chiến. Các open-source đã có giấy phép chuẩn Apache/MIT, tập trung vào 4 tiêu chí cốt lõi:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          <label>
            1. Tính thực dụng & hiệu quả (0 - 50 điểm)
            <input
              type="number"
              name="score_utility"
              min={0}
              max={50}
              defaultValue={scores?.utility ?? ''}
              placeholder="0 - 50"
            />
          </label>
          <label>
            2. Cài đặt dễ dàng (0 - 10 điểm)
            <input
              type="number"
              name="score_setup"
              min={0}
              max={10}
              defaultValue={scores?.setup ?? ''}
              placeholder="0 - 10"
            />
          </label>
          <label>
            3. Độc đáo & sáng tạo (0 - 20 điểm)
            <input
              type="number"
              name="score_originality"
              min={0}
              max={20}
              defaultValue={scores?.originality ?? ''}
              placeholder="0 - 20"
            />
          </label>
          <label>
            4. Mức độ đón nhận (0 - 20 điểm)
            <input
              type="number"
              name="score_adoption"
              min={0}
              max={20}
              defaultValue={scores?.adoption ?? ''}
              placeholder="0 - 20"
            />
          </label>
        </div>

        <label style={{ marginTop: '10px' }}>
          Ghi chú biên tập về điểm số (Lý do override hoặc nhận xét)
          <input
            name="editor_override_reason"
            maxLength={300}
            defaultValue={scores?.editor_override_reason || ''}
            placeholder="Ghi chú thêm về điểm số..."
          />
        </label>
      </fieldset>

      <label>
        Trạng thái
        <select
          name="status"
          defaultValue={resource.status === 'CANDIDATE' ? 'REVIEW' : resource.status}
        >
          {[
            ['REVIEW', 'Lưu để tiếp tục duyệt'],
            ['PUBLISHED', 'Xuất bản công khai'],
            ['REJECTED', 'Từ chối'],
            ['ARCHIVED', 'Ẩn / lưu trữ'],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <p role="status" aria-live="polite">
        {state.message}
      </p>
      <button className="retro-button primary" disabled={pending}>
        {pending ? 'Đang lưu…' : 'Lưu quyết định'}
      </button>
    </form>
  );
}
