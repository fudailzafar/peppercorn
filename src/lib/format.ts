import { getLocales } from 'expo-localization';
import { CURRENCY_SYMBOLS } from './currencySymbols';

const symbolCache = new Map<string, string>();

/** The short symbol for a currency code (₹, $, €...). */
export function currencySymbol(code: string): string {
  const cached = symbolCache.get(code);
  if (cached) return cached;
  let symbol = CURRENCY_SYMBOLS[code] ?? code;
  if (symbol !== code || CURRENCY_SYMBOLS[code]) {
    symbolCache.set(code, symbol);
    return symbol;
  }
  try {
    const parts = new Intl.NumberFormat('en', { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' }).formatToParts(0);
    symbol = parts.find((p) => p.type === 'currency')?.value ?? code;
  } catch {
    // Unknown code: fall back to the code itself.
  }
  symbolCache.set(code, symbol);
  return symbol;
}

/** The device's currency, used as the first-launch default. */
export function defaultCurrency(): string {
  return getLocales()[0]?.currencyCode ?? 'USD';
}

const INDIAN = new Set(['INR', 'PKR', 'BDT', 'NPR', 'LKR']);
let indian = INDIAN.has(defaultCurrency());
/** Rupee and taka amounts group as 1,00,000; everything else as 100,000. */
export function setGroupingCurrency(code: string) {
  indian = INDIAN.has(code);
}
export const groupDigits = (int: string) =>
  indian && int.length > 3 ? `${int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${int.slice(-3)}` : int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function group(n: number, decimals: number) {
  const fixed = Math.abs(n).toFixed(decimals);
  const [int, frac] = fixed.split('.');
  const grouped = groupDigits(int);
  return frac ? `${grouped}.${frac}` : grouped;
}

/** Always two decimals: log rows and day totals. */
export const fmtFull = (n: number) => group(n, 2);

/** Cents only for small values (< 100) when enabled: headline numbers. */
export const fmtSmart = (n: number, showCents: boolean) => group(n, showCents && Math.abs(n) < 100 ? 2 : 0);

/** Two decimals under 1000, none above: the Insights summary blocks. */
export const fmtBlock = (n: number, showCents: boolean) => group(n, showCents && Math.abs(n) < 1000 ? 2 : 0);

/** "3.1k" style, for chart axes. */
export function fmtAxis(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`;
  return String(Math.round(n));
}

/** Rounds an axis maximum up to a friendly number. */
export function niceMax(n: number) {
  if (n <= 0) return 10;
  const exp = Math.pow(10, Math.floor(Math.log10(n)));
  const f = n / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : f <= 7.5 ? 7.5 : 10;
  return Math.round(nice * exp * 100) / 100;
}
