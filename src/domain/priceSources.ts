import { isDay, makeDay } from './dates';
import type { Day } from './model';

/*
 * Reading the pages daily prices come from.
 *   Gold (22K) and silver, per gram, Chennai: LiveChennai's rate page, updated each morning.
 *   Funds: the closing NAV from AMFI, through mfapi.in, published late each evening.
 */

export interface MetalPrices {
  gold: Record<Day, number>;
  silver: Record<Day, number>;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const number = (text: string) => Number(text.replaceAll(',', '')) || 0;

/** A real day that has come. */
function realDay(year: number, month: number, date: number, today: Day): Day | null {
  const day = makeDay(year, month, date);
  return isDay(day) && day <= today ? day : null;
}

/** "24/Nov/2026" */
function pageDay(text: string, today: Day): Day | null {
  const [d, m, y] = text.split('/');
  return realDay(Number(y), MONTHS.indexOf(m.slice(0, 3).toLowerCase()) + 1, Number(d), today);
}

/** The page's words, with a bar wherever there was a tag. */
const words = (html: string) =>
  html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, '|')
    .replaceAll('&nbsp;', ' ')
    .replace(/[\s|]*\|[\s|]*/g, '|');

const DAY = '(\\d{1,2}/[A-Za-z]{3,9}/\\d{4})';
const N = '([\\d,.]+)';

/** Reads the dated gold and silver tables. Rows that don't look like real prices are dropped. */
export function parseMetals(html: string, today: Day): MetalPrices {
  const text = words(html);
  const at = text.indexOf('Ready Silver');
  const split = at < 0 ? text.length : at;
  const gold: Record<Day, number> = {};
  // Date | 24K 1 g | 24K 8 g | 22K 1 g | 22K 8 g
  for (const [, day, k24, , k22, k22x8] of text.slice(0, split).matchAll(new RegExp([DAY, N, N, N, N].join('\\|'), 'g'))) {
    const a = number(k24);
    const b = number(k22);
    const on = pageDay(day, today);
    // 22K is 22/24 of pure gold: a swapped or shifted column fails this.
    if (on && b > 1000 && Math.abs(b / a - 22 / 24) < 0.02 && Math.abs(number(k22x8) / b - 8) < 0.05) gold[on] = b;
  }
  const silver: Record<Day, number> = {};
  // Date | 1 g | 1 kg
  for (const [, day, gram, kilo] of text.slice(split).matchAll(new RegExp([DAY, N, N].join('\\|'), 'g'))) {
    const g = number(gram);
    const on = pageDay(day, today);
    if (on && g > 10 && Math.abs(number(kilo) / g - 1000) < 20) silver[on] = g;
  }
  return { gold, silver };
}

/** mfapi's { "data": [{ "date": "23-11-2026", "nav": "417.38540" }] }. A row that isn't a day and a price is dropped, and only that row. */
export function parseFund(json: string, today: Day): Record<Day, number> {
  const out: Record<Day, number> = {};
  let rows: unknown;
  try {
    rows = (JSON.parse(json) as { data?: unknown } | null)?.data;
  } catch {
    return out;
  }
  if (!Array.isArray(rows)) return out;
  for (const row of rows as ({ date?: unknown; nav?: unknown } | null)[]) {
    const m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(String(row?.date ?? '').trim());
    const day = m && realDay(Number(m[3]), Number(m[2]), Number(m[1]), today);
    const nav = Number(row?.nav || NaN);
    if (day && Number.isFinite(nav) && nav > 0) out[day] = nav;
  }
  return out;
}

const INDIA = 5.5 * 3_600_000;
const DAY_MS = 86_400_000;

/** The last moment a new price became due, for daily hours in India (which has no summer time). */
export function lastDue(hours: readonly number[], now: number): number {
  const midnight = Math.floor((now + INDIA) / DAY_MS) * DAY_MS - INDIA;
  const times = [0, 1].flatMap((ago) => hours.map((h) => midnight - ago * DAY_MS + h * 3_600_000));
  return Math.max(...times.filter((t) => t <= now));
}

/** Today in India, where the prices come from. */
export const todayInIndia = (now: number): Day => new Date(now + INDIA).toISOString().slice(0, 10);
