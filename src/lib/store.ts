import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { addPeriod, nextTransactionDate, recurrenceDate, startOfTomorrow } from './dates';
import { defaultCurrency, setGroupingCurrency } from './format';
import type { Budget, BudgetType, Category, MainBudget, RecurringType, Settings, Transaction } from './types';

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

export const defaultSettings = (): Settings => ({
  currency: defaultCurrency(),
  showCents: true,
  showSign: true,
  theme: 'system',
  incomeTracking: true,
  showUpcoming: true,
  animatedCharts: true,
  firstWeekday: 1,
  firstDayOfMonth: 1,
  haptics: 1,
  numberEntryType: 2,
  logTimeFrame: 2,
  logHeading: 1,
  welcomed: false,
  profileName: '',
});

const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'order' | 'dateCreated'>[] = [
  { name: 'Food', emoji: '🍔', colour: '#FE724E', income: false },
  { name: 'Transport', emoji: '🚌', colour: '#279AF4', income: false },
  { name: 'Shopping', emoji: '🛍️', colour: '#FF78A3', income: false },
  { name: 'Bills', emoji: '🧾', colour: '#6A7CF9', income: false },
  { name: 'Fun', emoji: '🎬', colour: '#FDBC3B', income: false },
  { name: 'Health', emoji: '💊', colour: '#6BB2AA', income: false },
  { name: 'Salary', emoji: '💼', colour: '#76FBB1', income: true },
];

export interface TransactionInput {
  amount: number;
  date: number;
  note: string;
  income: boolean;
  categoryId: string | null;
  recurringType: RecurringType;
  recurringCoefficient: number;
}

interface State {
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  mainBudget: MainBudget | null;
  settings: Settings;

  seedDefaults: () => void;

  addCategory: (c: Pick<Category, 'name' | 'emoji' | 'colour' | 'income'>) => Category;
  updateCategory: (id: string, patch: Partial<Pick<Category, 'name' | 'emoji' | 'colour'>>) => void;
  deleteCategory: (id: string) => void;
  reorderCategories: (income: boolean, orderedIds: string[]) => void;

  addTransaction: (input: TransactionInput) => Transaction;
  updateTransaction: (id: string, input: TransactionInput) => void;
  deleteTransaction: (id: string) => Transaction | undefined;
  restoreTransaction: (t: Transaction) => void;
  stopRecurring: (id: string) => void;
  runRecurring: () => void;

  saveBudget: (categoryId: string, amount: number, type: BudgetType, startDate: number) => void;
  deleteBudget: (id: string) => void;
  saveMainBudget: (amount: number, type: BudgetType, startDate: number) => void;
  deleteMainBudget: () => void;
  rollBudgets: () => void;

  updateSettings: (patch: Partial<Settings>) => void;
  eraseAll: () => void;
}

/**
 * Logs every occurrence of a recurring transaction that has come due, then hands
 * the recurrence to the newest occurrence so exactly one "head" keeps repeating.
 * (Port of Dime's updateRecurringTransaction.)
 */
function catchUpRecurring(t: Transaction, out: Transaction[]): boolean {
  if (t.recurringType < 1 || t.recurringType > 3) return false;
  const tomorrow = startOfTomorrow();
  let occurrence = nextTransactionDate(t);
  if (occurrence >= tomorrow) return false;

  while (occurrence < tomorrow) {
    const following = recurrenceDate(occurrence, t.recurringType, t.recurringCoefficient);
    if (!following) break;
    const carries = following >= tomorrow;
    out.push({
      ...t,
      id: newId(),
      date: occurrence.getTime(),
      onceRecurring: true,
      recurringType: carries ? t.recurringType : 0,
      recurringCoefficient: carries ? t.recurringCoefficient : 0,
    });
    occurrence = following;
  }
  return true;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      categories: [],
      transactions: [],
      budgets: [],
      mainBudget: null,
      settings: defaultSettings(),

      seedDefaults: () => {
        if (get().categories.length > 0) return;
        const now = Date.now();
        set({
          categories: DEFAULT_CATEGORIES.map((c, order) => ({ ...c, id: newId(), order, dateCreated: now })),
        });
      },

      // MARK: Categories
      addCategory: (c) => {
        const siblings = get().categories.filter((x) => x.income === c.income);
        const category: Category = { ...c, id: newId(), order: siblings.length, dateCreated: Date.now() };
        set((s) => ({ categories: [...s.categories, category] }));
        return category;
      },
      updateCategory: (id, patch) =>
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          // Deleting a category deletes its transactions and budget, as in Dime.
          transactions: s.transactions.filter((t) => t.categoryId !== id),
          budgets: s.budgets.filter((b) => b.categoryId !== id),
        })),
      reorderCategories: (income, orderedIds) =>
        set((s) => ({
          categories: s.categories.map((c) => {
            if (c.income !== income) return c;
            const idx = orderedIds.indexOf(c.id);
            return idx === -1 ? c : { ...c, order: idx };
          }),
        })),

      // MARK: Transactions
      addTransaction: (input) => {
        const note = input.note.trim();
        const category = get().categories.find((c) => c.id === input.categoryId);
        const t: Transaction = {
          id: newId(),
          amount: input.amount,
          date: input.date,
          income: input.income,
          categoryId: input.categoryId,
          note: note === '' ? (category?.name ?? '') : note,
          recurringType: input.recurringType,
          recurringCoefficient: input.recurringType > 0 ? Math.max(1, input.recurringCoefficient) : 0,
          onceRecurring: input.recurringType > 0,
        };
        const extra: Transaction[] = [];
        if (t.recurringType > 0 && catchUpRecurring(t, extra)) {
          t.recurringType = 0;
          t.recurringCoefficient = 0;
        }
        set((s) => ({ transactions: [...s.transactions, t, ...extra] }));
        return t;
      },
      updateTransaction: (id, input) =>
        set((s) => {
          const category = s.categories.find((c) => c.id === input.categoryId);
          const note = input.note.trim();
          const original = s.transactions.find((t) => t.id === id);
          if (!original) return s;
          const updated: Transaction = {
            ...original,
            amount: input.amount,
            date: input.date,
            income: input.income,
            categoryId: input.categoryId,
            note: note === '' ? (category?.name ?? '') : note,
            recurringType: input.recurringType,
            recurringCoefficient: input.recurringType > 0 ? Math.max(1, input.recurringCoefficient) : 0,
            onceRecurring: original.onceRecurring || input.recurringType > 0,
          };
          const extra: Transaction[] = [];
          if (updated.recurringType > 0 && catchUpRecurring(updated, extra)) {
            updated.recurringType = 0;
            updated.recurringCoefficient = 0;
          }
          return { transactions: [...s.transactions.map((t) => (t.id === id ? updated : t)), ...extra] };
        }),
      deleteTransaction: (id) => {
        const removed = get().transactions.find((t) => t.id === id);
        if (removed) set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
        return removed;
      },
      restoreTransaction: (t) => set((s) => ({ transactions: [...s.transactions, t] })),
      stopRecurring: (id) =>
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? { ...t, recurringType: 0, recurringCoefficient: 0 } : t)),
        })),
      runRecurring: () => {
        const extra: Transaction[] = [];
        const heads = get().transactions.filter((t) => t.recurringType > 0);
        if (heads.length === 0) return;
        const retired = new Set<string>();
        for (const head of heads) {
          const copy = { ...head };
          if (catchUpRecurring(copy, extra)) retired.add(head.id);
        }
        if (retired.size === 0) return;
        set((s) => ({
          transactions: [
            ...s.transactions.map((t) => (retired.has(t.id) ? { ...t, recurringType: 0 as RecurringType, recurringCoefficient: 0 } : t)),
            ...extra,
          ],
        }));
      },

      // MARK: Budgets
      saveBudget: (categoryId, amount, type, startDate) =>
        set((s) => {
          const existing = s.budgets.find((b) => b.categoryId === categoryId);
          if (existing) {
            return { budgets: s.budgets.map((b) => (b.id === existing.id ? { ...b, amount, type, startDate } : b)) };
          }
          return { budgets: [...s.budgets, { id: newId(), categoryId, amount, type, startDate }] };
        }),
      deleteBudget: (id) => set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) })),
      saveMainBudget: (amount, type, startDate) => set({ mainBudget: { amount, type, startDate } }),
      deleteMainBudget: () => set({ mainBudget: null }),
      rollBudgets: () =>
        set((s) => {
          const now = Date.now();
          const roll = (start: number, type: BudgetType) => {
            let current = start;
            let guard = 0;
            while (addPeriod(new Date(current), type).getTime() <= now && guard++ < 1000) {
              current = addPeriod(new Date(current), type).getTime();
            }
            return current;
          };
          return {
            budgets: s.budgets.map((b) => ({ ...b, startDate: roll(b.startDate, b.type) })),
            mainBudget: s.mainBudget ? { ...s.mainBudget, startDate: roll(s.mainBudget.startDate, s.mainBudget.type) } : null,
          };
        }),

      // MARK: Settings
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      eraseAll: () =>
        set((s) => ({
          transactions: [],
          budgets: [],
          mainBudget: null,
          categories: s.categories,
        })),
    }),
    {
      name: 'dime-store',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // Layer saved settings over the defaults so new options appear after updates.
      merge: (persisted, current) => {
        const { payees, ...saved } = (persisted ?? {}) as Partial<State> & { payees?: { id: string; name: string }[] };
        // A short-lived test build had payees: keep their names as the entries' notes.
        if (payees?.length && saved.transactions) {
          saved.transactions = saved.transactions.map((t) => {
            const { payeeId, ...rest } = t as Transaction & { payeeId?: string | null };
            const name = payees.find((p) => p.id === payeeId)?.name;
            if (!name) return rest;
            const category = saved.categories?.find((c) => c.id === rest.categoryId)?.name;
            return { ...rest, note: rest.note && rest.note !== category ? `${name} · ${rest.note}` : name };
          });
        }
        return { ...current, ...saved, settings: { ...defaultSettings(), ...(saved.settings ?? {}) } };
      },
    },
  ),
);

// Digit grouping follows the currency (₹1,00,000 but $100,000).
useStore.subscribe((s) => setGroupingCurrency(s.settings.currency));

// MARK: Transient UI state (not persisted)

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastState {
  id: number;
  title: string;
  subtitle?: string;
  tone: ToastTone;
  icon: string;
  onTap?: () => void;
}

interface UiState {
  toast: ToastState | null;
  /** Hides the tab bar (e.g. while a sheet is open). */
  hideTabBar: boolean;
  /** True while the add button is tucked away because the user is scrolling down. */
  fabHidden: boolean;
  setFabHidden: (hide: boolean) => void;
  showToast: (t: Omit<ToastState, 'id'>, durationMs?: number) => void;
  dismissToast: () => void;
  setHideTabBar: (hide: boolean) => void;
}

let toastId = 0;

export const useUi = create<UiState>((set, get) => ({
  toast: null,
  hideTabBar: false,
  fabHidden: false,
  showToast: (t, durationMs = 4000) => {
    const id = ++toastId;
    set({ toast: { ...t, id } });
    setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null });
    }, durationMs);
  },
  dismissToast: () => set({ toast: null }),
  setHideTabBar: (hide) => set({ hideTabBar: hide }),
  setFabHidden: (hide) => set({ fabHidden: hide }),
}));
