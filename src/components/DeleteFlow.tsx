import { useCallback, useState } from 'react';
import { useStore, useUi } from '../lib/store';
import type { Transaction } from '../lib/types';
import { Haptics } from '../lib/haptics';
import { ConfirmSheet } from './Overlays';

/**
 * Dime's delete flow: confirm in a bottom card, delete, then a "Tap to Undo" toast.
 * Stopping a future recurring entry asks "Stop Recurring?" instead.
 */
export function useDeleteFlow() {
  const [pending, setPending] = useState<Transaction | null>(null);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const restoreTransaction = useStore((s) => s.restoreTransaction);
  const showToast = useUi((s) => s.showToast);

  const ask = useCallback((t: Transaction) => setPending(t), []);

  const perform = (t: Transaction) => {
    const removed = deleteTransaction(t.id);
    Haptics.success();
    if (removed) {
      showToast({
        title: 'Log Deleted',
        subtitle: 'Tap to Undo',
        icon: 'arrow-undo-circle',
        tone: 'error',
        onTap: () => restoreTransaction(removed),
      });
    }
  };

  const confirm = () => {
    if (!pending) return;
    const target = pending;
    setPending(null);
    perform(target);
  };

  /** Delete straight away (a long swipe), with the same Undo toast but no confirmation card. */
  const remove = useCallback(
    (t: Transaction) => perform(t),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deleteTransaction, restoreTransaction, showToast],
  );

  const element = (
    <ConfirmSheet
      visible={pending !== null}
      title={`Delete '${pending?.note ?? ''}'?`}
      message="This action cannot be undone."
      confirmLabel="Delete"
      onConfirm={confirm}
      onCancel={() => setPending(null)}
    />
  );

  return { ask, remove, element };
}
