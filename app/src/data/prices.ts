import { ASSETS, fundOn, latest } from '@/domain/assets';
import { addDays, toDay } from '@/domain/dates';
import type { AssetId, Day } from '@/domain/model';
import { lastDue, parseFund, parseMetals, todayInIndia } from '@/domain/priceSources';
import type { Store } from './store';

const HOUR = 3_600_000;
/** After a failure, wait this long before trying by itself again. */
const RETRY = 10 * 60_000;

const oldestOf = (days: readonly Day[]): Day => [...days].sort()[0];

export interface PricesNeeds {
  store: Store;
  /** Where the page with gold and silver rates is. */
  metalsUrl: string;
  now: () => number;
  /** A page's text. Throws when it can't be had. */
  page: (url: string) => Promise<string>;
}

/** Daily prices. Nothing is live: each source is asked again only once its next price is due. */
export class Prices {
  private busy = false;
  private lastTry = 0;
  /** How far back each fund has been asked for, as a fund has no prices from before it began. */
  private readonly asked = new Map<AssetId, Day>();

  constructor(private readonly needs: PricesNeeds) {}

  /** Fetches whatever is due. Safe to call often. `force` skips the wait after a failure. */
  async refresh(force = false): Promise<void> {
    if (this.busy || this.needs.store.state.getState().status !== 'ready') return;
    const now = this.needs.now();
    if (!force && now - this.lastTry < RETRY) return;
    this.busy = true;
    this.lastTry = now;
    try {
      const results = await Promise.allSettled(this.due(now).map((job) => job()));
      const worked = results.every((r) => r.status === 'fulfilled');
      this.needs.store.setPriceError(!worked);
      // Nothing failed, so the next call may check straight away.
      if (worked) this.lastTry = 0;
    } finally {
      this.busy = false;
      this.needs.store.priceWaiting();
    }
  }

  private due(now: number): (() => Promise<void>)[] {
    const { prices, entries } = this.needs.store.data;
    const today = todayInIndia(now);
    const jobs: (() => Promise<void>)[] = [];

    const morning = lastDue([10], now);
    // Once each morning; if the page still showed an older day, again two hours later.
    const stale = (latest(prices.gold)?.day ?? '') < todayInIndia(morning);
    const fetched = prices.gold?.fetchedAt ?? 0;
    if (fetched < morning || (stale && now - fetched > 2 * HOUR)) jobs.push(() => this.metals(now));

    for (const { id, scheme } of ASSETS) {
      if (scheme === undefined) continue;
      const book = prices[id];
      // 11 pm for the day's close, and 9 am in case it was published late.
      if ((book?.fetchedAt ?? 0) < lastDue([9, 23], now)) {
        // From where we left off, so no days are missing after a long break.
        const from = oldestOf([latest(book)?.day ?? today, addDays(today, -30)]);
        jobs.push(() => this.fund(id, scheme, from, today, now));
      }
      // Purchases the prices we hold don't reach: that stretch too, once.
      const missing = entries.filter((e) => e.asset === id && e.rate === undefined && !fundOn(book, toDay(e.date))).map((e) => toDay(e.date));
      if (missing.length === 0) continue;
      const oldest = oldestOf(missing);
      const asked = this.asked.get(id);
      if (oldest < addDays(today, -29) && (!asked || oldest < asked)) {
        jobs.push(async () => {
          await this.fund(id, scheme, addDays(oldest, -10), today);
          this.asked.set(id, oldest);
        });
      }
    }
    return jobs;
  }

  private async metals(now: number) {
    const { gold, silver } = parseMetals(await this.needs.page(this.needs.metalsUrl), todayInIndia(now));
    if (Object.keys(gold).length === 0 || Object.keys(silver).length === 0) throw new Error('No prices on the page');
    this.needs.store.savePrices('gold', gold, now);
    this.needs.store.savePrices('silver', silver, now);
  }

  private async fund(id: AssetId, scheme: number, from: Day, to: Day, fetchedAt?: number) {
    const days = parseFund(await this.needs.page(`https://api.mfapi.in/mf/${scheme}?startDate=${from}&endDate=${to}`), to);
    if (Object.keys(days).length === 0) throw new Error('No prices');
    this.needs.store.savePrices(id, days, fetchedAt);
  }
}

const TIMEOUT = 20_000;

/** A page's text. Throws when it can't be had. */
export async function fetchPage(url: string): Promise<string> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { signal: abort.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}
