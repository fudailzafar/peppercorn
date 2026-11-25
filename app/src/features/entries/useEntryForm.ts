import { useEffect, useRef, useState } from 'react';
import { ASSETS, assetOf } from '@/domain/assets';
import { toDay } from '@/domain/dates';
import { buying, draftOf, finished, needsPrice, newDraft, priceHint, problemWith, withCategory, withPast, withSuggestion, type DraftProblem, type EntryDraft } from '@/domain/draft';
import { choices, noteSuggestions } from '@/domain/entries';
import type { Key } from '@/domain/keypad';
import type { Entry } from '@/domain/model';
import { haptics } from '@/lib/haptics';
import { messages, prices, store } from '@/state/app';
import { useData, useNow } from '@/state/hooks';

const SAID: Record<DraftProblem, string> = {
  amountAndCategory: 'Enter an amount and choose a category',
  amount: 'Enter an amount',
  grams: 'Enter the grams',
  category: 'Choose a category',
  price: 'Couldn’t get the price. Check your connection and try again.',
};

export interface EntryParams {
  /** The entry to change. */
  id?: string;
  /** "1" begins an income. */
  income?: string;
  /** An asset to begin with. */
  asset?: string;
}

/** What has been filled in for an entry, and what can be done with it. */
export function useEntryForm(params: EntryParams) {
  const data = useData();
  const today = toDay(useNow());
  // As it was on opening, so deleting it doesn't turn this into the page for a new one while it slides away.
  const [old] = useState(() => store.data.entries.find((e) => e.id === params.id));
  const [draft, setDraft] = useState<EntryDraft>(() => {
    const asset = ASSETS.find((a) => a.id === params.asset)?.id;
    return old ? draftOf(store.data, old) : newDraft(store.data, Date.now(), params.income === '1', asset);
  });
  // Saved or deleted: a second tap while the page slides away does nothing.
  const done = useRef(false);

  const unpriced = needsPrice(data, draft);
  useEffect(() => {
    if (unpriced) void prices.refresh(true);
  }, [unpriced, draft.categoryId]);

  /** Null when it is saved. Otherwise what is missing, which is also said. */
  const save = (): DraftProblem | null => {
    if (done.current) return null;
    const problem = problemWith(data, draft, old);
    if (problem) {
      haptics.no();
      messages.warn(SAID[problem]);
      if (problem === 'price') void prices.refresh(true);
      return problem;
    }
    done.current = true;
    const entry = finished(data, draft, today, old);
    if (old) {
      const was = store.data.entries.find((e) => e.id === old.id);
      const past = store.update(old.id, entry);
      messages.show(withPast('Changes saved', past.length), past.length > 0 && was ? { undo: () => store.undo(past, was) } : {});
    } else {
      const added = store.add(entry);
      const what = entry.asset ? `${assetOf(entry.asset).name} saved` : entry.income ? 'Income saved' : 'Expense saved';
      messages.show(withPast(what, added.length - 1), { undo: () => store.undo(added) });
    }
    haptics.done();
    // An older day's price, if this purchase needs one.
    if (entry.asset && entry.rate === undefined) void prices.refresh(true);
    return null;
  };

  /** False when there is nothing to delete. */
  const remove = (): boolean => {
    if (done.current || !old) return false;
    done.current = true;
    const gone = store.remove(old.id);
    if (gone) messages.show('Entry deleted', { undo: () => store.putBack(gone) });
    haptics.done();
    return true;
  };

  return {
    old,
    draft,
    today,
    options: choices(data, draft.income),
    hint: priceHint(data, draft, today, old),
    buying: buying(data, draft, old),
    suggestions: noteSuggestions(data, draft.note, draft.income),
    change: (more: Partial<EntryDraft>) => setDraft((d) => ({ ...d, ...more })),
    type: (key: Key) => setDraft((d) => ({ ...d, pad: key(d.pad) })),
    pick: (categoryId: string | null) => setDraft((d) => withCategory(store.data, d, categoryId)),
    suggest: (like: Entry) => setDraft((d) => withSuggestion(store.data, d, like)),
    setIncome: (income: boolean) => setDraft((d) => ({ ...withCategory(store.data, d, null), income })),
    save,
    remove,
  };
}
