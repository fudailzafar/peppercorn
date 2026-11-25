import { soundDays } from './assets';
import type { AppData, Entry, Saved, Settings } from './model';

/* The saved file: what a new one holds, and how one is read and written. See docs/data.md. */

const starter = (name: string, emoji: string, colour: string, income = false) => ({ name, emoji, colour, income });

/** The categories a new install begins with. */
export const STARTERS = [
  starter('Food', '🍔', '#FE724E'),
  starter('Transport', '🚌', '#279AF4'),
  starter('Shopping', '🛍️', '#FF78A3'),
  starter('Bills', '🧾', '#6A7CF9'),
  starter('Fun', '🎬', '#FDBC3B'),
  starter('Health', '💊', '#6BB2AA'),
  starter('Salary', '💼', '#76FBB1', true),
];

/** What a new install, or a new option after an update, begins with. */
export const defaultSettings = (currency: string): Settings => ({
  currency,
  cents: true,
  signs: true,
  theme: 'system',
  income: true,
  upcoming: true,
  animated: true,
  weekStart: 0,
  monthStart: 1,
  haptics: 'light',
  typing: 'point',
  historySpan: 'week',
  historyTotal: 'net',
  name: '',
  welcomed: false,
});

/** Of the format. A change that an older Peppercorn couldn’t read, or that reads older files differently, needs the next number. */
const VERSION = 1;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isList = (v: unknown): v is { id: string }[] => Array.isArray(v) && v.every((x) => isRecord(x) && typeof x.id === 'string');
const isEntries = (v: unknown): v is Entry[] => isList(v) && v.every((e) => Number.isFinite((e as Entry).amount) && Number.isFinite((e as Entry).date));

/** Whether something read is clearly all of Peppercorn's data: a file cut short must not pass for an empty one. */
export const isSaved = (v: unknown): v is Saved => isRecord(v) && isList(v.categories) && isEntries(v.entries) && isList(v.budgets) && isList(v.owned) && isRecord(v.settings);

/** Reads what was saved. Throws if it can't be understood. */
export function readData(text: string, currency: string): AppData {
  const file = JSON.parse(text) as unknown;
  if (!isRecord(file) || file.version !== VERSION || !isSaved(file.data)) throw new Error('Not Peppercorn’s data');
  const { prices, priceError, ...saved } = file.data as AppData;
  const books = isRecord(prices) ? (prices as AppData['prices']) : {};
  return {
    ...saved,
    // New options appear with their defaults after an update.
    settings: { ...defaultSettings(currency), ...saved.settings },
    prices: Object.fromEntries(Object.entries(books).map(([id, book]) => [id, { fetchedAt: Number(book?.fetchedAt) || 0, days: soundDays(book?.days ?? {}) }])),
    priceError: priceError === true,
  };
}

/** What is written to the phone. */
export const writeData = (data: AppData): string => JSON.stringify({ version: VERSION, data });
