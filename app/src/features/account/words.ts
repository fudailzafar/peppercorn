import type { AccountProblem } from '@/account/types';
import { addDays, shortLabel, timeLabel, toDay } from '@/domain/dates';

export const PROBLEM: Record<AccountProblem, string> = {
  unavailable: 'Google sign-in isn’t available in this version.',
  cancelled: 'Sign-in cancelled',
  permission: 'Allow Google Drive access to save your data.',
  signedOut: 'Sign in again to keep saving.',
  wrongAccount: 'That’s a different Google account. Use the one you signed in with.',
  conflict: 'Newer data was saved on another phone.',
  offline: 'You’re offline. Try again when you’re connected.',
  full: 'Your Google storage is full.',
  storage: 'Couldn’t save on this phone. Free up some space and try again.',
  gone: 'Your saved data was deleted from Google Drive.',
  newerVersion: 'Update Peppercorn to open your saved data.',
  unreadable: 'Your saved data couldn’t be read.',
  failed: 'Couldn’t reach Google. Try again.',
};

export const problemText = (p: AccountProblem) => PROBLEM[p];

/** "today, 10:42 am" */
export function when(ms: number, today: string): string {
  const day = toDay(ms);
  const on = day === today ? 'today' : day === addDays(today, -1) ? 'yesterday' : shortLabel(day, today);
  return `${on}, ${timeLabel(ms).toLowerCase()}`;
}
