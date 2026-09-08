'use client';

import { useActionState, useRef, useEffect } from 'react';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { submitResourceAction, type SubmitResult } from '@/app/submit/actions';
import { RetroButton } from './ui/retro';

export function SubmitForm() {
  const [state, formAction, isPending] = useActionState<SubmitResult | null, FormData>(
    submitResourceAction,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && formRef.current) {
      formRef.current.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="retro-form">
      <label>
        URL canonical của tool
        <input
          required
          name="url"
          type="url"
          placeholder="https://github.com/owner/repository hoặc https://..."
        />
        <small className="small-copy" style={{ marginTop: 2 }}>
          Link GitHub repo, trang chủ hoặc tài liệu chính thức của công cụ.
        </small>
      </label>

      <label>
        Loại resource
        <select name="type" defaultValue="SKILL">
          <option value="SKILL">SKILL (Hướng dẫn / Quy tắc cho Coding Agent)</option>
          <option value="MCP">MCP SERVER (Model Context Protocol)</option>
          <option value="OPEN_SOURCE">OPEN SOURCE (Dự án mã nguồn mở)</option>
          <option value="WORKFLOW">WORKFLOW (Quy trình mẫu tự động hóa)</option>
        </select>
      </label>

      <label>
        Lý do nên có trong Windi Studio
        <textarea
          name="reason"
          required
          rows={4}
          placeholder="Tool này giải quyết vấn đề gì, bạn hay cộng đồng dùng nó hiệu quả thế nào?"
        />
      </label>

      <label>
        Vai trò của bạn với project
        <select name="relationship" defaultValue="User">
          <option value="User">User / Người trải nghiệm thực tế</option>
          <option value="Creator">Creator / Tác giả chính thức</option>
          <option value="Contributor">Contributor / Người đóng góp code</option>
          <option value="Other">Khác</option>
        </select>
      </label>

      {state && (
        <div
          className={`editor-notice ${state.ok ? 'is-success' : ''}`}
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 8,
            border: '2px solid var(--border)',
            background: state.ok
              ? 'color-mix(in srgb, var(--green) 20%, var(--surface-2))'
              : 'color-mix(in srgb, var(--pink) 20%, var(--surface-2))',
            fontSize: 13,
            fontWeight: 650,
          }}
        >
          {state.ok ? (
            <CheckCircle2 size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
          ) : (
            <AlertCircle size={18} style={{ color: 'var(--pink)', flexShrink: 0 }} />
          )}
          <span>{state.message}</span>
        </div>
      )}

      <RetroButton disabled={isPending} type="submit" className="primary">
        <Send size={16} /> {isPending ? 'Đang kiểm tra & lưu vào hàng đợi...' : 'Gửi để biên tập review'}
      </RetroButton>
    </form>
  );
}
