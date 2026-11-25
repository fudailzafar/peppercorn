import { assetOf, fundOn, gainOf, latest, metalOn, percentOf, priced, quantityLabel, quantityTyped, soundDays, standsFor, totalWorth, worth } from '../domain/assets';
import { current, overallOf, progress } from '../domain/budgets';
import { monthLabel, monthStart, shortLabel, timeLabel, toDay, weekdayLabel, weekStart } from '../domain/dates';
import { byMonth, caughtUp, noteAfter, noteSuggestions, schedule, search, since, toCsv, totals, upcoming } from '../domain/entries';
import { categoryLines, columns, compared, elapsedUnits, highlights, oldestOffset, periodOf, trend, type Highlight } from '../domain/insights';
import { backKey, digitKey, emptyPad, padOf, padShown, padValue, pointKey, type Keypad } from '../domain/keypad';
import type { AppData, Budget, Entry, Settings } from '../domain/model';
import { money, phoneCurrency, symbolOf } from '../domain/money';
import { lastDue, parseFund, parseMetals } from '../domain/priceSources';
import { defaultSettings } from '../data/store';
import { at, entry, ids, NOW, sample } from './fakes';

const d = sample;
const inr = money('INR', false);
const settings = (more: Partial<Settings> = {}): Settings => ({ ...defaultSettings('INR'), ...more });
const having = (more: Partial<AppData>): AppData => ({ categories: [], entries: [], budgets: [], owned: [], prices: {}, priceError: false, settings: settings(), ...more });
const days = (list: readonly Entry[]) => list.map((e) => toDay(e.date));
const overall = (amount: number, start: string, more: Partial<Budget> = {}): Budget => ({ id: 'o', categoryId: null, amount, period: 'month', start, ...more });

describe('money', () => {
  test('rupees group by lakh, dollars by thousand', () => {
    expect(inr.brief(460191.77)).toBe('₹4,60,192');
    expect(inr.full(12345678)).toBe('₹1,23,45,678.00');
    expect(money('USD', true).brief(1234567)).toBe('$1,234,567');
    expect(money('USD', true).brief(12.5)).toBe('$12.50');
    expect(inr.brief(999)).toBe('₹999');
  });

  test('halves round up, as people expect', () => {
    expect(inr.full(1.005)).toBe('₹1.01');
    expect(inr.full(0)).toBe('₹0.00');
    expect(money('INR', true).full(Infinity)).toBe('₹-');
  });

  test('right-to-left symbols become codes', () => expect(symbolOf('AED')).toBe('AED'));

  test('a first launch starts with the country’s currency', () => {
    expect(phoneCurrency('Asia/Kolkata', 'USD')).toBe('INR');
    expect(phoneCurrency('Asia/Dubai', 'AED')).toBe('AED');
    expect(phoneCurrency('America/New_York', 'ZZZ')).toBe('USD');
  });
});

describe('keypad', () => {
  const type = (keys: string, pad: Keypad = emptyPad()) => [...keys].reduce((k, c) => (c === '.' ? pointKey(k) : digitKey(Number(c))(k)), pad);

  test('typing with a decimal point', () => {
    expect(padShown(type('1840'), 'INR')).toBe('1,840');
    expect(padShown(type('12.5'), 'INR')).toBe('12.5');
    expect(padValue(type('12.5'))).toBe(12.5);
    expect(padShown(type('.'), 'INR')).toBe('0.');
    expect(padValue(type('.'))).toBe(0);
    expect(type('12.345').text).toBe('12.34');
    expect(type('8.1255', emptyPad('point', 3)).text).toBe('8.125');
    expect(type('05').text).toBe('5');
    expect(type('1.5.').text).toBe('1.5');
    expect(type('1234567891').text).toBe('123456789');
    expect(backKey(type('12')).text).toBe('1');
  });

  test('filling in cents first', () => {
    const pad = emptyPad('cents');
    expect(padShown(type('125', pad), 'INR')).toBe('1.25');
    expect(padValue(type('125', pad))).toBe(1.25);
    expect(padShown(pad, 'INR')).toBe('0.00');
    expect(type('00125', pad).text).toBe('125');
  });

  test('an amount comes back as it was typed', () => {
    expect(padOf(1840, 'point').text).toBe('1840');
    expect(padOf(12.5, 'point').text).toBe('12.5');
    expect(padOf(10, 'cents').text).toBe('1000');
    expect(padOf(0, 'point').text).toBe('');
    expect(padOf(100, 'point').text).toBe('100');
  });
});

test('weeks and months start where chosen', () => {
  const tuesday = '2026-11-24';
  expect(weekStart(tuesday, { weekStart: 0 })).toBe('2026-11-22');
  expect(weekStart(tuesday, { weekStart: 1 })).toBe('2026-11-23');
  expect(weekStart(tuesday, { weekStart: 6 })).toBe('2026-11-21');
  expect(monthStart(tuesday, { monthStart: 25 })).toBe('2026-10-25');
  expect(monthStart(tuesday, { monthStart: 24 })).toBe('2026-11-24');
  expect(weekdayLabel(tuesday, tuesday)).toBe('Tue, 24 Nov');
  expect(shortLabel('2025-11-24', tuesday)).toBe('24 Nov 2025');
  expect(timeLabel(at(2026, 11, 24, 18, 40))).toBe('6:40 PM');
});

describe('totals and budgets', () => {
  test('this month', () => expect(totals(since(d.entries, '2026-11-01', NOW))).toEqual({ spent: 33128, earned: 68000, net: 34872 }));

  test('the overall budget', () => {
    const p = progress(d, overallOf(d) as Budget, NOW);
    expect(p.left).toBe(11872);
    expect(Math.round(p.used * 100)).toBe(74);
    expect(Math.round(p.elapsed * 100)).toBe(79);
    expect(p.daysLeft).toBe(7);
    expect(inr.brief(p.safePerDay)).toBe('₹1,696');
    expect(p.pace).toBe('onTrack');
  });

  test('a category budget counts only its category', () => {
    const b = d.budgets[0];
    expect(progress(d, b, NOW).left).toBe(400);
    expect(progress(d, { ...b, amount: 1000 }, NOW).pace).toBe('over');
    expect(progress(d, { ...b, amount: 2100 }, NOW).pace).toBe('fast');
  });

  test('finished periods move on', () => {
    const b = overall(1, '2026-08-31');
    expect(current(b, '2026-11-24').start).toBe('2026-10-31');
    expect(current(b, '2026-11-30').start).toBe('2026-11-30');
    const w = overall(1, '2026-11-02', { period: 'week' });
    expect(current(w, '2026-11-24').start).toBe('2026-11-23');
    expect(current(w, '2026-11-08')).toBe(w);
  });

  test('spending exactly the budget isn’t over it', () => {
    let seed = 1;
    const random = (n: number) => (seed = (seed * 48271) % 2147483647) % n;
    for (let i = 0; i < 2000; i++) {
      const paise = Array.from({ length: 2 + random(8) }, () => 1 + random(99999));
      const data = having({ entries: paise.map((p, j) => entry(String(j), p / 100, NOW)) });
      const p = progress(data, overall(paise.reduce((a, b) => a + b, 0) / 100, '2026-11-01'), NOW);
      expect(p.left).toBe(0);
      expect(p.over).toBe(false);
    }
    const list = [entry('i', 0.3, 1, { income: true }), entry('a', 0.1, 1), entry('b', 0.2, 1)];
    expect(totals(list).net).toBe(0);
    expect(byMonth(list)[0].net).toBe(0);
  });
});

describe('insights', () => {
  const month = periodOf('month', 0, NOW, d.settings);

  test('a month in progress is compared with the same stretch of the last', () => {
    const c = compared(d.entries, month, false);
    expect(c.now).toBe(33128);
    expect(c.before - c.now).toBe(3121);
  });

  test('a month’s bars are its weeks', () => {
    const cols = columns(d.entries, month, false, NOW);
    expect(cols.map((c) => c.label)).toEqual(['1-7', '8-14', '15-21', '22-28', '29-30']);
    expect(cols.reduce((all, c) => all + c.value, 0)).toBe(33128);
    expect(cols.findIndex((c) => c.current)).toBe(3);
    expect(cols.at(-1)?.future).toBe(true);
    expect(inr.brief(33128 / elapsedUnits(month, NOW))).toBe('₹1,380');
    expect(columns(d.entries, periodOf('month', -9, NOW, d.settings), false, NOW)).toHaveLength(4);
  });

  test('week and year bars', () => {
    const w = periodOf('week', 0, NOW, d.settings);
    const letters = (cols: { label: string }[]) => cols.map((c) => c.label).join('');
    expect(w.label).toBe('23 - 29 Nov');
    expect(letters(columns(d.entries, w, false, NOW))).toBe('MTWTFSS');
    expect(elapsedUnits(w, NOW)).toBe(2);
    const y = periodOf('year', 0, NOW, d.settings);
    expect(letters(columns(d.entries, y, false, NOW))).toBe('JFMAMJJASOND');
    expect(elapsedUnits(y, NOW)).toBe(11);
    expect(periodOf('week', 1, NOW, d.settings).label).toBe('30 Nov - 6 Dec');
  });

  test('what stands out', () => {
    const [forecast, up, down, ...rest] = highlights(d, month, false, NOW);
    expect(rest).toHaveLength(0);
    expect(forecast).toMatchObject({ kind: 'forecast', budget: 45000 });
    const pace = (forecast as Extract<Highlight, { kind: 'forecast' }>).amount;
    expect(inr.brief(pace)).toBe('₹41,410');
    expect(inr.brief(45000 - pace)).toBe('₹3,590');
    expect(up).toMatchObject({ kind: 'change', category: { name: 'Bills' }, amount: 16969, before: 13979 });
    expect(down).toMatchObject({ kind: 'change', category: { name: 'Fun' }, amount: 1250 });
    const fun = down as Extract<Highlight, { kind: 'change' }>;
    expect(fun.before - fun.amount).toBe(5250);
  });

  test('where it went', () => {
    const lines = categoryLines(d, d.entries, month, false);
    expect(lines[0].category.name).toBe('Bills');
    expect(Math.round(lines[0].share * 100)).toBe(51);
    expect(lines.reduce((all, l) => all + l.share, 0)).toBeCloseTo(1, 9);
    expect(trend(d, 'bills', month, false, NOW)).toHaveLength(6);
  });

  test('nothing is earlier than the first entry', () => {
    expect(oldestOffset(d, 'month', NOW)).toBe(-1);
    expect(oldestOffset(d, 'year', NOW)).toBe(0);
    expect(oldestOffset(having({}), 'month', NOW)).toBe(0);
  });

  test('a month is the same everywhere when it starts on payday', () => {
    const s = settings({ monthStart: 25, weekStart: 1 });
    const p = periodOf('month', 0, NOW, s);
    expect(p.start).toBe(monthStart(toDay(NOW), s));
    expect(p.label).toBe('25 Oct - 24 Nov');
    expect(monthLabel(p.start, toDay(NOW))).toBe('25 Oct - 24 Nov');
    expect(periodOf('month', -1, NOW, s).label).toBe('25 Sep - 24 Oct');
    expect(monthLabel('2024-10-25', toDay(NOW))).toBe('25 Oct - 24 Nov 2024');
    const cols = columns(d.entries, p, false, NOW);
    expect(cols.map((c) => c.label)).toEqual(['25-31', '1-7', '8-14', '15-21', '22-24']);
    expect(cols[0].name).toBe('25-31 Oct');
    expect(cols.reduce((all, c) => all + c.value, 0)).toBe(totals(since(d.entries, p.start, NOW)).spent);
    const twentieth = columns(d.entries, periodOf('month', -9, NOW, { ...s, monthStart: 20 }), false, NOW);
    expect(twentieth.map((c) => c.name)).toContain('27 Feb - 5 Mar');
    // A budget for a different month isn't what the forecast is held against.
    const later = at(2026, 11, 15);
    const limit = (budgets: Budget[]) => {
      const found = highlights({ ...d, settings: s, budgets }, periodOf('month', 0, later, s), false, later).find((h) => h.kind === 'forecast');
      return found?.kind === 'forecast' ? found.budget : undefined;
    };
    expect(limit(d.budgets)).toBeNull();
    expect(limit([overall(45000, '2026-10-25')])).toBe(45000);
  });
});

describe('assets', () => {
  const gold = (byDay: Record<string, number>) => having({ prices: { gold: { days: byDay, fetchedAt: 0 }, tata: { days: byDay, fetchedAt: 0 } } });

  test('what they are worth', () => {
    const w = totalWorth(d, NOW);
    expect(inr.brief(w.value as number)).toBe('₹4,60,192');
    expect(inr.full(gainOf(w) as number)).toBe('₹74,341.77');
    expect(percentOf(w)).toBe('19.3%');
    expect(percentOf(worth(d, 'gold', NOW))).toBe('20.8%');
    expect(quantityLabel(assetOf('gold'), 24)).toBe('24 g');
    expect(quantityLabel(assetOf('tata'), 1)).toBe('1 unit');
  });

  test('prices by day', () => {
    expect(metalOn(d.prices.gold, '2026-11-22')?.rate).toBe(11510);
    expect(metalOn(d.prices.gold, '2026-01-01')?.rate).toBe(11510);
    expect(fundOn(d.prices.tata, '2026-11-21')?.rate).toBe(417.3854);
    expect(fundOn(d.prices.tata, '2026-11-24')).toBeUndefined();
    expect(fundOn(d.prices.tata, '2026-11-01')).toBeUndefined();
    expect(latest(undefined)).toBeUndefined();
  });

  test('a purchase waits for its day’s price', () => {
    const buy = entry('f', 5000, at(2026, 11, 22), { categoryId: 'asset-tata', asset: 'tata' });
    const later = { ...buy, id: 'g', date: NOW };
    const out = priced({ ...d, entries: [buy, later] });
    expect(out[0].quantity).toBeCloseTo(5000 / 417.3854, 9);
    expect(out[1].quantity).toBeUndefined();
    const w = worth({ ...d, entries: [later], owned: [] }, 'tata', NOW);
    expect(w).toMatchObject({ value: 5000, waiting: 5000 });
    expect(percentOf(w)).toBeNull();
  });

  test('a repeating gold purchase waits for its own day’s price', () => {
    const buy = entry('g', 11000, at(2026, 11, 25), { asset: 'gold', quantity: 1 });
    const after = (byDay: Record<string, number>, e = buy) => priced({ ...gold(byDay), entries: [e] })[0];
    expect(after({ '2026-11-01': 11000 }).rate).toBeUndefined();
    expect(after({ '2026-11-01': 11000, '2026-11-25': 11715 }).amount).toBe(11715);
    // A Sunday takes Saturday's once Monday's is out.
    expect(after({ '2026-11-21': 11510, '2026-11-23': 11640 }, { ...buy, date: at(2026, 11, 22) }).amount).toBe(11510);
    // After a long break, the nearest one known.
    expect(metalOn(gold({ '2026-10-01': 10000, '2026-11-15': 11400 }).prices.gold, '2026-11-10')?.rate).toBe(11400);
  });

  test('prices from another time say so, or wait', () => {
    const g = gold({ '2026-11-15': 11400, '2026-11-16': 11420 }).prices.gold;
    const stands = (day: string) => standsFor(metalOn(g, day) as { day: string; rate: number }, day);
    expect(stands('2020-01-01')).toBe(false);
    expect(stands('2026-11-18')).toBe(true);
    expect(stands('2026-12-18')).toBe(false);
    const f = gold({ '2026-09-01': 400, '2026-10-26': 420 }).prices.tata;
    expect(fundOn(f, '2026-10-10')).toBeUndefined();
    expect(fundOn(f, '2026-10-24')?.rate).toBe(420);
  });

  test('gold bought next year isn’t owned yet', () => {
    const data = { ...gold({ '2026-11-24': 11700 }), entries: [entry('g', 11700, at(2027, 5, 1), { asset: 'gold', quantity: 1 })] };
    expect(worth(data, 'gold', NOW).count).toBe(0);
    expect(worth(data, 'gold', at(2027, 5, 2)).count).toBe(1);
    expect(priced(data)[0].rate).toBeUndefined();
  });

  test('only real quantities', () => {
    for (const t of ['1e308', 'NaN', '-1', '1.2.3', '0x1', '1d', '9999999999', 'abc']) expect(quantityTyped(t)).toBeNull();
    expect(quantityTyped('1,234.5')).toBe(1234.5);
    expect(quantityTyped('.5')).toBe(0.5);
  });
});

describe('repeating entries', () => {
  const monthly = (id: string, date: number, day: number, next: string, every = 1) => entry(id, 1, date, { repeat: { unit: 'month', every, next, day } });

  test('repeats catch up, and only the newest goes on', () => {
    const newId = ids();
    const out = caughtUp([monthly('r', at(2026, 8, 31, 9), 31, '2026-09-30')], '2026-11-24', newId);
    expect(days(out)).toEqual(['2026-08-31', '2026-09-30', '2026-10-31']);
    expect(out.map((e) => e.repeat?.unit)).toEqual([undefined, undefined, 'month']);
    expect(caughtUp(out, '2026-11-24', newId)).toBe(out);
    expect(upcoming(out).map((u) => u.day)).toEqual(['2026-11-30']);
  });

  test('every two weeks, due today', () => {
    const e = entry('w', 1, at(2026, 11, 10, 22), { repeat: { unit: 'week', every: 2, next: '2026-11-24' } });
    expect(caughtUp([e], '2026-11-24', ids())).toHaveLength(2);
    expect(caughtUp([e], '2026-11-23', ids())).toHaveLength(1);
  });

  test('a repeating fund purchase gets its own units', () => {
    const e = entry('f', 500, at(2026, 11, 23), { asset: 'tata', quantity: 2, rate: 250, repeat: { unit: 'day', every: 1, next: '2026-11-24' } });
    const next = caughtUp([e], '2026-11-24', ids()).at(-1);
    expect(next?.quantity).toBeUndefined();
    expect(next?.rate).toBeUndefined();
  });

  test('a 31st comes back after a short month', () => {
    const newId = ids();
    const first = at(2026, 1, 31);
    const rent = entry('r', 1, first, { repeat: schedule({ unit: 'month', every: 1 }, first, undefined, '2026-01-31') });
    const expected = ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31'];
    expect(days(caughtUp([rent], '2026-06-01', newId))).toEqual(expected);
    // Opened once a month, through what is saved in between.
    let list = [rent];
    for (let m = 2; m <= 6; m++) list = JSON.parse(JSON.stringify(caughtUp(list, `2026-0${m}-01`, newId))) as Entry[];
    expect(days(list)).toEqual(expected);
    // A leap year, every twelve months.
    const leap = monthly('l', at(2024, 2, 29), 29, '2025-02-28', 12);
    expect(days(caughtUp([leap], '2028-03-01', newId))).toEqual(['2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29']);
    // A change that isn't to its day keeps the 31st.
    const feb = caughtUp([rent], '2026-03-01', newId).at(-1) as Entry;
    expect(schedule({ unit: 'month', every: 1 }, feb.date, feb, '2026-03-01').next).toBe('2026-03-31');
  });

  test('moving a repeat never adds a day twice', () => {
    const today = '2026-11-25';
    const daily = { unit: 'day' as const, every: 1 };
    const tea = caughtUp([entry('t', 1, at(2026, 11, 18), { repeat: { ...daily, next: '2026-11-19' }, series: true })], today, ids());
    const last = tea.at(-1) as Entry;
    const moved = { ...last, date: at(2026, 11, 20), repeat: schedule(daily, at(2026, 11, 20), last, today) };
    expect(days(caughtUp([moved], today, ids()))).toEqual(['2026-11-20']);
    expect(days(caughtUp([moved], '2026-11-26', ids()))).toEqual(['2026-11-20', '2026-11-26']);
    // Two days earlier, a monthly one is still due next month.
    const rent = { ...monthly('r', at(2026, 11, 5), 5, '2026-12-05'), series: true };
    expect(schedule({ unit: 'month', every: 1 }, at(2026, 11, 3), rent, today).next).toBe('2026-12-03');
    // An earlier one of a series, set to repeat again, starts from now.
    expect(schedule(daily, tea[0].date, tea[0], today).next).toBe('2026-11-26');
    // One that never repeated fills in from its day.
    const plain = entry('p', 1, at(2026, 11, 23));
    expect(caughtUp([{ ...plain, repeat: schedule(daily, plain.date, plain, today) }], today, ids())).toHaveLength(3);
  });

  test('a note that was only the category follows it', () => {
    const old = entry('a', 1, NOW, { note: 'Food', categoryId: 'food' });
    expect(noteAfter(d, old, 'Food', 'bills')).toBe('');
    expect(noteAfter(d, old, 'Food', 'food')).toBe('Food');
    expect(noteAfter(d, old, 'Lunch', 'bills')).toBe('Lunch');
    expect(noteAfter(d, undefined, 'Food', 'bills')).toBe('Food');
  });
});

describe('searching and exporting', () => {
  test('notes, categories and amounts', () => {
    expect(search(d, 'maya')).toHaveLength(1);
    expect(search(d, '1499')).toHaveLength(1);
    expect(search(d, 'bill')).toHaveLength(d.entries.filter((e) => e.categoryId === 'bills').length);
    expect(search(d, '  ')).toHaveLength(0);
  });

  test('notes are suggested once', () =>
    expect(
      noteSuggestions(d, 'grocer', false)
        .map((e) => e.note)
        .sort(),
    ).toEqual(['Groceries', 'Monthly groceries']));

  test('groups are newest first', () => {
    const groups = byMonth(d.entries);
    expect(groups.map((g) => g.day)).toEqual(['2026-11-01', '2026-10-01']);
    expect(groups[0].net).toBe(34872);
  });

  test('an amount is found as it is written', () => {
    const data = having({ entries: [entry('a', 1240, NOW, { note: 'Shoes' }), entry('b', 12.5, NOW, { note: 'Tea' })] });
    const found = (q: string) => search(data, q).map((e) => e.id);
    for (const q of ['1240', '1,240', '₹1240', '₹1,240.00', '-₹1,240.00', '1240.00', '₹ 1240']) expect(found(q)).toEqual(['a']);
    for (const q of ['12.5', '12.50', '₹12.50']) expect(found(q)).toEqual(['b']);
    expect(found('12')).toHaveLength(2);
    expect(found('₹')).toHaveLength(0);
    expect(found(',')).toHaveLength(0);
  });

  test('the export quotes what needs it', () => {
    const csv = toCsv(having({ entries: [entry('1', 5, NOW, { note: 'Tea, "cutting"' })] })).split('\n');
    expect(csv[0]).toBe('Date,Note,Category,Amount,Grams or units,Type');
    expect(csv[1]).toContain('"Tea, ""cutting""",,5.00,,Expense');
  });

  test('the export is in the phone’s time', () =>
    expect(toCsv(having({ entries: [entry('1', 5, at(2026, 11, 25, 0), { note: 'Tea' })] })).split('\n')[1]).toMatch(/^2026-11-25 00:00,Tea/));
});

describe('price pages', () => {
  const today = '2026-11-25';

  test('the rate page', () => {
    const html = `<script>1/Jan/2020|1|2</script><table><tr><td>24/Nov/2026</td><td>12,780</td><td>102,240</td><td>11,715</td><td>93,720</td></tr>
      <tr><td>23/Nov/2026</td><td>1</td><td>2</td><td>3</td><td>4</td></tr></table>Ready Silver<table><tr><td>24/Nov/2026</td><td>175.00</td><td>175,000.00</td></tr></table>`;
    expect(parseMetals(html, today)).toEqual({ gold: { '2026-11-24': 11715 }, silver: { '2026-11-24': 175 } });
    expect(parseMetals('<html>nothing</html>', today)).toEqual({ gold: {}, silver: {} });
  });

  test('prices that aren’t real ones are left out', () => {
    const fund = (day: string, nav: string) => parseFund(`{"data":[{"date":"${day}","nav":"${nav}"},{"date":"20-11-2026","nav":"400"}]}`, today);
    const good = { '2026-11-20': 400 };
    for (const day of ['23-Nov-2026', '2026-11-23', '31-02-2026', '', '23-11-2062']) expect(fund(day, '417.3')).toEqual(good);
    for (const nav of ['Infinity', 'NaN', '1e400', 'N.A.', '-3', '', '0']) expect(fund('23-11-2026', nav)).toEqual(good);
    expect(fund('3-11-2026', '417.3')).toEqual({ ...good, '2026-11-03': 417.3 });
    expect(parseFund('oops', today)).toEqual({});
    const metal = (day: string) =>
      parseMetals(`<table><tr><td>${day}</td><td>12,780</td><td>1,02,240</td><td>11,715</td><td>93,720</td></tr></table>Ready Silver<table><tr><td>${day}</td><td>175</td><td>175000</td></tr></table>`, today);
    expect(Object.keys(metal('25/Nov/2026').gold)).toEqual(['2026-11-25']);
    expect(metal('24/Nov/2062')).toEqual({ gold: {}, silver: {} });
    expect(soundDays({ ...good, '2026-Nov-24': 1, '2026-11-21': Infinity })).toEqual(good);
  });

  test('when a price is next due', () => {
    expect(lastDue([10], NOW)).toBe(at(2026, 11, 24, 10));
    expect(lastDue([9, 23], at(2026, 11, 24, 8))).toBe(at(2026, 11, 23, 23));
  });
});
