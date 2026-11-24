import type { AssetId, AssetPrices, Category, Holding, Transaction } from './types';

export interface Asset {
  id: AssetId;
  name: string;
  emoji: string;
  colour: string;
  /** Metals are entered in grams, funds in rupees. */
  kind: 'metal' | 'fund';
  /** What one unit of the price is. */
  per: string;
  /** AMFI scheme code (funds only). Both are Direct Plan, Growth. */
  scheme?: number;
}

/** The four things Peppercorn tracks the value of. Fixed: they can't be renamed, deleted or added to. */
export const ASSETS: readonly Asset[] = [
  { id: 'gold', name: 'Gold', emoji: '🥇', colour: '#FDBC3B', kind: 'metal', per: 'gram' },
  { id: 'silver', name: 'Silver', emoji: '🥈', colour: '#9DADFF', kind: 'metal', per: 'gram' },
  { id: 'taurus', name: 'Taurus Ethical Fund', emoji: '🌱', colour: '#3BB19F', kind: 'fund', per: 'unit', scheme: 118876 },
  { id: 'tata', name: 'Tata Ethical Fund', emoji: '🌿', colour: '#279AF4', kind: 'fund', per: 'unit', scheme: 119172 },
];

export const assetById = (id: AssetId) => ASSETS.find((a) => a.id === id) as Asset;
export const assetCategoryId = (id: AssetId) => `asset-${id}`;

/** The fixed expense categories behind the assets (always after the user's own). */
export const assetCategories = (): Category[] =>
  ASSETS.map((a, i) => ({ id: assetCategoryId(a.id), name: a.name, emoji: a.emoji, colour: a.colour, income: false, order: 1000 + i, dateCreated: 0, asset: a.id }));

/** Local calendar day as "2026-11-24". */
export function isoDay(d: Date | number): string {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export interface Quote {
  day: string;
  rate: number;
}

const days = (p: AssetPrices | undefined) => Object.keys(p?.history ?? {}).sort();

export function latestQuote(p: AssetPrices | undefined): Quote | null {
  const day = days(p).pop();
  return p && day ? { day, rate: p.history[day] } : null;
}

/** The price before the latest one, for the day's change. */
export function previousQuote(p: AssetPrices | undefined): Quote | null {
  const day = days(p).slice(-2, -1)[0];
  return p && day ? { day, rate: p.history[day] } : null;
}

/** A metal's price on a day: that day's, else the last one before it, else the earliest known. */
export function metalQuote(p: AssetPrices | undefined, date: Date | number): Quote | null {
  const all = days(p);
  if (!p || all.length === 0) return null;
  const target = isoDay(date);
  const day = all.filter((d) => d <= target).pop() ?? all[0];
  return { day, rate: p.history[day] };
}

/** A fund's price for a purchase: the first closing price on or after that day (null until it is published). */
export function fundQuote(p: AssetPrices | undefined, date: Date | number): Quote | null {
  const all = days(p);
  const target = isoDay(date);
  // Without prices from before the purchase, the first one known might not be the right day's.
  if (!p || all.length === 0 || all[0] > target) return null;
  const day = all.find((d) => d >= target);
  return day ? { day, rate: p.history[day] } : null;
}

/** Differences under half a rupee are rounding, not a gain or a loss. */
export const DUST = 0.5;

export interface Valuation {
  /** Grams or fund units. */
  qty: number;
  invested: number;
  /** null until a price has been fetched. */
  value: number | null;
  /** Fund money whose units aren't known yet (counted at cost). */
  pending: number;
  count: number;
}

export function valuation(id: AssetId, transactions: Transaction[], holdings: Holding[], p: AssetPrices | undefined): Valuation {
  let qty = 0;
  let invested = 0;
  let pending = 0;
  let count = 0;
  for (const t of transactions) {
    if (t.asset !== id) continue;
    count++;
    invested += t.amount;
    if (t.qty === undefined) pending += t.amount;
    else qty += t.qty;
  }
  for (const h of holdings) {
    if (h.asset !== id) continue;
    count++;
    invested += h.invested;
    qty += h.qty;
  }
  const quote = latestQuote(p);
  const value = quote ? qty * quote.rate + pending : qty === 0 ? pending : null;
  return { qty, invested, value, pending, count };
}

/** "8.125 g" or "12.345 units" */
export function qtyLabel(id: AssetId, qty: number): string {
  const text = String(Math.round(qty * 1000) / 1000);
  return assetById(id).kind === 'metal' ? `${text} g` : `${text} ${text === '1' ? 'unit' : 'units'}`;
}
