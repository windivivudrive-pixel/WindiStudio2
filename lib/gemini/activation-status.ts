export type ActivationHistoryTask = { requestId: string; status: string };

export function canSubmitActivation(requestId: string, taskStatus: string | undefined, codeState: string, retryState: string): boolean {
  return requestId
    ? (taskStatus === 'Failed' || taskStatus === 'Cancelled') && retryState === 'ready'
    : codeState === 'ready';
}

export function resolveActivationStatus<T extends ActivationHistoryTask>(
  tasks: T[],
  balance: { remainingUses: number; plan: string; cardStatus?: string },
  expectedPlan: string,
): { kind: 'task'; task: T } | { kind: 'ready' | 'unavailable' | 'unknown' } {
  const active = tasks.find(task => ['Submitting', 'Pending', 'Running', 'Uncertain'].includes(task.status));
  if (active) return { kind: 'task', task: active };
  if (!Number.isInteger(balance.remainingUses) || balance.remainingUses < 0 || balance.plan !== expectedPlan) return { kind: 'unknown' };
  const status = balance.cardStatus?.toLowerCase();
  if (balance.remainingUses === 0 && (!status || ['active', 'valid', 'depleted'].includes(status))) {
    const successful = tasks.find(task => task.status === 'Success');
    return successful ? { kind: 'task', task: successful } : { kind: 'unavailable' };
  }
  if (balance.remainingUses > 0 && (!status || ['active', 'valid'].includes(status))) return { kind: 'ready' };
  return { kind: 'unknown' };
}
