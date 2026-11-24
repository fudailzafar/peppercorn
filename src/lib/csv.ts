import type { Category, Transaction } from './types';

const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** Exports every log as CSV: Date, Note, Category, Amount, Type. */
export function exportCsv(transactions: Transaction[], categories: Category[]): string {
  const rows = [...transactions]
    .sort((a, b) => b.date - a.date)
    .map((t) => {
      const category = categories.find((c) => c.id === t.categoryId)?.name ?? '';
      return [new Date(t.date).toISOString(), esc(t.note), esc(category), t.amount.toFixed(2), t.qty === undefined ? '' : String(Math.round(t.qty * 10000) / 10000), t.income ? 'Income' : 'Expense'].join(',');
    });
  return ['Date,Note,Category,Amount,Grams or units,Type', ...rows].join('\n');
}
