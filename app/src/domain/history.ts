import { addDays, addMonths, daysLabel, monthLabel, monthStart, monthYear, startOf, weekdayLabel, weekStart } from './dates';
import { byMonth, upcoming } from './entries';
import type { AppData, Category, Day, Entry } from './model';

/* What the History screen lists. */

export type HistoryFilter = 'all' | 'type' | 'day' | 'week' | 'month' | 'category' | 'repeating' | 'upcoming';

export type HistoryRow = { kind: 'heading'; key: string; label: string; net: number | null } | { kind: 'entry'; key: string; entry: Entry; due?: Day };

/** Where the arrows have stepped to: the day, week, month or category shown, and what it is called. */
export interface Step {
  label: string;
  from?: Day;
  to?: Day;
  category?: Category;
}

export function stepOf(filter: HistoryFilter, by: number, data: AppData, today: Day): Step | null {
  switch (filter) {
    case 'day': {
      const from = addDays(today, by);
      return { label: by === 0 ? 'Today' : weekdayLabel(from, today), from, to: addDays(from, 1) };
    }
    case 'week': {
      const from = addDays(weekStart(today, data.settings), 7 * by);
      return { label: by === 0 ? 'This week' : daysLabel(from, addDays(from, 6)), from, to: addDays(from, 7) };
    }
    case 'month': {
      const from = addMonths(monthStart(today, data.settings), by);
      return { label: by === 0 ? 'This month' : monthLabel(from, today), from, to: addMonths(from, 1) };
    }
    case 'category': {
      const all = [...data.categories].sort((a, b) => Number(a.income) - Number(b.income) || a.order - b.order);
      const category = all[((by % all.length) + all.length) % all.length];
      return category ? { label: `${category.emoji}  ${category.name}`, category } : null;
    }
    default:
      return null;
  }
}

function matching(filter: HistoryFilter, entries: readonly Entry[], step: Step | null, income: boolean): readonly Entry[] {
  if (filter === 'type') return entries.filter((e) => e.income === income);
  if (filter === 'repeating') return entries.filter((e) => e.repeat);
  if (filter === 'upcoming') return [];
  if (step?.category) return entries.filter((e) => e.categoryId === step.category?.id);
  if (step?.from && step.to) {
    const [from, to] = [startOf(step.from), startOf(step.to)];
    return entries.filter((e) => e.date >= from && e.date < to);
  }
  return entries;
}

/** Headings and entries, newest first. Upcoming ones, when they are wanted, come before them. */
export function historyRows(data: AppData, filter: HistoryFilter, step: Step | null, income: boolean): HistoryRow[] {
  const out: HistoryRow[] = [];
  const next = filter === 'upcoming' || (filter === 'all' && data.settings.upcoming) ? upcoming(data.entries) : [];
  if (next.length > 0) out.push({ kind: 'heading', key: 'upcoming', label: 'Upcoming', net: null });
  for (const { entry, day } of next) out.push({ kind: 'entry', key: `due ${entry.id}`, entry, due: day });
  for (const { day, net, entries } of byMonth(matching(filter, data.entries, step, income))) {
    out.push({ kind: 'heading', key: day, label: monthYear(day), net });
    for (const entry of entries) out.push({ kind: 'entry', key: entry.id, entry });
  }
  return out;
}
