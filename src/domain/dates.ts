import type { BudgetPeriod, Day, Settings } from './model';

/* Days are text ("2026-11-24"), which sorts as dates do. Arithmetic on them never meets a time zone. */

// The app is in English, so its dates are too, whatever the phone's language.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MS_PER_DAY = 86_400_000;

const two = (n: number) => String(n).padStart(2, '0');

export const makeDay = (year: number, month: number, date: number): Day => `${String(year).padStart(4, '0')}-${two(month)}-${two(date)}`;

/** Year, month (1 to 12) and day of the month. */
export function parts(day: Day): { year: number; month: number; date: number } {
  const [year, month, date] = day.split('-').map(Number);
  return { year, month, date };
}

/** Whether text is a real day, so "2026-02-31" isn't. */
export function isDay(text: string): text is Day {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  return fromUtc(utc(text)) === text;
}

const utc = (day: Day) => {
  const { year, month, date } = parts(day);
  return Date.UTC(year, month - 1, date);
};
const fromUtc = (ms: number): Day => new Date(ms).toISOString().slice(0, 10);

/** The day a moment falls on, where the phone is. */
export function toDay(ms: number): Day {
  const d = new Date(ms);
  return makeDay(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** The first moment of a day, where the phone is. */
export function startOf(day: Day): number {
  const { year, month, date } = parts(day);
  return new Date(year, month - 1, date).getTime();
}

export const addDays = (day: Day, n: number): Day => fromUtc(utc(day) + n * MS_PER_DAY);

export const daysBetween = (from: Day, to: Day): number => Math.round((utc(to) - utc(from)) / MS_PER_DAY);

export const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** `n` months on, on `keep` (the same day of the month, unless given) or the month's last day if it is shorter. */
export function addMonths(day: Day, n: number, keep = parts(day).date): Day {
  const { year, month } = parts(day);
  const all = year * 12 + (month - 1) + n;
  const y = Math.floor(all / 12);
  const m = all - y * 12 + 1;
  return makeDay(y, m, Math.min(keep, daysInMonth(y, m)));
}

/** 0 = Sunday to 6 = Saturday. */
export const weekday = (day: Day): number => new Date(utc(day)).getUTCDay();

export const weekStart = (day: Day, settings: Pick<Settings, 'weekStart'>): Day => addDays(day, -((weekday(day) - settings.weekStart + 7) % 7));

/** The first day of this day's month, when months begin on the chosen day (a payday, say). */
export function monthStart(day: Day, settings: Pick<Settings, 'monthStart'>): Day {
  const { year, month } = parts(day);
  const begins = makeDay(year, month, Math.min(Math.max(settings.monthStart, 1), 28));
  return begins > day ? addMonths(begins, -1) : begins;
}

export const yearStart = (day: Day): Day => makeDay(parts(day).year, 1, 1);

export function addPeriod(day: Day, period: BudgetPeriod, n = 1): Day {
  switch (period) {
    case 'day':
      return addDays(day, n);
    case 'week':
      return addDays(day, 7 * n);
    case 'month':
      return addMonths(day, n);
    case 'year':
      return addMonths(day, 12 * n);
  }
}

/** Where the period holding this day began. */
export function periodStart(day: Day, period: BudgetPeriod, settings: Settings): Day {
  switch (period) {
    case 'day':
      return day;
    case 'week':
      return weekStart(day, settings);
    case 'month':
      return monthStart(day, settings);
    case 'year':
      return yearStart(day);
  }
}

// MARK: Words

/** "Nov" */
export const monthName = (day: Day): string => MONTHS[parts(day).month - 1];

/** "November 2026" */
export const monthYear = (day: Day): string => `${LONG_MONTHS[parts(day).month - 1]} ${parts(day).year}`;

/** "24 Nov" */
export const dayAndMonth = (day: Day): string => `${parts(day).date} ${monthName(day)}`;

/** "24 Nov", with the year only when it isn't this one. */
export const shortLabel = (day: Day, today: Day): string => dayAndMonth(day) + (parts(day).year === parts(today).year ? '' : ` ${parts(day).year}`);

/** "Tue, 24 Nov", with the year only when it isn't this one. */
export const weekdayLabel = (day: Day, today: Day): string => `${WEEKDAYS[weekday(day)]}, ${shortLabel(day, today)}`;

/** "T" for a Tuesday. */
export const weekdayLetter = (day: Day): string => WEEKDAYS[weekday(day)][0];

/** "3 - 9 Nov", or "28 Nov - 4 Dec" across months. */
export const daysLabel = (first: Day, last: Day): string => `${monthName(first) === monthName(last) ? parts(first).date : dayAndMonth(first)} - ${dayAndMonth(last)}`;

/** "Nov 2026", or "25 Nov - 24 Dec" when months start on another day. */
export function monthLabel(start: Day, today: Day): string {
  if (parts(start).date === 1) return `${monthName(start)} ${parts(start).year}`;
  const last = addDays(addMonths(start, 1), -1);
  const thisYear = parts(today).year;
  const year = parts(start).year === thisYear || parts(last).year === thisYear ? '' : ` ${parts(last).year}`;
  return daysLabel(start, last) + year;
}

/** "6:40 PM" */
export function timeLabel(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${two(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "18:40" */
export const clock24 = (ms: number): string => `${two(new Date(ms).getHours())}:${two(new Date(ms).getMinutes())}`;
