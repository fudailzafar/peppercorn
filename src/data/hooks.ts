import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useStore as useZustand } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { AccountState } from '../account/account';
import { money, type Money } from '../domain/money';
import type { AppData, Settings } from '../domain/model';
import { account, messages, store } from './app';
import type { Message } from './messages';
import type { State } from './store';

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

const MINUTE = 60_000;

/**
 * Now. It moves on each minute, when the app is opened, and with each change to what is saved: an entry added just now
 * is newer than the last whole minute, and has to count.
 */
export function useNow(): number {
  const data = useData();
  const [tick, setTick] = useState(() => ({ data, now: Date.now() }));
  // The change came first: read the clock again before anything is worked out from it.
  if (tick.data !== data) setTick({ data, now: Date.now() });
  useEffect(() => {
    const move = () => setTick((t) => ({ ...t, now: Date.now() }));
    let timer = setTimeout(function again() {
      move();
      timer = setTimeout(again, MINUTE - (Date.now() % MINUTE));
    }, MINUTE - (Date.now() % MINUTE));
    const sub = AppState.addEventListener('change', (state) => state === 'active' && move());
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);
  return tick.now;
}
