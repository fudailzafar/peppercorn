import { goBack } from '../lib/nav';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { BigAmount } from '../components/Bits';
import { FilterChip, IconButton, SegmentedButton, TopAppBar } from '../components/material';
import { NumberPad } from '../components/NumberPad';
import { display, fromNumber, toNumber, type EntryType } from '../lib/amount';
import { startOfCustomMonth, startOfDay, startOfWeek, startOfYear } from '../lib/dates';
import { Haptics } from '../lib/haptics';
import { useStore, useUi } from '../lib/store';
import { BUDGET_LABELS, type BudgetType } from '../lib/types';
import { useTheme } from '../theme/theme';

function periodStart(type: BudgetType, firstWeekday: number, firstDayOfMonth: number, now = new Date()): number {
  switch (type) {
    case 1: return startOfDay(now).getTime();
    case 2: return startOfWeek(now, firstWeekday).getTime();
    case 3: return startOfCustomMonth(now, firstDayOfMonth).getTime();
    default: return startOfYear(now).getTime();
  }
}

/** Create or edit a budget: overall or per category, with a period and an amount. */
export default function NewBudget() {
  const { id, kind } = useLocalSearchParams<{ id?: string; kind?: 'overall' | 'category' }>();
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useStore((s) => s.settings);
  const categories = useStore((s) => s.categories);
  const budgets = useStore((s) => s.budgets);
  const mainBudget = useStore((s) => s.mainBudget);
  const saveBudget = useStore((s) => s.saveBudget);
  const saveMainBudget = useStore((s) => s.saveMainBudget);
  const showToast = useUi((s) => s.showToast);
  const entryType = settings.numberEntryType as EntryType;

  const editingMain = id === 'main';
  const editingBudget = budgets.find((b) => b.id === id);
  const source = editingMain ? mainBudget : editingBudget;
  const editing = Boolean(source);

  const [overall, setOverall] = useState(editingMain || (!editing && (kind ? kind === 'overall' : !mainBudget && budgets.length === 0)));
  const [type, setType] = useState<BudgetType>(source?.type ?? 3);
  const [categoryId, setCategoryId] = useState<string | null>(editingBudget?.categoryId ?? null);
  const [raw, setRaw] = useState(() => (source ? fromNumber(source.amount, entryType) : ''));

  // Categories that don't have a budget yet (plus the one being edited).
  const available = categories.filter((x) => !x.income && !x.asset && (x.id === editingBudget?.categoryId || !budgets.some((b) => b.categoryId === x.id)));
  const amount = toNumber(raw, entryType);

  const save = () => {
    if (amount <= 0) {
      Haptics.warning();
      showToast({ title: 'Enter an amount', icon: 'alert-circle', tone: 'info' }, 1800);
      return;
    }
    if (!overall && !categoryId) {
      Haptics.warning();
      showToast({ title: 'Choose a category', icon: 'alert-circle', tone: 'info' }, 1800);
      return;
    }
    const start = source && source.type === type ? source.startDate : periodStart(type, settings.firstWeekday, settings.firstDayOfMonth);
    if (overall) saveMainBudget(amount, type, start);
    else if (categoryId) saveBudget(categoryId, amount, type, start);
    Haptics.success();
    goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: m3.surface }}>
      <TopAppBar title={editing ? 'Edit budget' : 'New budget'} close onBack={() => goBack()} />

      {!editing ? (
        <View style={styles.padded}>
          <SegmentedButton fullWidth options={['Overall budget', 'Category budget']} index={overall ? 0 : 1} onChange={(i) => setOverall(i === 0)} />
        </View>
      ) : null}

      <View style={styles.amountArea}>
        <View style={{ alignSelf: 'stretch', paddingHorizontal: 56, alignItems: 'center' }}>
          <BigAmount value={display(raw, entryType)} currency={settings.currency} size={57} />
          {/* Backspace beside the amount, as on the Add entry screen. */}
          {entryType === 2 && raw.length > 0 ? (
            <View style={styles.backspace}>
              <IconButton icon="backspace-outline" onPress={() => setRaw(raw.slice(0, -1))} label="Delete digit" />
            </View>
          ) : null}
        </View>
      </View>

      {!overall ? (
        <View style={{ marginBottom: 12 }}>
          {available.length === 0 ? (
            <AppText variant="bodyLarge" color={m3.onSurfaceVariant} style={{ textAlign: 'center' }}>
              Every category already has a budget.
            </AppText>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {available.map((cat) => {
                const selected = cat.id === categoryId;
                return (
                  <FilterChip
                    key={cat.id}
                    emoji={cat.emoji}
                    label={cat.name}
                    selected={selected}
                    onPress={() => {
                      if (editing) return;
                      Haptics.selection();
                      setCategoryId(cat.id);
                    }}
                  />
                );
              })}
            </ScrollView>
          )}
        </View>
      ) : null}

      <View style={[styles.padded, { marginBottom: 12 }]}>
        <SegmentedButton fullWidth options={([1, 2, 3, 4] as BudgetType[]).map((t) => BUDGET_LABELS[t])} index={type - 1} onChange={(i) => setType((i + 1) as BudgetType)} />
      </View>

      <View style={{ paddingBottom: Math.max(insets.bottom, 12) + 4 }}>
        <NumberPad raw={raw} onChange={setRaw} entryType={entryType} onSubmit={save} submitLabel="Save budget" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: 16 },
  amountArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Pinned to the right edge, level with the amount, so it never sits on top of the digits.
  backspace: { position: 'absolute', right: 8, top: 0, bottom: 0, justifyContent: 'center' },
});
