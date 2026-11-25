import { useStore as useZustand } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { AccountState } from '@/account/account';
import type { Message } from '@/data/messages';
import type { State } from '@/data/store';
import type { AppData, Settings } from '@/domain/model';
import { money, type Money } from '@/domain/money';
import { account, messages, store } from './app';
import { clock } from './clock';

export const useAppState = <T>(of: (state: State) => T): T => useZustand(store.state, of);

/** Everything saved. A screen that shows little of it uses `useSettings` or a narrower hook. */
export const useData = (): AppData => useZustand(store.state, (s) => s.data);

export const useSettings = (): Settings => useZustand(store.state, (s) => s.data.settings);

export const useAccount = <T>(of: (state: AccountState) => T): T => useZustand(account.state, useShallow(of));

export const useMessage = (): Message | null => useZustand(messages.state, (s) => s.current);

/** How amounts are written, in the chosen currency. */
export function useMoney(): Money {
  const currency = useZustand(store.state, (s) => s.data.settings.currency);
  const cents = useZustand(store.state, (s) => s.data.settings.cents);
  return money(currency, cents);
}

/** Now. Only for what depends on it: whatever uses this is drawn again each minute, and with each change. */
export const useNow = (): number => useZustand(clock, (c) => c.now);
