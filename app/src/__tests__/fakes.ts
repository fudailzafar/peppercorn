import type { Disk } from '@/data/disk';
import { Store } from '@/data/store';
import { assetCategories } from '@/domain/assets';
import { startOf } from '@/domain/dates';
import type { AppData, Entry } from '@/domain/model';
import { defaultSettings, writeData } from '@/domain/saved';

export const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
export const NOW = at(2026, 11, 24, 19, 20);

export const entry = (id: string, amount: number, date: number, more: Partial<Entry> = {}): Entry => ({ id, amount, date, note: id, income: false, categoryId: null, ...more });

const NAMES = ['Food', 'Transport', 'Shopping', 'Bills', 'Fun', 'Health'];
let n = 0;
const e = (m: number, d: number, amount: number, category: string, note: string, h = 12, min = 0) =>
  entry(`t${n++}`, amount, at(2026, m, d, h, min), { note, income: category === 'salary', categoryId: category });

/** A month and a bit of made-up spending. The Kotlin version's figures for the same entries are the expected ones. */
export const sample: AppData = {
  categories: [...NAMES.map((name, order) => ({ id: name.toLowerCase(), name, emoji: '🍔', colour: '#FE724E', income: false, order })), { id: 'salary', name: 'Salary', emoji: '💼', colour: '#76FBB1', income: true, order: 0 }, ...assetCategories()],
  entries: [
    e(11, 24, 240, 'transport', 'Cab home', 18, 40), e(11, 24, 180, 'food', 'Lunch with Maya', 13, 10), e(11, 23, 1499, 'shopping', 'Running shoes', 20, 5),
    e(11, 23, 620, 'food', 'Vegetables', 9, 15), e(11, 22, 850, 'fun', 'Movie night', 19, 30), e(11, 21, 1840, 'food', 'Monthly groceries', 11),
    e(11, 20, 460, 'health', 'Pharmacy', 10), e(11, 19, 1200, 'transport', 'Metro card', 9), e(11, 17, 340, 'food', 'Bakery', 18), e(11, 16, 760, 'food', 'Dinner out', 21),
    e(11, 14, 2150, 'shopping', 'Winter jacket'), e(11, 12, 1180, 'food', 'Groceries'), e(11, 15, 2400, 'health', 'Eye check-up', 10), e(11, 18, 3150, 'bills', 'Insurance', 10),
    e(11, 10, 1999, 'bills', 'Phone and Wi-Fi', 8), e(11, 9, 400, 'fun', 'Bowling', 20), e(11, 8, 560, 'transport', 'Petrol', 20), e(11, 6, 2320, 'bills', 'Electricity', 10),
    e(11, 5, 1480, 'food', 'Groceries', 10), e(11, 3, 9500, 'bills', 'Rent', 10), e(11, 1, 68000, 'salary', 'Salary', 9),
    e(10, 28, 1650, 'food', 'Groceries', 20), e(10, 26, 1400, 'fun', 'Concert', 20), e(10, 24, 3200, 'shopping', 'Festive gifts', 20), e(10, 22, 2450, 'food', 'Family dinner', 20),
    e(10, 19, 1500, 'transport', 'Metro card', 20), e(10, 16, 1900, 'food', 'Groceries', 20), e(10, 14, 2800, 'shopping', 'Curtains', 20), e(10, 12, 1100, 'health', 'Dentist', 20),
    e(10, 10, 1999, 'bills', 'Phone and Wi-Fi', 8), e(10, 8, 900, 'transport', 'Petrol', 20), e(10, 11, 6500, 'fun', 'Weekend trip', 10), e(10, 9, 3400, 'shopping', 'Bedding', 20),
    e(10, 7, 1720, 'food', 'Groceries', 20), e(10, 6, 2480, 'bills', 'Electricity', 10), e(10, 3, 9500, 'bills', 'Rent', 10), e(10, 1, 68000, 'salary', 'Salary', 9),
  ],
  budgets: [
    { id: 'b', categoryId: 'transport', amount: 2400, period: 'month', start: '2026-11-01' },
    { id: 'o', categoryId: null, amount: 45000, period: 'month', start: '2026-11-01' },
  ],
  owned: [
    { id: 'h1', asset: 'gold', quantity: 24, invested: 232800, paid: true, date: NOW }, { id: 'h2', asset: 'silver', quantity: 250, invested: 36250, paid: true, date: NOW },
    { id: 'h3', asset: 'taurus', quantity: 420, invested: 52000, paid: true, date: NOW }, { id: 'h4', asset: 'tata', quantity: 180, invested: 64800, paid: true, date: NOW },
  ],
  prices: {
    gold: { fetchedAt: 0, days: { '2026-11-20': 11510, '2026-11-23': 11640, '2026-11-24': 11715 } }, silver: { fetchedAt: 0, days: { '2026-11-23': 174, '2026-11-24': 175 } },
    taurus: { fetchedAt: 0, days: { '2026-11-20': 142.61, '2026-11-23': 143.22 } }, tata: { fetchedAt: 0, days: { '2026-11-20': 415.9, '2026-11-23': 417.3854 } },
  },
  priceError: false,
  settings: { ...defaultSettings('INR'), cents: false, weekStart: 1, welcomed: true },
};

/** A file that can be missing, locked or full. */
export class FakeDisk implements Disk {
  locked = false;
  full = false;
  aside: string[] = [];
  writes = 0;
  constructor(public text: string | null = null) {}
  async read() {
    if (this.locked) throw new Error('locked');
    return this.text;
  }
  async write(text: string) {
    if (this.full) throw new Error('full');
    this.text = text;
    this.writes++;
  }
  async setAside(text: string) {
    if (this.full) throw new Error('full');
    this.aside.push(text);
  }
  get saved(): AppData {
    return (JSON.parse(this.text ?? '{}') as { data: AppData }).data;
  }
}

export function ids() {
  let i = 0;
  return () => `n${i++}`;
}

export async function openStore(data: AppData | null = sample, now: () => number = () => NOW, disk = new FakeDisk(data && writeData(data))) {
  const store = new Store({ disk, now, newId: ids(), currency: () => 'INR' });
  await store.open();
  return { store, disk };
}

export const dayStart = startOf;
