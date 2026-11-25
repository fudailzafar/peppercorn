import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { FilterChip, SegmentedButton, TopAppBar } from '../components/material';
import { NumberPad, TypedAmount } from '../components/NumberPad';
import { SlideUp } from '../components/SlideUp';
import { messages, store } from '../data/app';
import { useData } from '../data/hooks';
import { overallOf } from '../domain/budgets';
import { periodStart, toDay } from '../domain/dates';
import { ownCategories } from '../domain/entries';
import { emptyPad, padOf, padValue } from '../domain/keypad';
import type { BudgetPeriod } from '../domain/model';
import { haptics } from '../hooks/haptics';
import { useTheme } from '../theme/theme';

const PERIODS: readonly BudgetPeriod[] = ['day', 'week', 'month', 'year'];
const PERIOD_NAMES = ['Daily', 'Weekly', 'Monthly', 'Yearly'] as const;
const KINDS = ['Overall budget', 'Category budget'] as const;

/** A new budget, or a change to one: for everything or a category, over a period. */
export default function EditBudget() {
  const { id, kind } = useLocalSearchParams<{ id?: string; kind?: 'overall' | 'category' }>();
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useData();
  // As it was on opening.
  const [old] = useState(() => store.data.budgets.find((b) => b.id === id));
  const [forAll, setForAll] = useState(() => (old ? old.categoryId === null : kind ? kind === 'overall' : store.data.budgets.length === 0));
  const [period, setPeriod] = useState<BudgetPeriod>(old?.period ?? 'month');
  const [categoryId, setCategoryId] = useState(old?.categoryId ?? null);
  const [pad, setPad] = useState(() => {
    const { typing } = store.data.settings;
    return old ? padOf(old.amount, typing) : emptyPad(typing);
  });
  const saved = useRef(false);

  // A category has one budget, so those with one already aren't offered.
  const options = ownCategories(data, false).filter((c) => c.id === old?.categoryId || !data.budgets.some((b) => b.categoryId === c.id));

  const warn = (text: string) => {
    haptics.no();
    messages.warn(text);
  };

  const save = (close: () => void) => {
    if (saved.current) return;
    const amount = padValue(pad);
    if (amount <= 0) return warn('Enter an amount');
    if (!forAll && !data.categories.some((c) => c.id === categoryId)) return warn('Choose a category');
    saved.current = true;
    // A change of amount doesn't start the period again.
    const before = old ?? (forAll ? overallOf(data) : undefined);
    const start = before?.period === period ? before.start : periodStart(toDay(Date.now()), period, data.settings);
    store.saveBudget({ categoryId: forAll ? null : categoryId, amount, period, start });
    haptics.done();
    close();
  };

  return (
    <SlideUp>
      {(close) => (
        <View style={[styles.fill, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
          <TopAppBar title={old ? 'Edit budget' : 'New budget'} onBack={close} close />
          {old ? null : (
            <View style={styles.side}>
              <SegmentedButton fullWidth options={KINDS} index={forAll ? 0 : 1} onChange={(i) => setForAll(i === 0)} />
            </View>
          )}
          <View style={[styles.fill, styles.middle]}>
            <TypedAmount pad={pad} onKey={setPad} />
          </View>
          {forAll ? null : options.length === 0 ? (
            <AppText variant="bodyLarge" color={m3.onSurfaceVariant} style={styles.none}>
              Every category already has a budget
            </AppText>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={styles.chipRow}>
              {options.map((c) => (
                <FilterChip
                  key={c.id}
                  emoji={c.emoji}
                  label={c.name}
                  selected={c.id === categoryId}
                  onPress={() => {
                    // The category of a budget that exists stays as it is.
                    if (old) return;
                    haptics.select();
                    setCategoryId(c.id);
                  }}
                />
              ))}
            </ScrollView>
          )}
          <View style={styles.side}>
            <SegmentedButton fullWidth options={PERIOD_NAMES} index={PERIODS.indexOf(period)} onChange={(i) => setPeriod(PERIODS[i])} />
          </View>
          <View style={styles.pad}>
            <NumberPad pad={pad} onKey={setPad} onSubmit={() => save(close)} submitLabel="Save budget" />
          </View>
        </View>
      )}
    </SlideUp>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  middle: { justifyContent: 'center' },
  side: { paddingHorizontal: 16 },
  chips: { flexGrow: 0, marginBottom: 8 },
  chipRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  none: { textAlign: 'center', paddingBottom: 16 },
  pad: { marginTop: 12 },
});
