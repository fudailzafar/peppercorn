import { current, endOf } from '@/domain/budgets';
import { addPeriod, toDay } from '@/domain/dates';
import { caughtUp, upcoming } from '@/domain/entries';
import type { Budget } from '@/domain/model';
import { entry, ids } from './fakes';

/* Run in several zones (`pnpm test:zones`), as someone who set these up in India would find them after travelling. */

const zone = process.env.TEST_ZONE ?? 'Asia/Kolkata';
const midnightInIndia = Date.UTC(2026, 10, 24, 18, 30);

test(`days stay put in ${zone}`, () => {
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone.replace('Calcutta', 'Kolkata')).toBe(zone);
  const budget: Budget = { id: 'o', categoryId: null, amount: 1, period: 'month', start: '2026-11-01' };
  const rent = entry('r', 1, midnightInIndia, { repeat: { unit: 'month', every: 1, next: '2026-12-25', day: 25 } });
  expect(endOf(budget)).toBe('2026-12-01');
  expect(current(budget, '2026-12-10').start).toBe('2026-12-01');
  expect(current(budget, '2026-11-20')).toBe(budget);
  expect(addPeriod('2026-03-07', 'day', 2)).toBe('2026-03-09');
  expect(upcoming([rent])[0].day).toBe('2026-12-25');
  expect(
    caughtUp([rent], '2027-01-30', ids())
      .slice(1)
      .map((e) => toDay(e.date)),
  ).toEqual(['2026-12-25', '2027-01-25']);
});
