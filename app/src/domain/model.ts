/*
 * What Peppercorn keeps. These names are the saved format, on the phone and in people's Drive: renaming one needs a new
 * version of it.
 */

/** A calendar day, "2026-11-24". A day, not a moment, so it doesn't move with the time zone. */
export type Day = string;

export type AssetId = 'gold' | 'silver' | 'taurus' | 'tata';

export interface Category {
  id: string;
  name: string;
  emoji: string;
  /** "#279AF4" */
  colour: string;
  income: boolean;
  order: number;
  /** Set on the fixed categories behind the assets. */
  asset?: AssetId;
}

export type RepeatUnit = 'day' | 'week' | 'month';

export interface Repeat {
  unit: RepeatUnit;
  /** Every so many days, weeks or months. */
  every: number;
  /** The next day due. */
  next: Day;
  /** The day a monthly one is meant for: a 31st is due on the 30th in April, but on the 31st again in May. */
  day?: number;
}

/** Money spent or earned. */
export interface Entry {
  id: string;
  amount: number;
  /** Epoch milliseconds. */
  date: number;
  note: string;
  income: boolean;
  categoryId: string | null;
  repeat?: Repeat;
  /** Came from a repeat, or began one. */
  series?: boolean;
  /** For asset purchases: which, how many grams or units (unknown until a fund's price is out), and the price. */
  asset?: AssetId;
  quantity?: number;
  rate?: number;
}

export type BudgetPeriod = 'day' | 'week' | 'month' | 'year';

/** A limit on spending. */
export interface Budget {
  id: string;
  /** Null is the overall budget, for all spending. */
  categoryId: string | null;
  amount: number;
  period: BudgetPeriod;
  /** When the current period began. */
  start: Day;
}

/** Something already owned when tracking began: adds to the asset without counting as spending. */
export interface Owned {
  id: string;
  asset: AssetId;
  quantity: number;
  /** What was paid, or what it was worth when added if that isn't known. */
  invested: number;
  paid: boolean;
  date: number;
}

/** Daily prices of one asset, by day, per gram or per unit. */
export interface PriceBook {
  days: Record<Day, number>;
  fetchedAt: number;
}

export type Theme = 'system' | 'light' | 'dark';
export type Typing = 'point' | 'cents';
export type HapticLevel = 'off' | 'light' | 'strong';
export type HistorySpan = 'today' | 'week' | 'month' | 'year' | 'all';
export type HistoryTotal = 'net' | 'earned' | 'spent';

export interface Settings {
  currency: string;
  cents: boolean;
  signs: boolean;
  theme: Theme;
  income: boolean;
  upcoming: boolean;
  animated: boolean;
  /** 0 = Sunday to 6 = Saturday. */
  weekStart: number;
  /** The day a "month" starts on, 1 to 28. */
  monthStart: number;
  haptics: HapticLevel;
  /** How amounts are typed: with a decimal point, or filling in cents first. */
  typing: Typing;
  historySpan: HistorySpan;
  historyTotal: HistoryTotal;
  name: string;
  /** Whether the welcome screen is done. About this phone, so never in a backup. */
  welcomed: boolean;
}

/** What is saved for someone who signs in. Prices are left out: they are fetched again. */
export interface Saved {
  categories: Category[];
  entries: Entry[];
  budgets: Budget[];
  owned: Owned[];
  settings: Settings;
}

/** Everything on this phone. */
export interface AppData extends Saved {
  prices: Partial<Record<AssetId, PriceBook>>;
  /** The last price update failed; older prices are still shown. */
  priceError: boolean;
}
