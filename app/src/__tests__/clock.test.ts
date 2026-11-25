import { store } from '@/state/app';
import { clock, startClock } from '@/state/clock';
import { NOW, sample } from './fakes';

jest.mock('@/data/disk', () => ({ fileDisk: () => ({ read: async () => null, write: async () => undefined, setAside: async () => undefined }) }));

beforeEach(() => jest.useFakeTimers({ now: NOW + 20_000 }));
afterEach(() => jest.useRealTimers());

test('moves on each whole minute, and not once stopped', () => {
  const stop = startClock();
  jest.advanceTimersByTime(39_999);
  expect(clock.getState().now).not.toBe(NOW + 60_000);
  jest.advanceTimersByTime(1);
  expect(clock.getState().now).toBe(NOW + 60_000);
  jest.advanceTimersByTime(60_000);
  expect(clock.getState().now).toBe(NOW + 120_000);
  stop();
  jest.advanceTimersByTime(600_000);
  expect(clock.getState().now).toBe(NOW + 120_000);
});

test('moves with a change, before anyone else hears of it', () => {
  let heard = 0;
  const stop = store.state.subscribe(() => (heard = clock.getState().now));
  jest.setSystemTime(NOW + 45_000);
  store.state.setState({ data: { ...sample } });
  expect(heard).toBe(NOW + 45_000);
  stop();
});
