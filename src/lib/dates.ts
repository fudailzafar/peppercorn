import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  endOfMonth,
  startOfDay,
  startOfMonth,
  startOfYear,
} from 'date-fns';
import type { BudgetType, RecurringType, Transaction } from './types';

export { addDays, addMonths, addYears, startOfDay, startOfMonth, startOfYear, differenceInCalendarDays };

/** Start of the week containing `date`. `firstWeekday`: 1 = Sunday ... 7 = Saturday. */
export function startOfWeek(date: Date, firstWeekday: number): Date {
  const day = startOfDay(date);
  const offset = (day.getDay() + 7 - (firstWeekday - 1)) % 7;
  return addDays(day, -offset);
}

/** Start of the "month" containing `date`, honouring a custom first day (e.g. payday). */
export function startOfCustomMonth(date: Date, firstDay: number): Date {
  const day = Math.min(Math.max(firstDay, 1), 28);
  const thisMonth = new Date(date.getFullYear(), date.getMonth(), day);
  if (date >= thisMonth) return thisMonth;
  return new Date(date.getFullYear(), date.getMonth() - 1, day);
}

export function addPeriod(date: Date, type: BudgetType, n = 1): Date {
  switch (type) {
    case 1: return addDays(date, n);
    case 2: return addDays(date, 7 * n);
    case 3: return addMonths(date, n);
    case 4: return addYears(date, n);
  }
}

/** The next time a recurring transaction fires after `after`. */
export function recurrenceDate(after: Date, type: RecurringType, coefficient: number): Date | null {
  const interval = Math.max(1, coefficient);
  if (type === 1) return addDays(after, interval);
  if (type === 2) return addDays(after, interval * 7);
  if (type === 3) return addMonths(after, interval);
  return null;
}

export function nextTransactionDate(t: Transaction): Date {
  return recurrenceDate(startOfDay(new Date(t.date)), t.recurringType, t.recurringCoefficient) ?? new Date(t.date);
}

export function isSameDay(a: Date | number, b: Date | number) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function daysInMonth(date: Date) {
  return endOfMonth(date).getDate();
}

export function startOfTomorrow(now = new Date()) {
  return addDays(startOfDay(now), 1);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const monthName = (d: Date) => MONTHS[d.getMonth()];
export const weekdayName = (d: Date) => WEEKDAYS[d.getDay()];

/** "Fri, 20 Nov" */
export const dayLabel = (d: Date) => `${weekdayName(d)}, ${d.getDate()} ${monthName(d)}`;

const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "November 2026" */
export const monthYear = (d: Date) => `${FULL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;

/** "24 Nov", with the year only when it isn't this one. */
export const shortDate = (d: Date, now = new Date()) => `${d.getDate()} ${monthName(d)}${d.getFullYear() === now.getFullYear() ? '' : ` ${d.getFullYear()}`}`;

/** "1:19 AM" */
export function timeLabel(ms: number) {
  const d = new Date(ms);
  let h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** "01:31" */
export const time24 = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export function daysLeft(end: Date, now = new Date()) {
  return Math.max(0, differenceInCalendarDays(end, now));
}

export { startOfMonth as monthStart };
