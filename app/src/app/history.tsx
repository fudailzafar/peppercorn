import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { BigAmount } from '../components/BigAmount';
import { Empty } from '../components/Empty';
import { EntryRow } from '../components/EntryRow';
import { Icon, type IconName } from '../components/Icon';
import { labelIn, SPANS, TOTALS } from '../components/labels';
import { AssistChip, Card, IconButton, SegmentedButton } from '../components/material';
import { Menu } from '../components/Menu';
import { Page } from '../components/Page';
import { TotalHeading } from '../components/TotalHeading';
import { store } from '../data/app';
import { useData, useMoney, useNow } from '../data/hooks';
import { addDays, addMonths, daysLabel, monthLabel, monthStart, monthYear, startOf, toDay, weekdayLabel, weekStart } from '../domain/dates';
import { byMonth, since, spanStart, totals, upcoming } from '../domain/entries';
import type { AppData, Category, Day, Entry, HistoryTotal } from '../domain/model';
import { haptics } from '../hooks/haptics';
import { openPage } from '../hooks/nav';
import { useDeleter } from '../hooks/useDeleter';
import { useTheme } from '../theme/theme';

const FILTERS = [
  { key: 'all', label: 'All entries', icon: 'albums' },
  { key: 'type', label: 'By type', icon: 'cash' },
  { key: 'day', label: 'By day', icon: 'calendar' },
  { key: 'week', label: 'By week', icon: 'calendar-number' },
  { key: 'month', label: 'By month', icon: 'calendar-clear' },
  { key: 'category', label: 'By category', icon: 'grid' },
  { key: 'repeating', label: 'Repeating', icon: 'repeat' },
  { key: 'upcoming', label: 'Upcoming', icon: 'sunny' },
] as const satisfies readonly { key: string; label: string; icon: IconName }[];

type Filter = (typeof FILTERS)[number]['key'];
const isFilter = (text: string | undefined): text is Filter => FILTERS.some((f) => f.key === text);

type Row = { kind: 'heading'; key: string; label: string; net: number | null } | { kind: 'entry'; key: string; entry: Entry; due?: Day };
const keyOf = (r: Row) => r.key;

/** Where the arrows have stepped to: the day, week, month or category shown, and what it is called. */
interface Step {
  label: string;
  from?: Day;
  to?: Day;
  category?: Category;
}

function stepOf(filter: Filter, by: number, data: AppData, today: Day): Step | null {
  switch (filter) {
    case 'day': {
      const from = addDays(today, by);
      return { label: by === 0 ? 'Today' : weekdayLabel(from, today), from, to: addDays(from, 1) };
    }
    case 'week': {
      const from = addDays(weekStart(today, data.settings), 7 * by);
      return { label: by === 0 ? 'This week' : daysLabel(from, addDays(from, 6)), from, to: addDays(from, 7) };
    }
    case 'month': {
      const from = addMonths(monthStart(today, data.settings), by);
      return { label: by === 0 ? 'This month' : monthLabel(from, today), from, to: addMonths(from, 1) };
    }
    case 'category': {
      const all = [...data.categories].sort((a, b) => Number(a.income) - Number(b.income) || a.order - b.order);
      const category = all[((by % all.length) + all.length) % all.length];
      return category ? { label: `${category.emoji}  ${category.name}`, category } : null;
    }
    default:
      return null;
  }
}

function matching(filter: Filter, entries: readonly Entry[], step: Step | null, income: boolean): readonly Entry[] {
  if (filter === 'type') return entries.filter((e) => e.income === income);
  if (filter === 'repeating') return entries.filter((e) => e.repeat);
  if (filter === 'upcoming') return [];
  if (step?.category) return entries.filter((e) => e.categoryId === step.category?.id);
  if (step?.from && step.to) {
    const [from, to] = [startOf(step.from), startOf(step.to)];
    return entries.filter((e) => e.date >= from && e.date < to);
  }
  return entries;
}

/** Every entry by month, with the filters in a dropdown. */
export default function History() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useData();
  const today = toDay(useNow());
  const { deleter, question } = useDeleter();
  const [filter, setFilter] = useState<Filter>(isFilter(params.filter) ? params.filter : 'all');
  const [income, setIncome] = useState(false);
  const [by, setBy] = useState(0);
  const step = useMemo(() => stepOf(filter, by, data, today), [filter, by, data, today]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const next = filter === 'upcoming' || (filter === 'all' && data.settings.upcoming) ? upcoming(data.entries) : [];
    if (next.length > 0) out.push({ kind: 'heading', key: 'upcoming', label: 'Upcoming', net: null });
    for (const { entry, day } of next) out.push({ kind: 'entry', key: `due ${entry.id}`, entry, due: day });
    for (const { day, net, entries } of byMonth(matching(filter, data.entries, step, income))) {
      out.push({ kind: 'heading', key: day, label: monthYear(day), net });
      for (const entry of entries) out.push({ kind: 'entry', key: entry.id, entry });
    }
    return out;
  }, [filter, data, step, income]);

  const row = useCallback(
    ({ item }: { item: Row }) => (item.kind === 'heading' ? <TotalHeading label={item.label} net={item.net} /> : <EntryRow entry={item.entry} due={item.due} deleter={deleter} today={today} />),
    [deleter, today],
  );

  if (data.entries.length === 0) {
    return (
      <Page title="History" scroll={false}>
        <View style={styles.empty}>
          <Empty icon="file-tray-outline" title="No entries yet" text="Your expenses and income will show up here." />
        </View>
      </Page>
    );
  }

  const menu = FILTERS.map((f) => ({
    label: f.label,
    icon: f.icon,
    selected: f.key === filter,
    onPress: () => {
      haptics.select();
      setFilter(f.key);
      setBy(0);
    },
  }));
  const actions = (
    <>
      <IconButton icon="search" label="Search" onPress={() => openPage('/search')} />
      <Menu items={menu}>{(open) => <IconButton icon="options" label={`Filter, ${menu.find((f) => f.selected)?.label ?? ''}`} tint={filter === 'all' ? undefined : m3.primary} onPress={open} />}</Menu>
    </>
  );

  return (
    <Page title="History" actions={actions} scroll={false}>
      {filter === 'type' ? (
        <View style={styles.type}>
          <SegmentedButton options={['Expense', 'Income']} index={income ? 1 : 0} onChange={(i) => setIncome(i === 1)} />
        </View>
      ) : null}
      {step ? (
        <View style={styles.stepper}>
          <IconButton icon="chevron-back" label="Previous" onPress={() => setBy(by - 1)} />
          <AppText variant="titleMedium" accessibilityLiveRegion="polite" numberOfLines={1} style={styles.shrink}>
            {step.label}
          </AppText>
          <IconButton icon="chevron-forward" label="Next" onPress={() => setBy(by + 1)} />
        </View>
      ) : null}
      <FlatList
        data={rows}
        keyExtractor={keyOf}
        renderItem={row}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={filter === 'all' ? Summary : undefined}
        ListEmptyComponent={
          <AppText variant="bodyLarge" color={m3.onSurfaceVariant} style={styles.none}>
            No entries match this filter
          </AppText>
        }
      />
      {question}
    </Page>
  );
}

const ICON: Record<HistoryTotal, IconName> = { spent: 'remove', earned: 'add', net: 'swap-vertical' };

/** The total at the top: what it counts, and over how long. */
function Summary() {
  const { m3 } = useTheme();
  const data = useData();
  const now = useNow();
  const money = useMoney();
  const { historySpan: span, historyTotal: total, signs, currency } = data.settings;
  const sums = useMemo(() => totals(since(data.entries, spanStart(span, toDay(now), data.settings), now)), [data, span, now]);
  const value = total === 'spent' ? -sums.spent : sums[total];
  const down = <Icon name="chevron-down" size={18} color={m3.onSurfaceVariant} />;
  return (
    <Card hero style={styles.summary}>
      <View style={styles.chips}>
        <Menu items={TOTALS.map(([key, label]) => ({ label, icon: ICON[key], selected: key === total, onPress: () => store.set({ historyTotal: key }) }))}>
          {(open) => <AssistChip label={labelIn(TOTALS, total)} accessibilityLabel={`Total shown: ${labelIn(TOTALS, total)}`} trailing={down} onPress={open} />}
        </Menu>
        <Menu items={SPANS.map(([key, label]) => ({ label, selected: key === span, onPress: () => store.set({ historySpan: key }) }))}>
          {(open) => <AssistChip label={labelIn(SPANS, span)} accessibilityLabel={`Time frame: ${labelIn(SPANS, span)}`} trailing={down} onPress={open} />}
        </Menu>
      </View>
      <View style={styles.total}>
        <BigAmount digits={money.briefDigits(value)} currency={currency} sign={signs ? (value < 0 || total === 'spent' ? '-' : '+') : ''} size={57} />
      </View>
      {total === 'net' && sums.earned > 0 && sums.spent > 0 ? (
        <View style={styles.sides}>
          <AppText variant="labelLarge" color={m3.success}>
            +{money.brief(sums.earned)}
          </AppText>
          <AppText variant="labelLarge" color={m3.onSurfaceVariant}>
            -{money.brief(sums.spent)}
          </AppText>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, justifyContent: 'center', paddingBottom: 120 },
  type: { alignItems: 'center', marginTop: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 4 },
  shrink: { flexShrink: 1 },
  none: { textAlign: 'center', paddingTop: 60 },
  summary: { marginHorizontal: 16, marginVertical: 8, padding: 20 },
  chips: { flexDirection: 'row', justifyContent: 'space-between' },
  total: { marginTop: 12 },
  sides: { flexDirection: 'row', gap: 16, marginTop: 12 },
});
