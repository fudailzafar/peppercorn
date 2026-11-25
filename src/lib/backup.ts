import { AccountError } from './googleSignInTypes';
import { useStore, type SavedData } from './store';

/** The saved file. `device` tells which phone wrote it last. */
export interface Backup {
  app: 'peppercorn';
  version: number;
  device: string;
  savedAt: number;
  data: SavedData;
}

const VERSION = 1;

/** This phone's data as it would be saved. */
export function snapshot(): SavedData {
  const { categories, transactions, budgets, mainBudget, holdings, settings } = useStore.getState();
  // Having seen the welcome screen is about this phone, not the data.
  const { welcomed: _, ...rest } = settings;
  return { categories, transactions, budgets, mainBudget, holdings, settings: rest };
}

/** Nothing worth keeping: no entries, budgets or assets. */
export const isEmpty = (d: SavedData) => d.transactions.length === 0 && d.budgets.length === 0 && d.mainBudget === null && d.holdings.length === 0;

export const makeBackup = (data: SavedData, device: string): Backup => ({ app: 'peppercorn', version: VERSION, device, savedAt: Date.now(), data });

/** A short fingerprint (cyrb53), to tell whether the data changed since the last save. */
export function fingerprint(data: SavedData): string {
  const text = JSON.stringify(data);
  let a = 0xdeadbeef;
  let b = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 2654435761);
    b = Math.imul(b ^ c, 1597334677);
  }
  a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909);
  b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909);
  return `${(b >>> 0).toString(36)}${(a >>> 0).toString(36)}-${text.length}`;
}

const isList = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'object' && x !== null && typeof (x as { id?: unknown }).id === 'string');

/** Reads a saved file. Anything that isn't clearly Peppercorn's data is refused, so it can't replace good data. */
export function readBackup(text: string): Backup {
  let b: Partial<Backup> | null = null;
  try {
    b = JSON.parse(text) as Partial<Backup> | null;
  } catch {
    // Handled below.
  }
  if (!b || b.app !== 'peppercorn' || typeof b.version !== 'number') throw new AccountError('unreadable');
  if (b.version > VERSION) throw new AccountError('newerVersion');
  const d = b.data;
  if (!d || !isList(d.categories) || !isList(d.transactions) || !isList(d.budgets) || !isList(d.holdings) || typeof d.settings !== 'object' || d.settings === null) {
    throw new AccountError('unreadable');
  }
  return {
    app: 'peppercorn',
    version: b.version,
    device: b.device ?? '',
    savedAt: b.savedAt ?? 0,
    data: { categories: d.categories, transactions: d.transactions, budgets: d.budgets, mainBudget: d.mainBudget ?? null, holdings: d.holdings, settings: d.settings },
  };
}
