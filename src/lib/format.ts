import { getLocales } from 'expo-localization';
import { CURRENCY_SYMBOLS } from './currencySymbols';

const symbolCache = new Map<string, string>();

/** The short symbol for a currency code (₹, $, €...). */
export function currencySymbol(code: string): string {
  const cached = symbolCache.get(code);
  if (cached) return cached;
  let symbol = CURRENCY_SYMBOLS[code] ?? code;
  // Right-to-left symbols scramble next to digits, so those currencies use their code.
  if (/[\u0590-\u08FF\uFB50-\uFDFF]/.test(symbol)) {
    symbolCache.set(code, code);
    return code;
  }
  if (symbol !== code || CURRENCY_SYMBOLS[code]) {
    symbolCache.set(code, symbol);
    return symbol;
  }
  try {
    const parts = new Intl.NumberFormat('en', { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' }).formatToParts(0);
    symbol = parts.find((p) => p.type === 'currency')?.value ?? code;
    if (/[\u0590-\u08FF\uFB50-\uFDFF]/.test(symbol)) symbol = code;
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
