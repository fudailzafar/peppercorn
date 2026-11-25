import { AppState } from 'react-native';
import { createStore } from 'zustand/vanilla';
import { store } from './app';

const MINUTE = 60_000;

/**
 * Now, for everything on screen: one clock, so everything agrees. It moves on each minute, when the app is opened, and
 * with each change to what is saved: an entry added just now is newer than the last whole minute, and has to count.
 */
export const clock = createStore(() => ({ now: Date.now() }));

const move = () => clock.setState({ now: Date.now() });

// From the start, so it moves before anything on screen hears of the change.
store.state.subscribe((state, before) => {
  if (state.data !== before.data) move();
});

/** Returns how to stop. */
export function startClock(): () => void {
  const wait = () => MINUTE - (Date.now() % MINUTE);
  const again = () => {
    move();
    timer = setTimeout(again, wait());
  };
  let timer = setTimeout(again, wait());
  const sub = AppState.addEventListener('change', (state) => state === 'active' && move());
  return () => {
    clearTimeout(timer);
    sub.remove();
  };
}
