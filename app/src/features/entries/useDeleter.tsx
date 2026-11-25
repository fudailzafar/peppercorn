import { useCallback, useMemo, useState } from 'react';
import type { Entry } from '@/domain/model';
import { haptics } from '@/lib/haptics';
import { messages, store } from '@/state/app';
import { Confirm } from '@/ui/Confirm';

export interface Deleter {
  /** After asking. */
  ask: (entry: Entry) => void;
  /** At once, with Undo. */
  now: (entry: Entry) => void;
}

/** Deleting entries from a list. `question` goes at the end of the screen. */
export function useDeleter() {
  const [asked, setAsked] = useState<Entry | null>(null);
  const now = useCallback((entry: Entry) => {
    const gone = store.remove(entry.id);
    if (!gone) return;
    haptics.done();
    messages.show('Entry deleted', { undo: () => store.putBack(gone) });
  }, []);
  const deleter = useMemo<Deleter>(() => ({ ask: setAsked, now }), [now]);
  const question = (
    <Confirm
      visible={asked !== null}
      title={`Delete “${asked?.note ?? ''}” entry?`}
      message="You can undo this right after deleting."
      onCancel={() => setAsked(null)}
      onConfirm={() => {
        if (asked) now(asked);
        setAsked(null);
      }}
    />
  );
  return { deleter, question };
}
