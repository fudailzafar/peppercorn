import { addPeriod, daysBetween, startOf, toDay } from './dates';
import { newestFirst } from './entries';
import type { AppData, Budget, Day, Entry } from './model';
import { exact, sum } from './money';

export type Pace = 'onTrack' | 'fast' | 'over';

/** How a budget is going. */
export interface Progress {
  limit: number;
  spent: number;
  left: number;
  over: boolean;
  /** How much of the limit is used; 1 is all of it. */
  used: number;
  /** How much of the period has passed, 0 to 1. */
  elapsed: number;
  daysLeft: number;
  safePerDay: number;
  /** Over the limit, spending more than a tenth faster than the period passes, or fine. */
  pace: Pace;
}

export const endOf = (b: Budget): Day => addPeriod(b.start, b.period);

export const overallOf = (data: Pick<AppData, 'budgets'>): Budget | undefined => data.budgets.find((b) => b.categoryId === null);

/** The spending that counts toward a budget, newest first. */
export function countedIn(data: AppData, b: Budget, now: number): Entry[] {
  const from = startOf(b.start);
  return newestFirst(data.entries.filter((e) => !e.income && e.date >= from && e.date <= now && (b.categoryId === null || e.categoryId === b.categoryId)));
}

export function progressFrom(limit: number, spent: number, elapsed: number, daysLeft: number): Progress {
  const left = exact(limit - spent);
  const used = limit > 0 ? spent / limit : 0;
  const over = left < 0;
  return { limit, spent, left, over, used, elapsed, daysLeft, safePerDay: left / Math.max(1, daysLeft), pace: over ? 'over' : used > elapsed + 0.1 ? 'fast' : 'onTrack' };
}

export function progress(data: AppData, b: Budget, now: number): Progress {
  const start = startOf(b.start);
  const end = endOf(b);
  const elapsed = Math.min(1, Math.max(0, (now - start) / Math.max(1, startOf(end) - start)));
  return progressFrom(
    b.amount,
    sum(countedIn(data, b, now), (e) => e.amount),
    elapsed,
    Math.max(0, daysBetween(toDay(now), end)),
  );
}

/** A budget whose period has finished, moved on to the one now running. */
export function current(b: Budget, today: Day): Budget {
  // Counted from the first start, so a 31st doesn't drift to the 28th.
  let n = 0;
  while (addPeriod(b.start, b.period, n + 1) <= today) n++;
  return n === 0 ? b : { ...b, start: addPeriod(b.start, b.period, n) };
}
