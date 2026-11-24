// Aggregations behind the Log, Insights and Budget screens (port of Dime's DataController queries).

import {
  addDays,
  addMonths,
  addPeriod,
  daysInMonth,
  differenceInCalendarDays,
  nextTransactionDate,
  startOfCustomMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  monthName,
} from './dates';
import type { Budget, BudgetType, Category, MainBudget, Settings, Transaction } from './types';

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

function inPeriod(transactions: Transaction[], from: Date, to: Date, income?: boolean) {
  const a = from.getTime();
  const b = to.getTime();
  return transactions.filter((t) => t.date >= a && t.date < b && (income === undefined || t.income === income));
}

export interface InsightsData {
  amount: number;
  maximum: number;
  average: number;
  dates: Date[];
  values: number[];
}

/** Per-bucket totals (days for week/month, months for year) for the bar chart. */
export function getInsights(transactions: Transaction[], type: InsightsType, start: Date, income: boolean, now = new Date()): InsightsData {
  const end = insightsEnd(type, start);
  const txs = inPeriod(transactions, start, end, income);
  const dates: Date[] = [];
  const values: number[] = [];
  const bucketCount = type === 1 ? 7 : type === 2 ? daysInMonth(start) : 12;

  for (let i = 0; i < bucketCount; i++) {
    const from = type === 3 ? new Date(start.getFullYear(), i, 1) : addDays(start, i);
    const to = type === 3 ? new Date(start.getFullYear(), i + 1, 1) : addDays(start, i + 1);
    dates.push(from);
    values.push(txs.filter((t) => t.date >= from.getTime() && t.date < to.getTime()).reduce((n, t) => n + t.amount, 0));
  }

  const amount = values.reduce((n, v) => n + v, 0);
  const maximum = Math.max(0, ...values);
  const elapsed = elapsedBuckets(type, start, end, now, bucketCount);
  return { amount, maximum, average: amount / elapsed, dates, values };
}

/** How many buckets of the period have happened (so the average ignores the future). */
function elapsedBuckets(type: InsightsType, start: Date, end: Date, now: Date, bucketCount: number) {
  if (now >= end) return bucketCount;
  if (now < start) return bucketCount;
  if (type === 3) return now.getMonth() + 1;
  return differenceInCalendarDays(now, start) + 1;
}

export interface InsightsSummary {
  spent: number;
  income: number;
  /** Absolute net and its sign. */
  net: number;
  positive: boolean;
  average: number;
}

export function getInsightsSummary(transactions: Transaction[], type: InsightsType, start: Date, now = new Date()): InsightsSummary {
  const end = insightsEnd(type, start);
  let spent = 0;
  let income = 0;
  for (const t of inPeriod(transactions, start, end)) {
    if (t.income) income += t.amount;
    else spent += t.amount;
  }
  const net = income - spent;
  const bucketCount = type === 1 ? 7 : type === 2 ? daysInMonth(start) : 12;
  const elapsed = elapsedBuckets(type, start, end, now, bucketCount);
  return { spent, income, net: Math.abs(net), positive: net >= 0, average: Math.abs(net) / elapsed };
}

export interface CategoryShare {
  category: Category;
  amount: number;
  percent: number;
}

export function categoryBreakdown(
  transactions: Transaction[],
  categories: Category[],
  type: InsightsType,
  start: Date,
  income: boolean,
): CategoryShare[] {
  const txs = inPeriod(transactions, start, insightsEnd(type, start), income);
  const totals = new Map<string, number>();
  for (const t of txs) if (t.categoryId) totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
  const sum = [...totals.values()].reduce((n, v) => n + v, 0);
  return [...totals.entries()]
    .map(([id, amount]) => ({ category: categories.find((c) => c.id === id), amount }))
    .filter((x): x is { category: Category; amount: number } => x.category !== undefined)
    .sort((a, b) => b.amount - a.amount)
    .map((x) => ({ ...x, percent: sum === 0 ? 0 : (x.amount / sum) * 100 }));
}

/** Signed % change of net vs the previous period; null when there is nothing to compare. */
export function netChange(transactions: Transaction[], type: InsightsType, offset: number, settings: Settings, now = new Date()) {
  const cur = getInsightsSummary(transactions, type, insightsStart(type, offset, settings, now), now);
  const prev = getInsightsSummary(transactions, type, insightsStart(type, offset - 1, settings, now), now);
  const curNet = cur.positive ? cur.net : -cur.net;
  const prevNet = prev.positive ? prev.net : -prev.net;
  if (prevNet === 0) return null;
  return ((curNet - prevNet) / Math.abs(prevNet)) * 100;
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
