import { addDays, addMonths, clock24, monthStart, parts, startOf, toDay, weekStart, yearStart } from './dates';
import type { AppData, Category, Day, Entry, HistorySpan, Repeat, RepeatUnit, Settings } from './model';
import { exact, sum, symbolOf } from './money';

/** Income adds, spending takes away. */
export const signed = (e: Entry): number => (e.income ? e.amount : -e.amount);

export interface Totals {
  earned: number;
  spent: number;
  net: number;
}

/** What came in and went out. */
export function totals(entries: readonly Entry[]): Totals {
  const earned = sum(entries, (e) => (e.income ? e.amount : 0));
  const spent = sum(entries, (e) => (e.income ? 0 : e.amount));
  return { earned, spent, net: exact(earned - spent) };
}

/** Entries from a day (all of them if null) up to now. */
export function since(entries: readonly Entry[], from: Day | null, now: number): Entry[] {
  const start = from === null ? -Infinity : startOf(from);
  return entries.filter((e) => e.date >= start && e.date <= now);
}

export function spanStart(span: HistorySpan, today: Day, settings: Settings): Day | null {
  switch (span) {
    case 'today':
      return today;
    case 'week':
      return weekStart(today, settings);
    case 'month':
      return monthStart(today, settings);
    case 'year':
      return yearStart(today);
    case 'all':
      return null;
  }
}

export const newestFirst = (entries: readonly Entry[]): Entry[] => [...entries].sort((a, b) => b.date - a.date);

/** Entries that belong together, such as a month's. */
export interface Group {
  /** A day, or a month's first. */
  day: Day;
  entries: Entry[];
  net: number;
}

function grouped(entries: readonly Entry[], by: (day: Day) => Day): Group[] {
  const groups = new Map<Day, Entry[]>();
  for (const e of newestFirst(entries)) {
    const key = by(toDay(e.date));
    const group = groups.get(key);
    if (group) group.push(e);
    else groups.set(key, [e]);
  }
  return [...groups].map(([day, list]) => ({ day, entries: list, net: sum(list, signed) })).sort((a, b) => (a.day < b.day ? 1 : -1));
}

/** Newest first. */
export const byDay = (entries: readonly Entry[]): Group[] => grouped(entries, (d) => d);
export const byMonth = (entries: readonly Entry[]): Group[] => grouped(entries, (d) => `${d.slice(0, 7)}-01`);

export const categoryOf = (data: Pick<AppData, 'categories'>, id: string | null): Category | undefined => data.categories.find((c) => c.id === id);

/** Entries whose note, category or amount matches. */
export function search(data: AppData, query: string): Entry[] {
  const q = query.trim().toLowerCase();
  if (q === '') return [];
  // An amount as it is written on screen, too: "₹1,240.00".
  const symbol = symbolOf(data.settings.currency).toLowerCase();
  let typed = q.replace(/^[+-]+/, '');
  for (const s of [symbol, '₹']) if (typed.startsWith(s)) typed = typed.slice(s.length);
  typed = typed.replaceAll(',', '').trim();
  const amount = /\d/.test(typed) ? typed : null;
  const names = new Map(data.categories.map((c) => [c.id, c.name.toLowerCase()]));
  return data.entries.filter(
    (e) =>
      e.note.toLowerCase().includes(q) ||
      (names.get(e.categoryId ?? '')?.includes(q) ?? false) ||
      (amount !== null && (String(e.amount).startsWith(amount) || e.amount.toFixed(2).startsWith(amount))),
  );
}

// MARK: Repeating entries

/** `steps` repeats after a day. Monthly ones keep to `keep`, or the month's last day if it is shorter. */
function after(day: Day, steps: number, r: { unit: RepeatUnit; every: number }, keep: number): Day {
  const n = Math.max(1, r.every) * steps;
  if (r.unit === 'month') return addMonths(day, n, keep);
  return addDays(day, r.unit === 'week' ? 7 * n : n);
}

/** What the person chose: how often. */
export type Often = Pick<Repeat, 'unit' | 'every'>;

/**
 * The repeat of a new or changed entry. `old` is how the entry was: days a series already covers aren't added again when
 * its latest entry moves back, or when an earlier one is set to repeat.
 */
export function schedule(often: Often, date: number, old: Entry | undefined, today: Day): Repeat {
  const own = toDay(date);
  const stays = old !== undefined && toDay(old.date) === own;
  if (stays && old.repeat?.unit === often.unit && old.repeat.every === often.every) return old.repeat;
  const keep = (stays ? old.repeat?.day : undefined) ?? parts(own).date;
  const covered = !old ? own : old.repeat ? toDay(old.date) : old.series ? today : own;
  let steps = 1;
  while (after(own, steps, often, keep) <= covered) steps++;
  return { ...often, next: after(own, steps, often, keep), ...(often.unit === 'month' ? { day: keep } : {}) };
}

/** A wrong year can't add more than this at once. */
const MOST_DUE = 2000;

/**
 * Adds the entries that have come due. Only the newest of a series still repeats; the ones behind it become ordinary
 * entries. Returns the same list if nothing was due.
 */
export function caughtUp(entries: Entry[], today: Day, newId: () => string): Entry[] {
  let changed = false;
  const out: Entry[] = [];
  for (const entry of entries) {
    const r = entry.repeat;
    if (!r || r.next > today) {
      out.push(entry);
      continue;
    }
    changed = true;
    const keep = r.day ?? parts(r.next).date;
    const nth = (n: number) => after(r.next, n, r, keep);
    let due = 0;
    while (due < MOST_DUE && nth(due) <= today) due++;
    const { repeat: _, ...plain } = entry;
    out.push(plain);
    for (let n = 0; n < due; n++) {
      out.push({
        ...plain,
        id: newId(),
        date: startOf(nth(n)),
        series: true,
        // Each purchase of an asset is priced on its own day.
        ...(entry.asset ? { rate: undefined, quantity: isFund(entry.asset) ? undefined : entry.quantity } : {}),
        ...(n === due - 1 ? { repeat: { ...r, next: nth(due) } } : {}),
      });
    }
  }
  return changed ? out : entries;
}

const isFund = (id: string) => id === 'taurus' || id === 'tata';

export interface Upcoming {
  entry: Entry;
  day: Day;
}

/** Every repeating entry's next day, soonest first. */
export const upcoming = (entries: readonly Entry[]): Upcoming[] =>
  entries.flatMap((entry) => (entry.repeat ? [{ entry, day: entry.repeat.next }] : [])).sort((a, b) => (a.day < b.day ? -1 : 1));

// MARK: Adding and changing

/** Categories to choose from for an entry. Asset prices are in rupees, so assets are only offered with rupees. */
export const choices = (data: AppData, income: boolean): Category[] =>
  data.categories.filter((c) => c.income === income && (!c.asset || data.settings.currency === 'INR')).sort((a, b) => a.order - b.order);

/** The person's own categories, in their order. */
export const ownCategories = (data: Pick<AppData, 'categories'>, income: boolean): Category[] =>
  data.categories.filter((c) => c.income === income && !c.asset).sort((a, b) => a.order - b.order);

/** Assets are named without "Fund" where room is tight. */
export const shortName = (c: Category): string => (c.asset ? c.name.replace(/ Fund$/, '') : c.name);

/** Past notes like the one being typed, the latest first. */
export function noteSuggestions(data: AppData, typed: string, income: boolean): Entry[] {
  const q = typed.trim().toLowerCase();
  if (q === '') return [];
  const seen = new Set<string>();
  const found: Entry[] = [];
  for (const e of newestFirst(data.entries)) {
    const note = e.note.toLowerCase();
    if (e.income !== income || e.asset || note === q || !note.includes(q) || seen.has(e.note)) continue;
    seen.add(e.note);
    found.push(e);
    if (found.length === 3) break;
  }
  return found;
}

/**
 * A note that is only the category's name, given because none was typed, doesn't stay when the category changes: empty
 * lets it be named again.
 */
export function noteAfter(data: AppData, old: Entry | undefined, note: string, categoryId: string | null): string {
  const was = old && categoryOf(data, old.categoryId)?.name;
  return old && categoryId !== old.categoryId && note.trim() === was ? '' : note;
}

// MARK: Exporting

const quoted = (text: string) => (/[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text);

/** Every entry, newest first, for a spreadsheet, in the phone's own time. */
export function toCsv(data: AppData): string {
  const names = new Map(data.categories.map((c) => [c.id, c.name]));
  const rows = newestFirst(data.entries).map((e) =>
    [
      `${toDay(e.date)} ${clock24(e.date)}`,
      quoted(e.note),
      quoted(names.get(e.categoryId ?? '') ?? ''),
      e.amount.toFixed(2),
      e.quantity === undefined ? '' : String(Math.round(e.quantity * 10000) / 10000),
      e.income ? 'Income' : 'Expense',
    ].join(','),
  );
  return ['Date,Note,Category,Amount,Grams or units,Type', ...rows].join('\n');
}
