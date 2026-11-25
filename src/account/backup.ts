import type { Saved } from '../domain/model';
import { isSaved } from '../data/store';
import { AccountError } from './types';

/** The saved file. `device` tells which phone wrote it last. */
export interface Backup {
  app: 'peppercorn';
  version: number;
  device: string;
  savedAt: number;
  data: Saved;
}

const VERSION = 2;

/** Nothing worth keeping: no entries, budgets or assets. */
export const isEmpty = (d: Saved): boolean => d.entries.length === 0 && d.budgets.length === 0 && d.owned.length === 0;

export const makeBackup = (data: Saved, device: string, savedAt: number): Backup => ({ app: 'peppercorn', version: VERSION, device, savedAt, data });

/** A short fingerprint (cyrb53), to tell whether something changed. */
export function fingerprint(value: unknown): string {
  const text = JSON.stringify(value);
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
  if (b.version < VERSION || !isSaved(b.data)) throw new AccountError('unreadable');
  const { categories, entries, budgets, owned, settings } = b.data;
  return { app: 'peppercorn', version: b.version, device: b.device ?? '', savedAt: b.savedAt ?? 0, data: { categories, entries, budgets, owned, settings } };
}
