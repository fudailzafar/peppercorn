// Amount entry, ported from Dime's NumberPad.
//   Type 1: digits shift in as cents ("1","2","5" -> 0.01, 0.12, 1.25)
//   Type 2: decimal point entry ("12.5"), at most two decimals

import { fmtFull, groupDigits } from './format';

export type EntryType = 1 | 2;

const MAX_DIGITS = 9;

export function pressDigit(raw: string, digit: number, type: EntryType, decimals = 2): string {
  if (type === 1) {
    const next = (raw + String(digit)).replace(/^0+/, '');
    return next.length > MAX_DIGITS ? raw : next;
  }
  const [int, frac] = raw.split('.');
  if (frac !== undefined) return frac.length >= decimals ? raw : `${raw}${digit}`;
  const nextInt = (int === '0' || int === '' ? '' : int) + String(digit);
  return nextInt.length > MAX_DIGITS ? raw : nextInt;
}

export function pressDot(raw: string, type: EntryType): string {
  if (type === 1 || raw.includes('.')) return raw;
  return `${raw === '' ? '0' : raw}.`;
}

export function pressDelete(raw: string): string {
  return raw.slice(0, -1);
}

export function toNumber(raw: string, type: EntryType): number {
  if (raw === '' || raw === '.') return 0;
  return type === 1 ? Number(raw) / 100 : parseFloat(raw);
}

/** What the big number shows while typing. */
export function display(raw: string, type: EntryType): string {
  if (type === 1) return fmtFull(Number(raw || '0') / 100);
  if (raw === '') return '0';
  const [int, frac] = raw.split('.');
  const grouped = groupDigits(int === '' ? '0' : int);
  return frac === undefined ? grouped : `${grouped}.${frac}`;
}

/** The raw string for an existing amount (editing a transaction). */
export function fromNumber(value: number, type: EntryType, decimals = 2): string {
  if (type === 1) return String(Math.round(value * 100));
  const text = Number.isInteger(value) ? String(value) : value.toFixed(decimals).replace(/0+$/, '');
  return text === '0' ? '' : text;
}
