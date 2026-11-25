import { Platform } from 'react-native';
import { ASSETS, fundQuote, isoDay, latestQuote, metalQuote } from './assets';
import { useStore } from './store';
import type { AssetId } from './types';

/*
 * Daily prices. Nothing here is live: each source is asked again only once its next daily price is due.
 *   Gold (22K) and silver, per gram, Chennai: LiveChennai's rate page, updated each morning.
 *   Funds: the closing NAV from AMFI, through mfapi.in, published late each evening.
 */
// Browsers may not read that page directly, so the website asks its own address, which passes it on (scripts/build-web.sh).
const METALS_URL = Platform.OS === 'web' ? '/metals' : 'https://www.livechennai.com/gold_silverrate.asp';
const FUND_URL = 'https://api.mfapi.in/mf';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const HOUR = 3600_000;
const IST = 5.5 * HOUR;

type History = Record<string, number>;

/** "24/Nov/2026" -> "2026-11-24" */
function pageDay(text: string): string | null {
  const [d, m, y] = text.split('/');
  const month = MONTHS.indexOf((m ?? '').slice(0, 3).toLowerCase());
  return month === -1 ? null : `${y}-${String(month + 1).padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** Reads the dated gold and silver tables. Rows that don't look like real prices are dropped. */
export function parseMetals(html: string): { gold: History; silver: History } {
  const text = html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, '|')
    .replace(/&nbsp;/g, ' ')
    .replace(/[\s|]*\|[\s|]*/g, '|');
  const num = (s: string) => parseFloat(s.replace(/,/g, ''));
  const split = text.indexOf('Ready Silver');
  const gold: History = {};
  const silver: History = {};
  // Date | 24K 1g | 24K 8g | 22K 1g | 22K 8g
  for (const m of text.slice(0, split === -1 ? undefined : split).matchAll(/(\d{1,2}\/[A-Za-z]{3,9}\/\d{4})\|([\d,.]+)\|([\d,.]+)\|([\d,.]+)\|([\d,.]+)/g)) {
    const day = pageDay(m[1]);
    const k24 = num(m[2]);
    const k22 = num(m[4]);
    // 22K is 22/24 of pure gold: a swapped or shifted column fails this.
    if (day && k22 > 1000 && Math.abs(k22 / k24 - 22 / 24) < 0.02 && Math.abs(num(m[5]) / k22 - 8) < 0.05) gold[day] = k22;
  }
  // Date | 1g | 1kg
  if (split !== -1) {
    for (const m of text.slice(split).matchAll(/(\d{1,2}\/[A-Za-z]{3,9}\/\d{4})\|([\d,.]+)\|([\d,.]+)/g)) {
      const day = pageDay(m[1]);
      const gram = num(m[2]);
      if (day && gram > 10 && Math.abs(num(m[3]) / gram - 1000) < 20) silver[day] = gram;
    }
  }
  return { gold, silver };
}

/** mfapi's [{ date: "23-11-2026", nav: "417.38540" }] */
export function parseFund(json: unknown): History {
  const out: History = {};
  const rows = (json as { data?: { date?: string; nav?: string }[] } | null)?.data ?? [];
  for (const r of rows) {
    const [d, m, y] = (r.date ?? '').split('-');
    const nav = parseFloat(r.nav ?? '');
    if (y && nav > 0) out[`${y}-${m}-${d}`] = nav;
  }
  return out;
}

/** The last moment a new price became due, for daily times given as hours in India. */
export function lastDue(hours: number[], now: number): number {
  const midnight = Math.floor((now + IST) / (24 * HOUR)) * 24 * HOUR - IST;
  const times = hours.flatMap((h) => [midnight + h * HOUR, midnight + (h - 24) * HOUR]);
  return Math.max(...times.filter((t) => t <= now));
}

async function get(url: string): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 20_000);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchMetals() {
  const now = Date.now();
  const { gold, silver } = parseMetals(await (await get(METALS_URL)).text());
  if (Object.keys(gold).length === 0 || Object.keys(silver).length === 0) throw new Error('No prices on the page');
  useStore.getState().savePrices('gold', gold, now);
  useStore.getState().savePrices('silver', silver, now);
}

async function fetchFund(id: AssetId, scheme: number, from: Date, to?: Date) {
  const now = Date.now();
  const range = `?startDate=${isoDay(from)}&endDate=${isoDay(to ?? now)}`;
  const history = parseFund(await (await get(`${FUND_URL}/${scheme}${range}`)).json());
  if (Object.keys(history).length === 0) throw new Error('No prices');
  // An older range fills in history; it doesn't count as today's update.
  useStore.getState().savePrices(id, history, to ? undefined : now);
}

/** Fills in prices for purchases that were saved before their day's price was known. */
export function resolveAssets() {
  const { transactions, prices, patchTransactions } = useStore.getState();
  const patch: Record<string, { amount?: number; qty?: number; rate: number }> = {};
  for (const t of transactions) {
    if (!t.asset || t.rate !== undefined) continue;
    const fund = t.asset === 'taurus' || t.asset === 'tata';
    const quote = fund ? fundQuote(prices[t.asset], t.date) : metalQuote(prices[t.asset], t.date);
    if (!quote) continue;
    patch[t.id] = fund ? { qty: t.amount / quote.rate, rate: quote.rate } : { amount: Math.round((t.qty ?? 0) * quote.rate * 100) / 100, rate: quote.rate };
  }
  if (Object.keys(patch).length > 0) patchTransactions(patch);
}

let running: Promise<void> | null = null;
let lastTry = 0;

/** Fetches whatever is due. Safe to call often: it does nothing until the next daily price is out. */
export function refreshPrices(force = false): Promise<void> {
  if (running) return running;
  const now = Date.now();
  // After a failure, wait a little before asking again.
  if (!force && now - lastTry < 10 * 60_000) {
    resolveAssets();
    return Promise.resolve();
  }
  lastTry = now;
  running = (async () => {
    const { prices } = useStore.getState();
    const jobs: Promise<void>[] = [];
    const metal = prices.gold;
    const metalDue = lastDue([10], now);
    // Due once each morning; if the page still showed an older day, look again two hours later.
    const stale = (latestQuote(metal)?.day ?? '') < isoDay(metalDue);
    if (!metal || metal.fetchedAt < metalDue || (stale && now - metal.fetchedAt > 2 * HOUR)) jobs.push(fetchMetals());
    for (const a of ASSETS) {
      if (!a.scheme) continue;
      const p = prices[a.id];
      // 11 pm for the day's close, and 9 am in case it was published late.
      if (!p || p.fetchedAt < lastDue([9, 23], now)) jobs.push(fetchFund(a.id, a.scheme, new Date(now - 30 * 24 * HOUR)));
      // Purchases from before the prices we hold: get that stretch too.
      const first = Object.keys(p?.history ?? {}).sort()[0];
      const oldest = useStore.getState().transactions.filter((t) => t.asset === a.id && t.rate === undefined).reduce((m, t) => Math.min(m, t.date), Infinity);
      if (oldest !== Infinity && oldest < now - 29 * 24 * HOUR && (!first || first > isoDay(oldest))) jobs.push(fetchFund(a.id, a.scheme, new Date(oldest - 10 * 24 * HOUR), new Date(now)));
    }
    const results = await Promise.allSettled(jobs);
    useStore.getState().setPriceError(results.some((r) => r.status === 'rejected'));
    // Nothing failed, so a later call may check again as soon as something is due.
    if (results.every((r) => r.status === 'fulfilled')) lastTry = 0;
    resolveAssets();
  })().finally(() => {
    running = null;
  });
  return running;
}
