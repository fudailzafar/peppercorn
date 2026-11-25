import { assetCategoryId, assetOf, fundOn, latest, metalOn, standsFor, type Asset, type Quote } from './assets';
import { shortLabel, toDay } from './dates';
import { categoryOf, noteAfter, type Often } from './entries';
import { emptyPad, padOf, padValue, type Keypad } from './keypad';
import type { AppData, AssetId, Day, Entry } from './model';
import { exact, rupees } from './money';

/* What the page for adding or changing an entry works with. */

export interface EntryDraft {
  income: boolean;
  note: string;
  date: number;
  categoryId: string | null;
  often: Often | null;
  pad: Keypad;
}

const GRAM_DECIMALS = 3;

const isMetal = (data: AppData, categoryId: string | null): boolean => {
  const asset = categoryOf(data, categoryId)?.asset;
  return asset !== undefined && assetOf(asset).metal;
};

/** Grams are typed with a point even when money is filled in cents first. */
const blank = (data: AppData, metal: boolean): Keypad => (metal ? emptyPad('point', GRAM_DECIMALS) : emptyPad(data.settings.typing));

export function newDraft(data: AppData, now: number, income = false, asset?: AssetId): EntryDraft {
  const categoryId = asset ? assetCategoryId(asset) : null;
  return { income: income && data.settings.income, note: '', date: now, categoryId, often: null, pad: blank(data, isMetal(data, categoryId)) };
}

export function draftOf(data: AppData, e: Entry): EntryDraft {
  const pad = e.asset && assetOf(e.asset).metal ? padOf(e.quantity ?? 0, 'point', GRAM_DECIMALS) : padOf(e.amount, data.settings.typing);
  return { income: e.income, note: e.note, date: e.date, categoryId: e.categoryId, often: e.repeat ? { unit: e.repeat.unit, every: e.repeat.every } : null, pad };
}

/** Grams and rupees aren't the same number: it starts over when switching between them. */
export function withCategory(data: AppData, d: EntryDraft, categoryId: string | null): EntryDraft {
  const metal = isMetal(data, categoryId);
  return { ...d, categoryId, pad: metal === isMetal(data, d.categoryId) ? d.pad : blank(data, metal) };
}

/** As a past entry was: its note, its category, and its amount if none is typed. */
export function withSuggestion(data: AppData, d: EntryDraft, like: Entry): EntryDraft {
  const next = withCategory(data, { ...d, note: like.note }, like.categoryId);
  return next.pad.text === '' ? { ...next, pad: padOf(like.amount, data.settings.typing) } : next;
}

/** What is being bought, if it is an asset, and its price on the day. */
interface Buying {
  asset?: Asset;
  metal: boolean;
  day: Day;
  /** The price it was bought at stays, unless its day or asset changes. */
  kept?: number;
  quote?: Quote;
  rate?: number;
  amount: number;
}

export function buying(data: AppData, d: EntryDraft, old?: Entry): Buying {
  const id = categoryOf(data, d.categoryId)?.asset;
  const asset = id && assetOf(id);
  const metal = asset?.metal === true;
  const day = toDay(d.date);
  const kept = id && old?.asset === id && toDay(old.date) === day ? old.rate : undefined;
  const book = id && data.prices[id];
  const quote = metal ? metalOn(book, day) : fundOn(book, day);
  const rate = kept ?? quote?.rate;
  const typed = padValue(d.pad);
  return { asset, metal, day, kept, quote, rate, amount: metal ? exact(typed * (rate ?? 0)) : typed };
}

/** What an asset costs, under the amount. Nothing for other entries. */
export function priceHint(data: AppData, d: EntryDraft, today: Day, old?: Entry): string | null {
  const { asset, metal, day, kept, quote, rate, amount } = buying(data, d, old);
  if (!asset) return null;
  const { full } = rupees();
  if (!metal) {
    const now = latest(data.prices[asset.id]);
    return now ? `Latest price: ${full(now.rate)} a unit, ${shortLabel(now.day, today)}` : 'Getting the latest price…';
  }
  if (rate === undefined) return 'Getting today’s price…';
  const price = padValue(d.pad) > 0 ? `${full(amount)} at ${full(rate)} a gram` : `${full(rate)} a gram`;
  if (kept !== undefined || !quote) return price;
  if (day > today) return `${price}. An estimate: set on ${shortLabel(day, today)}.`;
  const from = shortLabel(quote.day, today);
  return standsFor(quote, day) ? `${price}, ${from}` : `${price}. No price for ${shortLabel(day, today)}, so this is from ${from}.`;
}

/** An asset without any price yet. */
export function needsPrice(data: AppData, d: EntryDraft): boolean {
  const id = categoryOf(data, d.categoryId)?.asset;
  return id !== undefined && latest(data.prices[id]) === undefined;
}

/** What is missing before it can be saved. */
export type DraftProblem = 'amountAndCategory' | 'amount' | 'grams' | 'category' | 'price';

export function problemWith(data: AppData, d: EntryDraft, old?: Entry): DraftProblem | null {
  const { metal, rate } = buying(data, d, old);
  // Not one that was deleted meanwhile, from the link under the categories.
  const category = categoryOf(data, d.categoryId);
  if (padValue(d.pad) <= 0) return category ? (metal ? 'grams' : 'amount') : 'amountAndCategory';
  if (!category) return 'category';
  return metal && rate === undefined ? 'price' : null;
}

/** The entry it makes, for the store. */
export function finished(data: AppData, d: EntryDraft, today: Day, old?: Entry) {
  const { asset, metal, day, rate, amount } = buying(data, d, old);
  const typed = padValue(d.pad);
  // A metal dated ahead waits for its day's price, as a fund's units do.
  const settled = metal && day > today ? undefined : rate;
  return {
    amount,
    date: d.date,
    note: noteAfter(data, old, d.note, d.categoryId),
    income: d.income,
    categoryId: d.categoryId,
    often: d.often,
    ...(asset ? { asset: asset.id, rate: settled, quantity: metal ? typed : settled && typed / settled } : {}),
  };
}

/** "with 3 past entries" */
export const withPast = (text: string, past: number): string => (past === 0 ? text : `${text}, with ${past} past ${past === 1 ? 'entry' : 'entries'}`);
