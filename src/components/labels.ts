import type { Often } from '../domain/entries';
import type { HapticLevel, HistorySpan, HistoryTotal, RepeatUnit, Theme } from '../domain/model';

/* What choices are called. */

export const THEMES: readonly (readonly [Theme, string])[] = [
  ['system', 'System'],
  ['light', 'Light'],
  ['dark', 'Dark'],
];

export const HAPTICS: readonly (readonly [HapticLevel, string])[] = [
  ['off', 'Off'],
  ['light', 'Subtle'],
  ['strong', 'Heavy'],
];

export const SPANS: readonly (readonly [HistorySpan, string])[] = [
  ['today', 'Today'],
  ['week', 'This week'],
  ['month', 'This month'],
  ['year', 'This year'],
  ['all', 'All time'],
];

export const TOTALS: readonly (readonly [HistoryTotal, string])[] = [
  ['spent', 'Spent'],
  ['earned', 'Earned'],
  ['net', 'Net total'],
];

export const labelIn = <T>(list: readonly (readonly [T, string])[], value: T): string => list.find(([v]) => v === value)?.[1] ?? '';

export const OFTEN: Record<RepeatUnit, string> = { day: 'Daily', week: 'Weekly', month: 'Monthly' };

/** "Repeats weekly", "Every 2 weeks" */
export function repeatLabel(often: Often | null): string {
  if (!often) return 'Doesn’t repeat';
  return often.every === 1 ? `Repeats ${OFTEN[often.unit].toLowerCase()}` : `Every ${often.every} ${often.unit}s`;
}

export const countOf = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
