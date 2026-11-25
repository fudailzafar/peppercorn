import { draftOf, finished, newDraft, priceHint, problemWith, withCategory, withPast, withSuggestion } from '../domain/draft';
import { padOf, padValue } from '../domain/keypad';
import { at, entry, NOW, sample } from './fakes';

const d = sample;
const today = '2026-11-24';
const grams = (n: number) => ({ ...newDraft(d, NOW, false, 'gold'), pad: padOf(n, 'point', 3) });
const plain = { ...newDraft(d, NOW), categoryId: 'food', pad: padOf(120, 'point') };

test('what is missing', () => {
  const empty = newDraft(d, NOW);
  expect(problemWith(d, empty)).toBe('amountAndCategory');
  expect(problemWith(d, { ...empty, categoryId: 'food' })).toBe('amount');
  expect(problemWith(d, grams(0))).toBe('grams');
  expect(problemWith(d, { ...plain, categoryId: null })).toBe('category');
  expect(problemWith({ ...d, prices: {} }, grams(1))).toBe('price');
  expect(problemWith(d, plain)).toBeNull();
});

test('a category deleted meanwhile isn’t saved', () => {
  const without = { ...d, categories: d.categories.filter((c) => c.id !== 'food') };
  expect(problemWith(without, plain)).toBe('category');
});

test('gold costs its day’s price, says where it is from, and keeps what it was bought at', () => {
  expect(finished(d, grams(2), today)).toMatchObject({ asset: 'gold', quantity: 2, rate: 11715, amount: 23430, income: false });
  expect(priceHint(d, grams(2), today)).toBe('₹23,430.00 at ₹11,715.00 a gram, 24 Nov');
  const early = { ...grams(2), date: at(2025, 1, 1) };
  expect(priceHint(d, early, today)).toBe('₹23,020.00 at ₹11,510.00 a gram. No price for 1 Jan 2025, so this is from 20 Nov.');
  const old = entry('g', 20000, NOW, { asset: 'gold', categoryId: 'asset-gold', quantity: 2, rate: 10000 });
  expect(finished(d, { ...draftOf(d, old), note: 'x' }, today, old)).toMatchObject({ rate: 10000, amount: 20000 });
});

test('gold dated ahead is an estimate, and waits for its day', () => {
  const ahead = { ...grams(1), date: at(2026, 12, 5) };
  expect(priceHint(d, ahead, today)).toBe('₹11,715.00 at ₹11,715.00 a gram. An estimate: set on 5 Dec.');
  expect(finished(d, ahead, today)).toMatchObject({ rate: undefined, quantity: 1, amount: 11715 });
});

test('a fund’s units wait for its day’s price', () => {
  const buy = { ...newDraft(d, NOW, false, 'tata'), pad: padOf(5000, 'point') };
  expect(finished(d, buy, today)).toMatchObject({ amount: 5000, rate: undefined, quantity: undefined });
  expect(finished(d, { ...buy, date: at(2026, 11, 23) }, today).quantity).toBeCloseTo(5000 / 417.3854, 9);
});

test('grams and rupees aren’t the same number', () => {
  const gold = withCategory(d, plain, 'asset-gold');
  expect(gold.pad).toEqual({ text: '', typing: 'point', decimals: 3 });
  expect(withCategory(d, plain, 'bills').pad).toBe(plain.pad);
});

test('a suggestion fills in what isn’t typed', () => {
  const lunch = d.entries.find((e) => e.note === 'Lunch with Maya');
  if (!lunch) throw new Error('no sample');
  const used = withSuggestion(d, newDraft(d, NOW), lunch);
  expect([used.note, used.categoryId, padValue(used.pad)]).toEqual(['Lunch with Maya', 'food', 180]);
  expect(padValue(withSuggestion(d, plain, lunch).pad)).toBe(120);
});

test('income is only for those who track it', () => {
  expect(newDraft(d, NOW, true).income).toBe(true);
  expect(newDraft({ ...d, settings: { ...d.settings, income: false } }, NOW, true).income).toBe(false);
});

test('what saving also added', () => {
  expect(withPast('Expense saved', 0)).toBe('Expense saved');
  expect(withPast('Expense saved', 1)).toBe('Expense saved, with 1 past entry');
  expect(withPast('Expense saved', 5)).toBe('Expense saved, with 5 past entries');
});
