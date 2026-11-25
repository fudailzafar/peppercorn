import { addDays, addMonths, dayAndMonth, daysBetween, daysLabel, monthLabel, monthName, monthStart, parts, startOf, toDay, weekdayLabel, weekdayLetter, weekStart, yearStart } from './dates';
import { overallOf } from './budgets';
import { categoryOf } from './entries';
import type { AppData, Category, Day, Entry, Settings } from './model';
import { sum } from './money';

/*
 * What the Insights screen says. Every total comes with something to compare it to, and a period still in progress is
 * compared with the same stretch of the one before ("this time last week"), never with a whole period.
 */

export type Span = 'week' | 'month' | 'year';

/** One week, month or year. `offset` counts back from the current one (0, -1, -2...). */
export interface Period {
  span: Span;
  offset: number;
  start: Day;
  end: Day;
  from: number;
  /** Where counting stops: now, or its end. */
  until: number;
  beforeFrom: number;
  beforeUntil: number;
  finished: boolean;
  label: string;
}

function startAt(span: Span, offset: number, today: Day, settings: Settings): Day {
  switch (span) {
    case 'week':
      return addDays(weekStart(today, settings), 7 * offset);
    case 'month':
      return addMonths(monthStart(today, settings), offset);
    case 'year':
      return addMonths(yearStart(today), 12 * offset);
  }
}

function labelOf(span: Span, start: Day, end: Day, today: Day): string {
  if (span === 'week') return daysLabel(start, addDays(end, -1));
  return span === 'month' ? monthLabel(start, today) : String(parts(start).year);
}

export function periodOf(span: Span, offset: number, now: number, settings: Settings): Period {
  const today = toDay(now);
  const start = startAt(span, offset, today, settings);
  const end = startAt(span, offset + 1, today, settings);
  const from = startOf(start);
  const to = startOf(end);
  const until = Math.min(Math.max(now, from), to);
  const beforeFrom = startOf(startAt(span, offset - 1, today, settings));
  const finished = until >= to;
  // Months differ in length: never past the end of the one before.
  const beforeUntil = finished ? from : Math.min(beforeFrom + (until - from), from);
  return { span, offset, start, end, from, until, beforeFrom, beforeUntil, finished, label: labelOf(span, start, end, today) };
}

/** "this week", "last week", "in 2 - 8 Nov" */
export const phrase = (p: Period): string => (p.offset === 0 ? `this ${p.span}` : p.offset === -1 ? `last ${p.span}` : `in ${p.label}`);

/** What a period is compared to. */
export const against = (p: Period): string => (p.offset === 0 ? `this time last ${p.span}` : `the ${p.span} before`);

const within = (entries: readonly Entry[], from: number, to: number, income: boolean) => entries.filter((e) => e.income === income && e.date >= from && e.date < to);
const amount = (entries: readonly Entry[]) => sum(entries, (e) => e.amount);

export interface Compared {
  now: number;
  before: number;
}

export const compared = (entries: readonly Entry[], p: Period, income: boolean): Compared => ({
  now: amount(within(entries, p.from, p.until, income)),
  before: amount(within(entries, p.beforeFrom, p.beforeUntil, income)),
});

/** One bar of a chart. */
export interface Column {
  from: number;
  to: number;
  /** Under the bar. */
  label: string;
  /** Spoken, and shown when picked. */
  name: string;
  value: number;
  future: boolean;
  current: boolean;
}

/** Days of a week, weeks of a month (so bars stay wide enough to tap), months of a year. */
export function columns(entries: readonly Entry[], p: Period, income: boolean, now: number): Column[] {
  const today = toDay(now);
  const column = (first: Day, next: Day, label: string, name: string): Column => {
    const from = startOf(first);
    const to = startOf(next);
    return { from, to, label, name, value: amount(within(entries, from, Math.min(to, p.until), income)), future: from > now, current: now >= from && now < to };
  };
  if (p.span === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(p.start, i);
      return column(day, addDays(day, 1), weekdayLetter(day), weekdayLabel(day, today));
    });
  }
  if (p.span === 'year') {
    return Array.from({ length: 12 }, (_, i) => {
      const first = addMonths(p.start, i);
      return column(first, addMonths(first, 1), monthName(first)[0], `${monthName(first)} ${parts(first).year}`);
    });
  }
  const weeks: Column[] = [];
  for (let first = p.start; first < p.end; first = addDays(first, 7)) {
    const seventh = addDays(first, 7);
    const next = seventh < p.end ? seventh : p.end;
    const last = addDays(next, -1);
    const dates = first === last ? String(parts(last).date) : `${parts(first).date}-${parts(last).date}`;
    weeks.push(column(first, next, dates, monthName(first) === monthName(last) ? `${dates} ${monthName(first)}` : daysLabel(first, last)));
  }
  return weeks;
}

/** Days (months, for a year) of the period that have happened. */
export function elapsedUnits(p: Period, now: number): number {
  const last = p.finished ? addDays(p.end, -1) : toDay(now);
  return p.span === 'year' ? parts(last).month : daysBetween(p.start, last) + 1;
}

/** A category's part of a total. */
export interface CategoryLine {
  category: Category;
  amount: number;
  share: number;
  /** The same stretch of the period before. */
  before: number;
}

function byCategory(entries: readonly Entry[]): Map<string, number> {
  const all = new Map<string, Entry[]>();
  for (const e of entries) if (e.categoryId) all.set(e.categoryId, [...(all.get(e.categoryId) ?? []), e]);
  return new Map([...all].map(([id, list]) => [id, amount(list)]));
}

/** Categories by amount, biggest first. With a picked column, only that stretch, with nothing to compare to. */
export function categoryLines(data: AppData, entries: readonly Entry[], p: Period, income: boolean, column?: Column): CategoryLine[] {
  const now = byCategory(column ? within(entries, column.from, Math.min(column.to, p.until), income) : within(entries, p.from, p.until, income));
  const before = column ? new Map<string, number>() : byCategory(within(entries, p.beforeFrom, p.beforeUntil, income));
  const all = [...now.values()].reduce((a, b) => a + b, 0);
  return [...now]
    .flatMap(([id, value]) => {
      const category = categoryOf(data, id);
      return category ? [{ category, amount: value, share: all > 0 ? value / all : 0, before: before.get(id) ?? 0 }] : [];
    })
    .sort((a, b) => b.amount - a.amount);
}

export type Highlight =
  | { kind: 'assets'; amount: number }
  | { kind: 'forecast'; amount: number; budget: number | null }
  | { kind: 'change'; category: Category; amount: number; before: number }
  | { kind: 'biggest'; entry: Entry }
  | { kind: 'often'; note: string; times: number; amount: number };

/** A month with a few days behind it: everyday spending carried forward, one-off asset purchases not. */
function forecast(data: AppData, p: Period, everyday: number, assets: number, now: number): Highlight | null {
  if (p.span !== 'month' || p.finished) return null;
  const gone = elapsedUnits(p, now);
  const length = daysBetween(p.start, p.end);
  if (gone < 7 || gone > length - 2) return null;
  const overall = overallOf(data);
  const same = overall?.period === 'month' && overall.start === p.start;
  return { kind: 'forecast', amount: (everyday / gone) * length + assets, budget: same ? overall.amount : null };
}

/** The categories that rose and fell the most, if by enough to matter. */
function changes(data: AppData, p: Period, everyday: number): Highlight[] {
  const least = Math.max(everyday * 0.05, 1);
  const moved = categoryLines(data, data.entries, p, false)
    .filter((l) => !l.category.asset && l.before > 0)
    .sort((a, b) => b.amount - b.before - (a.amount - a.before));
  const up = moved.at(0);
  const down = moved.at(-1);
  const found: Highlight[] = [];
  if (up && up.amount - up.before >= least) found.push({ kind: 'change', category: up.category, amount: up.amount, before: up.before });
  if (down && down.before - down.amount >= least) found.push({ kind: 'change', category: down.category, amount: down.amount, before: down.before });
  return found;
}

/** The note that comes up most, unless it is only a category's name. */
function often(data: AppData, everyday: readonly Entry[]): Highlight | null {
  const names = new Set(data.categories.map((c) => c.name.toLowerCase()));
  const notes = new Map<string, Entry[]>();
  for (const e of everyday) {
    const note = e.note.trim().toLowerCase();
    if (note !== '' && !names.has(note)) notes.set(note, [...(notes.get(note) ?? []), e]);
  }
  const most = [...notes.values()].sort((a, b) => b.length - a.length).at(0);
  return most && most.length >= 3 ? { kind: 'often', note: most[0].note, times: most.length, amount: amount(most) } : null;
}

/** The few things worth noticing, most useful first: at most three, and only when there is enough to go on. */
export function highlights(data: AppData, p: Period, income: boolean, now: number): Highlight[] {
  const list = within(data.entries, p.from, p.until, income);
  if (list.length === 0) return [];
  const everyday = list.filter((e) => !e.asset);
  const spent = amount(everyday);
  const out: (Highlight | null)[] = [];
  if (!income) {
    const assets = amount(list.filter((e) => e.asset));
    if (assets > 0) out.push({ kind: 'assets', amount: assets });
    out.push(forecast(data, p, spent, assets, now), ...changes(data, p, spent));
  }
  const biggest = [...everyday].sort((a, b) => b.amount - a.amount).at(0);
  if (biggest && everyday.length >= 3 && biggest.amount >= spent * 0.2) out.push({ kind: 'biggest', entry: biggest });
  if (!income) out.push(often(data, everyday));
  return out.filter((h): h is Highlight => h !== null).slice(0, 3);
}

/** One category over the last six periods, ending with this one. */
export function trend(data: AppData, categoryId: string, p: Period, income: boolean, now: number): Column[] {
  const mine = data.entries.filter((e) => e.categoryId === categoryId);
  return Array.from({ length: 6 }, (_, i) => {
    const offset = p.offset - 5 + i;
    const q = periodOf(p.span, offset, now, data.settings);
    const label = p.span === 'week' ? dayAndMonth(q.start) : p.span === 'month' ? monthName(q.start) : String(parts(q.start).year);
    return { from: q.from, to: startOf(q.end), label, name: q.label, value: amount(within(mine, q.from, q.until, income)), future: false, current: offset === p.offset };
  });
}

/** How far back there is anything to show. */
export function oldestOffset(data: AppData, span: Span, now: number): number {
  const first = data.entries.reduce((least, e) => Math.min(least, e.date), Infinity);
  if (first === Infinity) return 0;
  const a = startAt(span, 0, toDay(now), data.settings);
  const b = toDay(Math.min(first, now));
  if (span === 'week') return Math.min(0, -Math.ceil(daysBetween(b, a) / 7));
  if (span === 'year') return Math.min(0, parts(b).year - parts(a).year);
  const start = monthStart(b, data.settings);
  return Math.min(0, (parts(start).year - parts(a).year) * 12 + parts(start).month - parts(a).month);
}
