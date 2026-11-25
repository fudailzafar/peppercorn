import { getCalendars, getLocales } from 'expo-localization';
import { CURRENCIES, SYMBOLS } from './currencies';

/** Currencies written 1,00,000. Everything else is 100,000. */
const LAKHS = new Set(['INR', 'PKR', 'BDT', 'NPR', 'LKR']);
const RIGHT_TO_LEFT = /[\u0590-\u08FF\uFB50-\uFDFF]/;

/** Without the dust that adding decimals leaves (0.1 + 0.2 is a hair over 0.3), which could tip a budget over by nothing. Never minus zero. */
export const exact = (n: number): number => (Math.abs(n) < 1e13 ? Math.round((n + Math.sign(n) * 1e-9) * 100) / 100 + 0 : n);

export const sum = <T>(list: readonly T[], of: (item: T) => number): number => exact(list.reduce((all, item) => all + of(item), 0));

/** The short symbol. One that reads right to left scrambles next to digits, so those currencies use their code. */
export function symbolOf(code: string): string {
  const symbol = SYMBOLS[code];
  return symbol && !RIGHT_TO_LEFT.test(symbol) ? symbol : code;
}

export function groupDigits(whole: string, code: string): string {
  if (whole.length <= 3) return whole;
  const size = LAKHS.has(code) ? 2 : 3;
  const head = whole.slice(0, -3);
  const groups: string[] = [];
  for (let end = head.length; end > 0; end -= size) groups.unshift(head.slice(Math.max(0, end - size), end));
  return `${groups.join(',')},${whole.slice(-3)}`;
}

/** How money is written in one currency. Amounts are written without a sign. */
export interface Money {
  code: string;
  symbol: string;
  /** "₹1,240.00", for rows and day totals. */
  full: (n: number) => string;
  /** "₹1,240", with cents only on small amounts and when they are wanted. */
  brief: (n: number) => string;
  /** The same without the symbol, for headline amounts that set it apart. */
  briefDigits: (n: number) => string;
}

export function digits(n: number, decimals: 0 | 2, code: string): string {
  // Never a reason to stop.
  if (!Number.isFinite(n)) return '-';
  const scale = decimals === 2 ? 100 : 1;
  const rounded = Math.round(Math.abs(n) * scale + 1e-7) / scale;
  const text = rounded < 1e21 ? rounded.toFixed(decimals) : String(Math.round(rounded));
  const [whole, cents] = text.split('.');
  return groupDigits(whole, code) + (cents ? `.${cents}` : '');
}

export function money(code: string, cents: boolean): Money {
  const symbol = symbolOf(code);
  const briefDigits = (n: number) => digits(n, cents && Math.abs(n) < 100 ? 2 : 0, code);
  return { code, symbol, full: (n) => symbol + digits(n, 2, code), brief: (n) => symbol + briefDigits(n), briefDigits };
}

/** Asset prices are always in rupees. */
export const rupees = (cents = true): Money => money('INR', cents);

/** The currency for a first launch: rupees in India, whatever the phone's language, or else the region's. */
export function phoneCurrency(zone = getCalendars()[0]?.timeZone, region = getLocales()[0]?.currencyCode): string {
  if (zone === 'Asia/Kolkata' || zone === 'Asia/Calcutta') return 'INR';
  return CURRENCIES.some((c) => c.code === region) ? (region as string) : 'USD';
}
