import { daysBetween, isDay, toDay } from './dates';
import type { AppData, AssetId, Category, Day, Entry, PriceBook } from './model';
import { exact, rupees, sum, type Money } from './money';

/** Metals are entered in grams, funds in rupees. */
export interface Asset {
  id: AssetId;
  name: string;
  emoji: string;
  colour: string;
  metal: boolean;
  /** What one price is for. */
  per: 'gram' | 'unit';
  /** AMFI scheme code (funds only). Both are Direct Plan, Growth. */
  scheme?: number;
}

/** The four things Peppercorn tracks the value of. Fixed: they can't be renamed, deleted or added to. */
export const ASSETS: readonly Asset[] = [
  { id: 'gold', name: 'Gold', emoji: '🥇', colour: '#FDBC3B', metal: true, per: 'gram' },
  { id: 'silver', name: 'Silver', emoji: '🥈', colour: '#9DADFF', metal: true, per: 'gram' },
  { id: 'taurus', name: 'Taurus Ethical Fund', emoji: '🌱', colour: '#3BB19F', metal: false, per: 'unit', scheme: 118876 },
  { id: 'tata', name: 'Tata Ethical Fund', emoji: '🌿', colour: '#279AF4', metal: false, per: 'unit', scheme: 119172 },
];

export const assetOf = (id: AssetId): Asset => ASSETS.find((a) => a.id === id) as Asset;

export const assetCategoryId = (id: AssetId): string => `asset-${id}`;

/** The fixed categories behind the assets, always after the person's own. */
export const assetCategories = (): Category[] =>
  ASSETS.map((a, i) => ({ id: assetCategoryId(a.id), name: a.name, emoji: a.emoji, colour: a.colour, income: false, order: 1000 + i, asset: a.id }));

/** "24 g", "1 unit", "12.345 units" */
export function quantityLabel(asset: Asset, n: number): string {
  const text = String(Math.round(n * 1000) / 1000);
  if (asset.metal) return `${text} g`;
  return `${text} ${text === '1' ? 'unit' : 'units'}`;
}

/** Grams, units or rupees typed in a field. Null if it isn't a number, or more than anyone has. */
export function quantityTyped(text: string): number | null {
  const plain = text.replaceAll(',', '').trim();
  if (plain === '' || !/^\d*\.?\d*$/.test(plain)) return null;
  const n = Number(plain);
  return Number.isFinite(n) && n < 1e9 ? n : null;
}

export interface Quote {
  day: Day;
  rate: number;
}

const daysOf = (book: PriceBook | undefined): Day[] => (book ? Object.keys(book.days).sort() : []);
const quote = (book: PriceBook, day: Day): Quote => ({ day, rate: book.days[day] });

const isPrice = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

/** Only real days and real prices, as anything else would fail every time it is read. */
export const soundDays = (days: Record<string, unknown>): Record<Day, number> =>
  Object.fromEntries(Object.entries(days).filter((e): e is [Day, number] => isDay(e[0]) && isPrice(e[1])));

export function latest(book: PriceBook | undefined): Quote | undefined {
  const day = daysOf(book).at(-1);
  return book && day ? quote(book, day) : undefined;
}

/** The one before the latest, for the day's change. */
export function previous(book: PriceBook | undefined): Quote | undefined {
  const day = daysOf(book).at(-2);
  return book && day ? quote(book, day) : undefined;
}

/** Over a weekend or holidays the last price stands. Days further apart than this weren't looked up, and may have had others. */
const CLOSED = 5;

/** A metal's price on a day: that day's, else the last before it, else the nearest known. */
export function metalOn(book: PriceBook | undefined, day: Day): Quote | undefined {
  if (!book) return undefined;
  const days = daysOf(book);
  const before = days.filter((d) => d <= day).at(-1);
  const later = days.find((d) => d > day);
  if (!before) return later ? quote(book, later) : undefined;
  if (!later) return quote(book, before);
  const ago = daysBetween(before, day);
  return quote(book, ago <= CLOSED || ago <= daysBetween(day, later) ? before : later);
}

/** Whether a quote is really that day's price, not just the nearest one known. */
export function standsFor(q: Quote, day: Day): boolean {
  const ago = daysBetween(q.day, day);
  return ago >= 0 && ago <= CLOSED;
}

/** A fund's price for a purchase: the first closing price on or after the day, if prices around then are known. */
export function fundOn(book: PriceBook | undefined, day: Day): Quote | undefined {
  if (!book) return undefined;
  const days = daysOf(book);
  if (days.length === 0 || days[0] > day) return undefined;
  const on = days.find((d) => d >= day);
  return on && daysBetween(day, on) <= CLOSED ? quote(book, on) : undefined;
}

/** What an asset cost and what it's worth. `value` is null until a price is known. */
export interface Worth {
  invested: number;
  value: number | null;
  quantity: number;
  /** Fund money whose units aren't known yet. */
  waiting: number;
  count: number;
}

/** Under half a rupee is rounding, not a gain or a loss. */
const DUST = 0.5;

export const gainOf = (w: Pick<Worth, 'value' | 'invested'>): number | null => (w.value === null ? null : w.value - w.invested);
export const isUp = (w: Pick<Worth, 'value' | 'invested'>): boolean => (gainOf(w) ?? 0) >= DUST;
export const isDown = (w: Pick<Worth, 'value' | 'invested'>): boolean => (gainOf(w) ?? 0) <= -DUST;

/** "4.2%" */
export function percentOf(w: Pick<Worth, 'value' | 'invested'>): string | null {
  const gain = gainOf(w);
  return gain === null || w.invested <= 0 || Math.abs(gain) < DUST ? null : `${(Math.abs(gain / w.invested) * 100).toFixed(1)}%`;
}

/** "+₹1,200.00 (4.2%)", "No change", or nothing if there's nothing to compare. */
export function gainText(w: Pick<Worth, 'value' | 'invested'>, m: Money = rupees()): string {
  const gain = gainOf(w);
  if (gain === null || w.invested <= 0) return '';
  const percent = percentOf(w);
  return percent === null ? 'No change' : `${gain >= 0 ? '+' : '-'}${m.full(gain)} (${percent})`;
}

/** What is owned by now: a purchase dated later isn't yet. */
export function worth(data: AppData, id: AssetId, now: number): Worth {
  const bought = data.entries.filter((e) => e.asset === id && e.date <= now);
  const owned = data.owned.filter((o) => o.asset === id);
  const quantity = bought.reduce((all, e) => all + (e.quantity ?? 0), 0) + owned.reduce((all, o) => all + o.quantity, 0);
  const waiting = sum(bought, (e) => (e.quantity === undefined ? e.amount : 0));
  const price = latest(data.prices[id]);
  const value = price ? quantity * price.rate + waiting : quantity === 0 ? waiting : null;
  return { invested: exact(sum(bought, (e) => e.amount) + sum(owned, (o) => o.invested)), value, quantity, waiting, count: bought.length + owned.length };
}

export function totalWorth(data: AppData, now: number): Worth {
  const all = ASSETS.map((a) => worth(data, a.id, now));
  const known = all.every((w) => w.value !== null);
  return { invested: sum(all, (w) => w.invested), value: known ? all.reduce((t, w) => t + (w.value ?? 0), 0) : null, quantity: 0, waiting: 0, count: all.reduce((t, w) => t + w.count, 0) };
}

/** Fills in prices for purchases saved before their day's price was known. Returns the same list if none were waiting. */
export function priced(data: Pick<AppData, 'entries' | 'prices'>): Entry[] {
  let changed = false;
  const out = data.entries.map((e) => {
    if (!e.asset || e.rate !== undefined) return e;
    const day = toDay(e.date);
    const book = data.prices[e.asset];
    if (assetOf(e.asset).metal) {
      // Not before that day's price can be known: an older one would stay for good.
      const newest = latest(book);
      const q = newest && newest.day >= day ? metalOn(book, day) : undefined;
      if (!q) return e;
      changed = true;
      return { ...e, amount: exact((e.quantity ?? 0) * q.rate), rate: q.rate };
    }
    const q = fundOn(book, day);
    if (!q) return e;
    changed = true;
    return { ...e, quantity: e.amount / q.rate, rate: q.rate };
  });
  return changed ? out : data.entries;
}
