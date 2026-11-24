// Aggregations behind the Log, Insights and Budget screens (port of Dime's DataController queries).

import {
  addDays,
  addMonths,
  addPeriod,
  differenceInCalendarDays,
  nextTransactionDate,
  startOfCustomMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  monthName,
} from './dates';
import type { Budget, BudgetType, MainBudget, Settings, Transaction } from './types';

// MARK: Log

/** Start of the Log header's period. `null` = all time. */
export function logPeriodStart(timeFrame: Settings['logTimeFrame'], settings: Settings, now = new Date()): Date | null {
  switch (timeFrame) {
    case 1: return startOfDay(now);
    case 2: return startOfWeek(now, settings.firstWeekday);
    case 3: return startOfCustomMonth(now, settings.firstDayOfMonth);
    case 4: return startOfYear(now);
    default: return null;
  }
}

export interface Totals {
  spent: number;
  income: number;
  /** income - spent. */
  net: number;
}

export function totalsSince(transactions: Transaction[], start: Date | null, now = Date.now()): Totals {
  let spent = 0;
  let income = 0;
  const from = start ? start.getTime() : -Infinity;
  for (const t of transactions) {
    if (t.date < from || t.date > now) continue;
    if (t.income) income += t.amount;
    else spent += t.amount;
  }
  return { spent, income, net: income - spent };
}

export interface DayGroup {
  day: number; // start of day, epoch ms
  items: Transaction[];
  net: number;
}

/** Groups transactions by day, newest first. */
export function groupByDay(transactions: Transaction[]): DayGroup[] {
  const map = new Map<number, Transaction[]>();
  for (const t of transactions) {
    const key = startOfDay(t.date).getTime();
    const list = map.get(key);
    if (list) list.push(t);
    else map.set(key, [t]);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([day, items]) => {
      items.sort((a, b) => b.date - a.date);
      const net = items.reduce((n, t) => n + (t.income ? t.amount : -t.amount), 0);
      return { day, items, net };
    });
}

export interface MonthGroup {
  /** Start of the month, epoch ms. */
  month: number;
  items: Transaction[];
  net: number;
}

/** Groups transactions by calendar month, newest first. */
export function groupByMonth(transactions: Transaction[]): MonthGroup[] {
  const map = new Map<number, Transaction[]>();
  for (const t of transactions) {
    const key = startOfMonth(t.date).getTime();
    const list = map.get(key);
    if (list) list.push(t);
    else map.set(key, [t]);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([month, items]) => {
      items.sort((a, b) => b.date - a.date);
      return { month, items, net: items.reduce((n, t) => n + (t.income ? t.amount : -t.amount), 0) };
    });
}

export interface Upcoming {
  transaction: Transaction;
  date: number;
}

/** Next occurrence of every recurring transaction, soonest first. */
export function upcoming(transactions: Transaction[]): Upcoming[] {
  return transactions
    .filter((t) => t.recurringType > 0)
    .map((t) => ({ transaction: t, date: nextTransactionDate(t).getTime() }))
    .sort((a, b) => a.date - b.date);
}

// MARK: Insights

/** 1 = week, 2 = month, 3 = year. */
export type InsightsType = 1 | 2 | 3;

/** Start of the insights period `offset` periods from the current one. */
export function insightsStart(type: InsightsType, offset: number, settings: Settings, now = new Date()): Date {
  if (type === 1) return addDays(startOfWeek(now, settings.firstWeekday), offset * 7);
  if (type === 2) return addMonths(startOfMonth(now), offset);
  return new Date(now.getFullYear() + offset, 0, 1);
}

export function insightsEnd(type: InsightsType, start: Date): Date {
  if (type === 1) return addDays(start, 7);
  if (type === 2) return addMonths(start, 1);
  return new Date(start.getFullYear() + 1, 0, 1);
}

export function insightsLabel(type: InsightsType, start: Date): string {
  if (type === 1) {
    const end = addDays(start, 6);
    return start.getMonth() === end.getMonth()
      ? `${start.getDate()} - ${end.getDate()} ${monthName(end)}`
      : `${start.getDate()} ${monthName(start)} - ${end.getDate()} ${monthName(end)}`;
  }
  if (type === 2) return `${monthName(start)} ${start.getFullYear()}`;
  return String(start.getFullYear());
}

// MARK: Budgets

export function budgetEnd(b: { startDate: number; type: BudgetType }): Date {
  return addPeriod(new Date(b.startDate), b.type);
}

/** Money spent against a category budget in its current period. */
export function budgetSpent(b: Budget, transactions: Transaction[], now = Date.now()): number {
  return transactions
    .filter((t) => !t.income && t.categoryId === b.categoryId && t.date >= b.startDate && t.date <= now)
    .reduce((n, t) => n + t.amount, 0);
}

export function mainBudgetSpent(b: MainBudget, transactions: Transaction[], now = Date.now()): number {
  return transactions.filter((t) => !t.income && t.date >= b.startDate && t.date <= now).reduce((n, t) => n + t.amount, 0);
}

export interface BudgetProgress {
  amount: number;
  spent: number;
  left: number;
  /** 0-1 of the budget used (can exceed 1). */
  fraction: number;
  /** 0-1 of the period elapsed (where the pace marker sits). */
  elapsed: number;
  daysLeft: number;
  over: boolean;
}

export function budgetProgress(b: { amount: number; startDate: number; type: BudgetType }, spent: number, now = new Date()): BudgetProgress {
  const start = b.startDate;
  const end = budgetEnd(b).getTime();
  const elapsed = end > start ? Math.min(1, Math.max(0, (now.getTime() - start) / (end - start))) : 0;
  const left = b.amount - spent;
  return {
    amount: b.amount,
    spent,
    left,
    fraction: b.amount > 0 ? spent / b.amount : 0,
    elapsed,
    daysLeft: Math.max(0, differenceInCalendarDays(new Date(end), now)),
    over: left < 0,
  };
}

/** Over the limit, spending faster than the period is passing (by more than a tenth), or fine. */
export function budgetPace(p: BudgetProgress): 'over' | 'fast' | 'ok' {
  if (p.over) return 'over';
  return p.fraction > p.elapsed + 0.1 ? 'fast' : 'ok';
}

/** The transactions that count toward a budget, newest first. */
export function budgetTransactions(
  b: { startDate: number; type: BudgetType; categoryId?: string },
  transactions: Transaction[],
  now = Date.now(),
): Transaction[] {
  return transactions
    .filter((t) => !t.income && t.date >= b.startDate && t.date <= now && (b.categoryId === undefined || t.categoryId === b.categoryId))
    .sort((a, c) => c.date - a.date);
}
