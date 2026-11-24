// Data model, mirroring Dime's Core Data entities.

export interface Category {
  id: string;
  name: string;
  emoji: string;
  /** Hex colour, e.g. "#279AF4". */
  colour: string;
  income: boolean;
  order: number;
  dateCreated: number;
}

/** 0 = not recurring, 1 = daily, 2 = weekly, 3 = monthly. */
export type RecurringType = 0 | 1 | 2 | 3;

export interface Transaction {
  id: string;
  amount: number;
  /** Epoch ms. */
  date: number;
  note: string;
  income: boolean;
  categoryId: string | null;
  recurringType: RecurringType;
  /** Repeat every N days / weeks / months. */
  recurringCoefficient: number;
  /** True for transactions created by (or that started) a recurrence. */
  onceRecurring: boolean;
}

/** 1 = daily, 2 = weekly, 3 = monthly, 4 = yearly. */
export type BudgetType = 1 | 2 | 3 | 4;

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  type: BudgetType;
  /** Start of the current budget period (epoch ms). */
  startDate: number;
}

export interface MainBudget {
  amount: number;
  type: BudgetType;
  startDate: number;
}

export type ThemeSetting = 'system' | 'light' | 'dark';

export interface Settings {
  currency: string;
  showCents: boolean;
  showSign: boolean;
  theme: ThemeSetting;
  incomeTracking: boolean;
  showUpcoming: boolean;
  animatedCharts: boolean;
  /** 1 = Sunday ... 7 = Saturday. */
  firstWeekday: number;
  /** Day of the month a "month" starts on (1-28). */
  firstDayOfMonth: number;
  /** 0 = off, 1 = subtle, 2 = heavy. */
  haptics: 0 | 1 | 2;
  /** 1 = digits shift in as cents, 2 = decimal point. */
  numberEntryType: 1 | 2;
  /** 1 today, 2 week, 3 month, 4 year, 5 all time. */
  logTimeFrame: 1 | 2 | 3 | 4 | 5;
  /** 1 net total, 2 income, 3 spent. */
  logHeading: 1 | 2 | 3;
  welcomed: boolean;
  /** Shown on the You tab and the home avatar. */
  profileName: string;
}

export const BUDGET_LABELS: Record<BudgetType, string> = {
  1: 'Daily',
  2: 'Weekly',
  3: 'Monthly',
  4: 'Yearly',
};

/** Shown after "left"/"over" on a budget, e.g. "left this month". */
export const BUDGET_PERIOD_PHRASE: Record<BudgetType, string> = {
  1: 'today',
  2: 'this week',
  3: 'this month',
  4: 'this year',
};
