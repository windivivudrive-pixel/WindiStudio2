'use client';

import { useActionState } from 'react';
import { RefreshCw } from 'lucide-react';
import { EasyPromptCard, type EasyPrompt } from '@/windi/easy-prompt';
import { RetroButton, RetroWindow } from '@/windi/ui/retro';
import { requestEasyPromptRegeneration } from './actions';

type PromptStatus = 'PENDING' | 'GENERATED' | 'FAILED' | 'STALE';
const labels: Record<PromptStatus, string> = { PENDING: 'Đang chuẩn bị Easy Prompt.', GENERATED: 'Easy Prompt đã sẵn sàng.', FAILED: 'Easy Prompt chưa tạo được.', STALE: 'Nguồn đã đổi; cần tạo lại Easy Prompt.' };

export function EasyPromptAdmin({ resourceId, prompt, status = 'PENDING' }: { resourceId: string; prompt: EasyPrompt | null; status?: PromptStatus }) {
  const [state, action, pending] = useActionState(requestEasyPromptRegeneration, { ok: false, message: '' });
  return <div className="editor-easy-prompt">
    {prompt && status === 'GENERATED' ? <EasyPromptCard prompt={prompt} /> : <RetroWindow title="EASY PROMPT" accent="orange"><p>{labels[status]}</p></RetroWindow>}
    <form action={action} className="easy-prompt-admin-action"><input type="hidden" name="id" value={resourceId} /><RetroButton type="submit" variant="secondary" disabled={pending}><RefreshCw size={15} className={pending ? 'publish-spinner' : ''} />{pending ? 'Đang yêu cầu…' : 'Yêu cầu tạo lại'}</RetroButton><p role="status" aria-live="polite">{state.message || 'Không cần nhập thêm lý do. Batch Easy Prompt sẽ tạo lại từ nguồn chính chủ.'}</p></form>
  </div>;
}
