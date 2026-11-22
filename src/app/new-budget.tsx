import { goBack } from '../lib/nav';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Icon } from '../components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { BigAmount, CircleButton } from '../components/Bits';
import { NumberPad } from '../components/NumberPad';
import { display, fromNumber, toNumber, type EntryType } from '../lib/amount';
import { startOfCustomMonth, startOfDay, startOfWeek, startOfYear } from '../lib/dates';
import { Haptics } from '../lib/haptics';
import { useStore, useUi } from '../lib/store';
import { BUDGET_LABELS, type BudgetType } from '../lib/types';
import { useTheme, withAlpha } from '../theme/theme';

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
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { c } = useTheme();
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

  const [overall, setOverall] = useState(editingMain || (!editing && !mainBudget && budgets.length === 0));
  const [type, setType] = useState<BudgetType>(source?.type ?? 3);
  const [categoryId, setCategoryId] = useState<string | null>(editingBudget?.categoryId ?? null);
  const [raw, setRaw] = useState(() => (source ? fromNumber(source.amount, entryType) : ''));

  // Categories that don't have a budget yet (plus the one being edited).
  const available = categories.filter((x) => !x.income && (x.id === editingBudget?.categoryId || !budgets.some((b) => b.categoryId === x.id)));
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
    <View style={{ flex: 1, backgroundColor: c.PrimaryBackground, paddingTop: 16 }}>
      <View style={styles.top}>
        <CircleButton onPress={() => goBack()} label="Close" size={42}>
          <Icon name="close" size={22} color={c.SubtitleText} />
        </CircleButton>
        <AppText size={22} weight="semibold">
          {editing ? 'Edit Budget' : 'New Budget'}
        </AppText>
        <View style={{ width: 42 }} />
      </View>

      {!editing ? (
        <View style={[styles.segWrap, { borderColor: c.Outline }]}>
          {[
            { label: 'Overall Budget', value: true },
            { label: 'Category Budget', value: false },
          ].map((o) => (
            <Pressable key={o.label} onPress={() => setOverall(o.value)} style={[styles.seg, overall === o.value && { backgroundColor: c.SecondaryBackground }]}>
              <AppText size={17} weight="semibold" color={overall === o.value ? 'PrimaryText' : 'SubtitleText'}>
                {o.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.amountArea}>
        <BigAmount value={display(raw, entryType)} currency={settings.currency} size={60} />
      </View>

      {!overall ? (
        <View style={{ marginBottom: 12 }}>
          {available.length === 0 ? (
            <AppText size={18} weight="medium" color="SubtitleText" style={{ textAlign: 'center' }}>
              {'No remaining\ncategories.'}
            </AppText>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15, gap: 8 }}>
              {available.map((cat) => {
                const selected = cat.id === categoryId;
                return (
                  <Pressable
                    key={cat.id}
                    disabled={editing}
                    onPress={() => {
                      Haptics.selection();
                      setCategoryId(cat.id);
                    }}
                    style={[styles.catChip, { backgroundColor: withAlpha(cat.colour, selected ? 0.35 : 0.15), borderColor: selected ? cat.colour : 'transparent' }]}
                  >
                    <AppText size={18} weight="semibold" style={{ color: cat.colour }}>
                      {cat.emoji} {cat.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      ) : null}

      <View style={[styles.segWrap, { borderColor: c.Outline, marginBottom: 12 }]}>
        {([1, 2, 3, 4] as BudgetType[]).map((t) => (
          <Pressable key={t} onPress={() => setType(t)} style={[styles.seg, type === t && { backgroundColor: c.SecondaryBackground }]}>
            <AppText size={16} weight="semibold" color={type === t ? 'PrimaryText' : 'SubtitleText'}>
              {BUDGET_LABELS[t]}
            </AppText>
          </Pressable>
        ))}
      </View>

      <View style={{ paddingBottom: Math.max(insets.bottom, 12) + 4 }}>
        <NumberPad raw={raw} onChange={setRaw} entryType={entryType} onSubmit={save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, marginBottom: 14 },
  segWrap: { flexDirection: 'row', alignSelf: 'center', borderWidth: 1.5, borderRadius: 100, padding: 3 },
  seg: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100 },
  amountArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  catChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, borderWidth: 1.5 },
});
