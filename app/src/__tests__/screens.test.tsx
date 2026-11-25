import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { AppData } from '@/domain/model';
import { EditBudgetScreen } from '@/features/budgets/EditBudgetScreen';
import { EditCategoryScreen } from '@/features/categories/EditCategoryScreen';
import { EntryRow } from '@/features/entries/EntryRow';
import { EntryScreen } from '@/features/entries/EntryScreen';
import { ErrorScreen } from '@/features/shell/ErrorScreen';
import { messages, store } from '@/state/app';
import { entry, sample } from './fakes';

let mockParams: Record<string, string> = {};
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => undefined,
  router: { back: () => mockBack(), canGoBack: () => true, push: jest.fn(), navigate: jest.fn(), replace: jest.fn() },
}));
// Nothing moves here: each animation is at its end at once.
jest.mock('react-native-reanimated', () => {
  const { View, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const { useState } = jest.requireActual<typeof import('react')>('react');
  const to = (value: unknown, _: unknown, done?: (finished: boolean) => void) => {
    done?.(true);
    return value;
  };
  const shared = (first: unknown) => {
    let value = first;
    return { get: () => value, set: (v: unknown) => (value = v) };
  };
  return {
    __esModule: true,
    default: { View, Text },
    Easing: { bezier: () => undefined },
    interpolate: (x: number) => x,
    interpolateColor: () => 'black',
    useAnimatedStyle: () => ({}),
    useSharedValue: (first: unknown) => useState(() => shared(first))[0],
    withTiming: to,
    withSpring: to,
    withDelay: (_: number, value: unknown) => value,
    withSequence: (...values: unknown[]) => values.at(-1),
  };
});
jest.mock('expo-splash-screen', () => ({ hide: () => undefined }));
jest.mock('react-native-worklets', () => ({ scheduleOnRN: (f: (...args: unknown[]) => void, ...args: unknown[]) => f(...args) }));
jest.mock('react-native-gesture-handler', () => ({ GestureDetector: ({ children }: { children: unknown }) => children, usePanGesture: () => ({}) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@expo/vector-icons/MaterialIcons', () => ({ __esModule: true, default: () => null }));
jest.mock('@/data/disk', () => ({ fileDisk: () => ({ read: async () => null, write: async () => undefined, setAside: async () => undefined }) }));

const show = (more: Partial<AppData> = {}) => store.state.setState({ data: { ...sample, ...more }, status: 'ready' });
const said = () => messages.state.getState().current?.text;
const press = (label: string) => fireEvent.press(screen.getByLabelText(label));

beforeEach(() => {
  mockParams = {};
  jest.useFakeTimers();
  show();
});
afterEach(() => jest.useRealTimers());

test('two quick taps on the check save once', async () => {
  await render(<EntryScreen />);
  await press('1');
  await press('2');
  await press('Food category');
  const check = screen.getByLabelText('Save entry');
  await fireEvent.press(check);
  await fireEvent.press(check);
  const added = store.data.entries.slice(sample.entries.length);
  expect(added).toMatchObject([{ amount: 12, note: 'Food', categoryId: 'food' }]);
  expect(said()).toBe('Expense saved');
});

test('keys add up', async () => {
  await render(<EntryScreen />);
  const five = screen.getByLabelText('5');
  await fireEvent.press(five);
  await fireEvent.press(five);
  expect(screen.getByLabelText('₹55')).toBeTruthy();
});

test('a category deleted while editing isn’t saved', async () => {
  mockParams = { id: 't1' };
  await render(<EntryScreen />);
  await act(async () => store.removeCategory('food'));
  await press('Save entry');
  expect(said()).toBe('Choose a category');
  expect(store.data.entries.some((e) => e.categoryId === 'food')).toBe(false);
});

test('an upcoming row can’t be deleted, a past one can', async () => {
  const rent = entry('rent', 100, sample.entries[0].date, { categoryId: 'bills', repeat: { unit: 'month', every: 1, next: '2026-12-01' } });
  const deleter = { ask: jest.fn(), now: jest.fn() };
  const actions = (label: RegExp) => (screen.getByLabelText(label).props.accessibilityActions as { name: string }[]).map((a) => a.name);
  await render(<EntryRow entry={rent} deleter={deleter} today="2026-11-24" due="2026-12-01" />);
  expect(actions(/^rent/)).not.toContain('delete');
  await screen.rerender(<EntryRow entry={rent} deleter={deleter} today="2026-11-24" />);
  expect(actions(/^rent/)).toContain('delete');
});

test('a budget keeps its period when only its amount changes', async () => {
  mockParams = { id: 'o' };
  await render(<EditBudgetScreen />);
  await press('0');
  await press('Save budget');
  expect(store.data.budgets.find((b) => b.id === 'o')).toMatchObject({ amount: 450000, start: '2026-11-01' });
});

test('a category can’t take another’s name', async () => {
  await render(<EditCategoryScreen />);
  await fireEvent.changeText(screen.getByLabelText('Name'), ' food ');
  await press('Save');
  expect(said()).toBe('You already have a category with this name');
  expect(store.data.categories).toHaveLength(sample.categories.length);
});

test('a page that failed says the data is safe, and can be tried again', async () => {
  const retry = jest.fn(async () => undefined);
  const logged = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  await render(<ErrorScreen error={new Error('broken')} retry={retry} />);
  expect(screen.getByText(/Your data is safe/)).toBeTruthy();
  await press('Try again');
  expect(retry).toHaveBeenCalledTimes(1);
  logged.mockRestore();
});
