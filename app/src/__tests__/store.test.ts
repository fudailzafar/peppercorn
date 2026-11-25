import { writeData } from '../data/store';
import { Messages } from '../data/messages';
import { Prices } from '../data/prices';
import type { AppData } from '../domain/model';
import { at, entry, FakeDisk, NOW, openStore, sample } from './fakes';

const today = () => at(2026, 11, 25);
const saved = (...notes: string[]): AppData => ({ ...sample, entries: notes.map((n) => entry(n, 10, at(2026, 11, 20), { categoryId: 'food' })), budgets: [], owned: [], prices: {} });
const draft = (note: string, date = NOW) => ({ amount: 1, date, note, income: false, categoryId: 'food' as string | null, often: null });

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('a first launch starts with categories and saves them', async () => {
  const { store, disk } = await openStore(null, today);
  expect(store.data.categories.map((c) => c.name)).toContain('Food');
  expect(store.data.categories.filter((c) => c.asset)).toHaveLength(4);
  expect(store.data.settings.welcomed).toBe(false);
  expect(await store.flush()).toBe(true);
  expect(disk.saved).toEqual(store.data);
});

test('changes are saved by themselves, once things are quiet', async () => {
  const { store, disk } = await openStore(saved('a'), today);
  for (let i = 0; i < 5; i++) store.add(draft(`n${i}`));
  expect(disk.writes).toBe(0);
  await jest.advanceTimersByTimeAsync(300);
  expect(disk.writes).toBe(1);
  expect(disk.saved.entries).toHaveLength(6);
});

test('a file that can’t be opened is never written over', async () => {
  const disk = new FakeDisk(writeData(saved('a', 'b')));
  disk.locked = true;
  const before = disk.text;
  const { store } = await openStore(null, today, disk);
  expect(store.state.getState().status).toBe('locked');
  store.add(draft('lost'));
  expect(await store.flush()).toBe(false);
  expect(await store.open()).toBe(false);
  expect(disk.text).toBe(before);
  disk.locked = false;
  expect(await store.open()).toBe(true);
  expect(store.state.getState().status).toBe('ready');
  expect(store.data.entries.map((e) => e.note)).toEqual(['a', 'b']);
});

test.each(['{"entries":[{', '{}', '{"version":1,"data":{"categories":[]}}'])('damaged: %s is set aside before anything is written', async (text) => {
  const disk = new FakeDisk(text);
  const { store } = await openStore(null, today, disk);
  expect(store.state.getState().recovered).toBe(true);
  expect(disk.aside).toEqual([text]);
  expect(await store.flush()).toBe(true);
});

test('a damaged file that can’t be set aside stays where it is', async () => {
  const disk = new FakeDisk('{"entries":[{');
  disk.full = true;
  const { store } = await openStore(null, today, disk);
  expect(store.state.getState().status).toBe('locked');
  disk.full = false;
  expect(await store.flush()).toBe(false);
  expect(disk.text).toBe('{"entries":[{');
});

test('a failed save is known, and tried again', async () => {
  const { store, disk } = await openStore(saved('a'), today);
  await store.flush();
  disk.full = true;
  store.add(draft('b'));
  expect(await store.flush()).toBe(false);
  expect(store.state.getState().unsaved).toBe(true);
  expect(disk.saved.entries).toHaveLength(1);
  disk.full = false;
  await jest.advanceTimersByTimeAsync(9000);
  expect(store.state.getState().unsaved).toBe(false);
  expect(disk.saved.entries).toHaveLength(2);
});

test('restoring on a full phone changes nothing', async () => {
  const { store, disk } = await openStore(saved('mine'), today);
  await store.flush();
  const other = { ...store.snapshot(), entries: [entry('theirs', 1, 1)] };
  disk.full = true;
  expect(await store.restore(other)).toBe(false);
  expect(store.data.entries.map((e) => e.note)).toEqual(['mine']);
  disk.full = false;
  expect(await store.restore(other)).toBe(true);
  expect(disk.saved.entries.map((e) => e.note)).toEqual(['theirs']);
});

test('prices that can’t be read are dropped on opening', async () => {
  const { store } = await openStore({ ...saved(), prices: { tata: { fetchedAt: 0, days: { '2026-Nov-24': 1, '2026-11-23': 2 } } } }, today);
  expect(store.data.prices.tata?.days).toEqual({ '2026-11-23': 2 });
});

test('adding a repeat with a past date can be undone as one', async () => {
  const { store } = await openStore(saved('a'), today);
  const added = store.add({ ...draft('tea', at(2026, 11, 20)), often: { unit: 'day', every: 1 } });
  expect(added).toHaveLength(6);
  store.undo(added);
  expect(store.data.entries).toHaveLength(1);
});

test('changing an entry can be undone, with the repeats it added', async () => {
  const { store } = await openStore(saved('a'), today);
  const old = store.data.entries[0];
  const added = store.update(old.id, { ...draft('tea', old.date), often: { unit: 'day', every: 1 } });
  expect(added).toHaveLength(5);
  store.undo(added, old);
  expect(store.data.entries).toEqual([old]);
});

test('an entry deleted with its category isn’t lost when it is saved', async () => {
  const { store } = await openStore(null, today);
  const food = store.data.categories.find((c) => c.name === 'Food');
  const [id] = store.add({ ...draft('tea'), categoryId: food?.id ?? '' });
  store.removeCategory(food?.id ?? '');
  expect(store.data.entries).toHaveLength(0);
  store.update(id, { ...draft('tea'), categoryId: null });
  expect(store.data.entries.map((e) => e.note)).toEqual(['tea']);
});

test('erasing keeps categories and settings, resetting keeps prices', async () => {
  const { store } = await openStore(sample);
  const { categories } = store.data;
  store.erase();
  expect(store.data).toMatchObject({ entries: [], owned: [], budgets: [], categories });
  store.reset();
  expect(store.data.categories.some((c) => c.id === 'food')).toBe(false);
  expect(store.data.prices.gold).toBeDefined();
});

test('categories move among their own kind, and a second budget replaces the first', async () => {
  const { store } = await openStore(sample);
  store.moveCategory('transport', -1);
  const names = store.data.categories.filter((c) => !c.income && !c.asset).sort((a, b) => a.order - b.order);
  expect(names.map((c) => c.id).slice(0, 2)).toEqual(['transport', 'food']);
  store.saveBudget({ categoryId: 'transport', amount: 1, period: 'week', start: '2026-11-23' });
  expect(store.data.budgets.filter((b) => b.categoryId === 'transport')).toEqual([{ id: 'b', categoryId: 'transport', amount: 1, period: 'week', start: '2026-11-23' }]);
});

describe('prices', () => {
  const FUND = '{"data":[{"date":"23-11-2026","nav":"417.3"}]}';
  const METALS = '<td>24/Nov/2026</td><td>12,780</td><td>102,240</td><td>11,715</td><td>93,720</td>Ready Silver<td>24/Nov/2026</td><td>175.00</td><td>175,000.00</td>';

  test('each source is asked only once its next price is due', async () => {
    const { store } = await openStore(saved(), () => NOW);
    const page = jest.fn(async (url: string) => (url === 'metals' ? METALS : FUND));
    const prices = new Prices(store, 'metals', () => NOW, page);
    await prices.refresh();
    expect(page).toHaveBeenCalledTimes(3);
    expect(store.data.prices.gold?.days).toEqual({ '2026-11-24': 11715 });
    expect(store.data.priceError).toBe(false);
    await prices.refresh();
    expect(page).toHaveBeenCalledTimes(3);
  });

  test('a failure is known, and waits before trying by itself again', async () => {
    const { store } = await openStore(saved(), () => NOW);
    const page = jest.fn(async (): Promise<string> => {
      throw new Error('offline');
    });
    const prices = new Prices(store, 'metals', () => NOW, page);
    await prices.refresh();
    expect(store.data.priceError).toBe(true);
    await prices.refresh();
    expect(page).toHaveBeenCalledTimes(3);
    await prices.refresh(true);
    expect(page).toHaveBeenCalledTimes(6);
  });
});

test('a message goes away by itself, later when it can be undone', async () => {
  const messages = new Messages();
  messages.show('Saved');
  await jest.advanceTimersByTimeAsync(3100);
  expect(messages.state.getState().current).toBeNull();
  messages.show('Deleted', { undo: () => {} });
  await jest.advanceTimersByTimeAsync(3100);
  expect(messages.state.getState().current?.text).toBe('Deleted');
  await jest.advanceTimersByTimeAsync(2000);
  expect(messages.state.getState().current).toBeNull();
});
