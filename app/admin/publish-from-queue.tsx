'use client';

import { useActionState, useEffect } from 'react';
import { CheckCircle2, LoaderCircle, AlertTriangle, Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type QueuePublishState, publishFromQueue, rejectFromQueue } from './quick-actions';

const initialQueueState: QueuePublishState = { status: 'idle', message: '', destination: null };

export function PublishFromQueue({ id, revision, returnTo }: { id: string; revision: number; returnTo: string }) {
  const router = useRouter();
  const [publishState, publishAction, pendingPublish] = useActionState(publishFromQueue, initialQueueState);
  const [rejectState, rejectAction, pendingReject] = useActionState(rejectFromQueue, initialQueueState);

  const isPublishSuccess = publishState.status === 'success';
  const isRejectSuccess = rejectState.status === 'success';
  const isSuccess = isPublishSuccess || isRejectSuccess;

  const isPublishError = publishState.status === 'error';
  const isRejectError = rejectState.status === 'error';
  const isError = isPublishError || isRejectError;

  const activeDestination = publishState.destination || rejectState.destination;

  useEffect(() => {
    if (!isSuccess || !activeDestination) return;
    const timer = window.setTimeout(() => router.replace(activeDestination), 850);
    return () => window.clearTimeout(timer);
  }, [isSuccess, router, activeDestination]);

  const feedback = pendingPublish
    ? 'Đang lưu và public…'
    : pendingReject
    ? 'Đang từ chối…'
    : publishState.message || rejectState.message;

  const isPending = pendingPublish || pendingReject;

  return (
    <div className={`publish-queue-form ${isPending ? 'is-pending' : ''} ${isSuccess ? 'is-success' : ''} ${isError ? 'is-error' : ''}`}>
      <div className="queue-buttons-group">
        <form action={publishAction} className="inline-action-form">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="revision" value={revision} />
          <input type="hidden" name="return_to" value={returnTo} />
          <button
            className="retro-button primary editor-publish"
            type="submit"
            disabled={isPending || isSuccess}
            aria-busy={pendingPublish}
            title="Xuất bản công cụ này ra danh mục công khai"
          >
            {pendingPublish ? (
              <><LoaderCircle className="publish-spinner" size={13} /> Public…</>
            ) : isPublishSuccess ? (
              <><CheckCircle2 size={13} /> Đã public</>
            ) : (
              'Public ngay'
            )}
          </button>
        </form>

        <form action={rejectAction} className="inline-action-form">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="revision" value={revision} />
          <input type="hidden" name="return_to" value={returnTo} />
          <button
            className="retro-button secondary editor-reject-btn"
            type="submit"
            disabled={isPending || isSuccess}
            aria-busy={pendingReject}
            title="Từ chối công cụ để tránh duyệt lại nhiều lần"
          >
            {pendingReject ? (
              <><LoaderCircle className="publish-spinner" size={13} /> Từ chối…</>
            ) : isRejectSuccess ? (
              <><Check size={13} /> Đã từ chối</>
            ) : (
              <>Từ chối</>
            )}
          </button>
        </form>
      </div>

      {feedback && (
        <span className="publish-feedback" role="status" aria-live="polite">
          {isError && <AlertTriangle size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3, color: 'var(--pink)' }} />}
          {feedback}
        </span>
      )}
    </div>
  );
}
