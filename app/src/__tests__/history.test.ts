import { toDay } from '@/domain/dates';
import { historyRows, stepOf, type HistoryFilter } from '@/domain/history';
import { entry, NOW, sample } from './fakes';

const today = toDay(NOW);
const list = (filter: HistoryFilter, by = 0, income = false, data = sample) => historyRows(data, filter, stepOf(filter, by, data, today), income);
const entries = (rows: ReturnType<typeof list>) => rows.flatMap((r) => (r.kind === 'entry' ? [r.entry] : []));

const repeating = entry('rent', 9500, NOW, { categoryId: 'bills', repeat: { unit: 'month', every: 1, next: '2026-12-03' } });
const withRepeat = { ...sample, entries: [...sample.entries, repeating] };

test('everything is listed by month, newest first', () => {
  const rows = list('all');
  expect(rows.filter((r) => r.kind === 'heading').map((r) => r.label)).toEqual(['November 2026', 'October 2026']);
  expect(entries(rows)).toHaveLength(sample.entries.length);
});

test('keys are never shared, also by an entry that is listed twice', () => {
  const keys = list('all', 0, false, withRepeat).map((r) => r.key);
  expect(new Set(keys).size).toBe(keys.length);
});

test('what is upcoming comes first, unless it is hidden', () => {
  expect(list('all', 0, false, withRepeat)[0]).toMatchObject({ label: 'Upcoming' });
  const hidden = { ...withRepeat, settings: { ...withRepeat.settings, upcoming: false } };
  expect(list('all', 0, false, hidden)[0]).toMatchObject({ label: 'November 2026' });
  expect(entries(list('upcoming', 0, false, hidden))).toEqual([repeating]);
});

test('a day, a week and a month hold only their own', () => {
  expect(entries(list('day')).map((e) => toDay(e.date))).toEqual(['2026-11-24', '2026-11-24']);
  expect(entries(list('day', 1))).toEqual([]);
  expect(entries(list('week')).every((e) => toDay(e.date) >= '2026-11-23')).toBe(true);
  expect(entries(list('month', -1)).every((e) => toDay(e.date).startsWith('2026-10'))).toBe(true);
  expect(stepOf('month', -1, sample, today)?.label).toBe('Oct 2026');
});

test('types and categories are told apart, and stepping past the last category starts over', () => {
  expect(entries(list('type', 0, true)).every((e) => e.income)).toBe(true);
  expect(entries(list('category')).every((e) => e.categoryId === 'food')).toBe(true);
  expect(stepOf('category', sample.categories.length, sample, today)).toEqual(stepOf('category', 0, sample, today));
  expect(stepOf('category', -1, sample, today)?.category?.id).toBe('salary');
});
