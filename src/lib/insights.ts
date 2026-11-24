import { insightsEnd, insightsLabel, insightsStart, type InsightsType } from './calc';
import { addDays, dayLabel, differenceInCalendarDays, monthName, shortDate } from './dates';
import type { Category, MainBudget, Settings, Transaction } from './types';

/*
 * What the Insights screen says. Every total comes with something to compare it to, and a period still in progress is
 * compared with the same stretch of the one before ("this time last week"), never with a whole period.
 */

export interface Column {
  from: number;
  to: number;
  /** Under the bar. */
  label: string;
  /** Spoken, and shown when the bar is picked. */
  name: string;
  value: number;
  /** Hasn't started yet. */
  future: boolean;
  /** Contains now. */
  current: boolean;
}

export interface CategoryLine {
  category: Category;
  amount: number;
  share: number;
  /** The same stretch of the period before. */
  before: number;
}

export interface Period {
  start: Date;
  end: Date;
  /** Where counting stops: now for the current period, else its end. */
  until: number;
  before: { start: number; until: number };
}

export function period(type: InsightsType, offset: number, settings: Settings, now: Date): Period {
  const start = insightsStart(type, offset, settings, now);
  const end = insightsEnd(type, start);
  const until = now < end ? Math.max(now.getTime(), start.getTime()) : end.getTime();
  const prevStart = insightsStart(type, offset - 1, settings, now);
  // Months differ in length: never run past the end of the one before.
  const sofar = until >= end.getTime() ? start.getTime() : Math.min(prevStart.getTime() + (until - start.getTime()), start.getTime());
  return { start, end, until, before: { start: prevStart.getTime(), until: sofar } };
}

const within = (ts: Transaction[], from: number, to: number, income: boolean) => ts.filter((t) => t.income === income && t.date >= from && t.date < to);
const sum = (ts: Transaction[]) => ts.reduce((n, t) => n + t.amount, 0);

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Days of a week, weeks of a month (so bars stay wide enough to tap), months of a year. */
export function columns(ts: Transaction[], type: InsightsType, p: Period, income: boolean, now: Date): Column[] {
  const ranges: { from: Date; to: Date; label: string; name: string }[] = [];
  if (type === 1) {
    for (let i = 0; i < 7; i++) {
      const d = addDays(p.start, i);
      ranges.push({ from: d, to: addDays(d, 1), label: LETTERS[d.getDay()], name: dayLabel(d) });
    }
  } else if (type === 2) {
    for (let d = p.start; d < p.end; d = addDays(d, 7)) {
      const to = addDays(d, 7) < p.end ? addDays(d, 7) : p.end;
      const last = addDays(to, -1);
      const days = d.getDate() === last.getDate() ? `${d.getDate()}` : `${d.getDate()}-${last.getDate()}`;
      ranges.push({ from: d, to, label: days, name: `${days} ${monthName(d)}` });
    }
  } else {
    for (let i = 0; i < 12; i++) {
      const d = new Date(p.start.getFullYear(), i, 1);
      ranges.push({ from: d, to: new Date(p.start.getFullYear(), i + 1, 1), label: monthName(d)[0], name: `${monthName(d)} ${d.getFullYear()}` });
    }
  }
  const t = now.getTime();
  return ranges.map((r) => ({
    from: r.from.getTime(),
    to: r.to.getTime(),
    label: r.label,
    name: r.name,
    value: sum(within(ts, r.from.getTime(), Math.min(r.to.getTime(), p.until), income)),
    future: r.from.getTime() > t,
    current: r.from.getTime() <= t && t < r.to.getTime(),
  }));
}

export function total(ts: Transaction[], p: Period, income: boolean): { now: number; before: number } {
  return { now: sum(within(ts, p.start.getTime(), p.until, income)), before: sum(within(ts, p.before.start, p.before.until, income)) };
}

/** Days (or months, for a year) of the period that have happened. */
export function elapsedUnits(type: InsightsType, p: Period, now: Date): number {
  if (type === 3) return now >= p.end ? 12 : now.getMonth() + 1;
  const last = now >= p.end ? addDays(p.end, -1) : now;
  return Math.max(differenceInCalendarDays(last, p.start) + 1, 1);
}

/** Categories by amount, biggest first. With a picked column, only that stretch, without a comparison. */
export function categoryLines(ts: Transaction[], categories: Category[], p: Period, income: boolean, column?: Column): CategoryLine[] {
  const add = (list: Transaction[]) => {
    const m = new Map<string, number>();
    for (const t of list) if (t.categoryId) m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + t.amount);
    return m;
  };
  const cur = add(column ? within(ts, column.from, Math.min(column.to, p.until), income) : within(ts, p.start.getTime(), p.until, income));
  const prev = column ? new Map<string, number>() : add(within(ts, p.before.start, p.before.until, income));
  const all = [...cur.values()].reduce((n, v) => n + v, 0);
  return [...cur.entries()]
    .flatMap(([id, amount]) => {
      const category = categories.find((c) => c.id === id);
      return category ? [{ category, amount, share: all > 0 ? amount / all : 0, before: prev.get(id) ?? 0 }] : [];
    })
    .sort((a, b) => b.amount - a.amount);
}

export type Highlight =
  | { kind: 'assets'; amount: number }
  | { kind: 'forecast'; amount: number; budget: number | null }
  | { kind: 'up' | 'down'; category: Category; amount: number; change: number }
  | { kind: 'biggest'; entry: Transaction }
  | { kind: 'often'; note: string; times: number; amount: number };

/** The few things worth noticing, most useful first. At most three, and only when there is enough to go on. */
export function highlights(ts: Transaction[], categories: Category[], type: InsightsType, p: Period, income: boolean, budget: MainBudget | null, now: Date): Highlight[] {
  const list = within(ts, p.start.getTime(), p.until, income);
  const out: Highlight[] = [];
  const all = sum(list);
  if (list.length === 0) return out;

  if (!income) {
    const saved = sum(list.filter((t) => t.asset));
    if (saved > 0) out.push({ kind: 'assets', amount: saved });

    // A month in progress, with a few days behind it: everyday spending carried forward, one-off asset purchases not.
    if (type === 2 && now < p.end && now >= p.start) {
      const days = elapsedUnits(2, p, now);
      const length = differenceInCalendarDays(p.end, p.start);
      if (days >= 7 && days < length - 1) {
        const monthly = budget && budget.type === 3 ? budget.amount : null;
        out.push({ kind: 'forecast', amount: ((all - saved) / days) * length + saved, budget: monthly });
      }
    }

    const lines = categoryLines(ts, categories, p, false).filter((l) => !l.category.asset && l.before > 0);
    const least = Math.max((all - saved) * 0.05, 1);
    const up = [...lines].sort((a, b) => b.amount - b.before - (a.amount - a.before))[0];
    if (up && up.amount - up.before >= least) out.push({ kind: 'up', category: up.category, amount: up.amount, change: up.amount - up.before });
    const down = [...lines].sort((a, b) => a.amount - a.before - (b.amount - b.before))[0];
    if (down && down.before - down.amount >= least) out.push({ kind: 'down', category: down.category, amount: down.amount, change: down.before - down.amount });
  }

  const everyday = list.filter((t) => !t.asset);
  const biggest = [...everyday].sort((a, b) => b.amount - a.amount)[0];
  if (everyday.length >= 3 && biggest.amount >= sum(everyday) * 0.2) out.push({ kind: 'biggest', entry: biggest });

  if (!income) {
    const notes = new Map<string, Transaction[]>();
    for (const t of everyday) {
      const key = t.note.trim().toLowerCase();
      if (key && !categories.some((c) => c.name.toLowerCase() === key)) notes.set(key, [...(notes.get(key) ?? []), t]);
    }
    const often = [...notes.values()].sort((a, b) => b.length - a.length)[0];
    if (often && often.length >= 3) out.push({ kind: 'often', note: often[0].note, times: often.length, amount: sum(often) });
  }
  return out.slice(0, 3);
}

/** The same category over the last six periods, ending with this one. */
export function trend(ts: Transaction[], categoryId: string, type: InsightsType, offset: number, income: boolean, settings: Settings, now: Date): Column[] {
  return Array.from({ length: 6 }, (_, i) => offset - 5 + i).map((o) => {
    const p = period(type, o, settings, now);
    return {
      from: p.start.getTime(),
      to: p.end.getTime(),
      label: type === 1 ? shortDate(p.start, now).replace(/ \d{4}$/, '') : type === 2 ? monthName(p.start) : String(p.start.getFullYear()),
      name: insightsLabel(type, p.start),
      value: sum(within(ts, p.start.getTime(), p.until, income).filter((t) => t.categoryId === categoryId)),
      future: false,
      current: o === offset,
    };
  });
}

export const UNIT: Record<InsightsType, string> = { 1: 'week', 2: 'month', 3: 'year' };

/** "this week", "last week", "in 2 - 8 Nov" */
export function periodPhrase(type: InsightsType, offset: number, start: Date): string {
  return offset === 0 ? `this ${UNIT[type]}` : offset === -1 ? `last ${UNIT[type]}` : `in ${insightsLabel(type, start)}`;
}
