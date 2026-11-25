import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toDay } from '@/domain/dates';
import { historyRows, stepOf, type HistoryFilter, type HistoryRow } from '@/domain/history';
import { haptics } from '@/lib/haptics';
import { openPage } from '@/lib/navigation';
import { useData, useNow } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { Empty } from '@/ui/Empty';
import type { IconName } from '@/ui/Icon';
import { IconButton, SegmentedButton } from '@/ui/material';
import { Menu } from '@/ui/Menu';
import { Page } from '@/ui/Page';
import { EntryRow } from './EntryRow';
import { HistorySummary } from './HistorySummary';
import { TotalHeading } from './TotalHeading';
import { useDeleter } from './useDeleter';

const FILTERS = [
  { key: 'all', label: 'All entries', icon: 'albums' },
  { key: 'type', label: 'By type', icon: 'cash' },
  { key: 'day', label: 'By day', icon: 'calendar' },
  { key: 'week', label: 'By week', icon: 'calendar-number' },
  { key: 'month', label: 'By month', icon: 'calendar-clear' },
  { key: 'category', label: 'By category', icon: 'grid' },
  { key: 'repeating', label: 'Repeating', icon: 'repeat' },
  { key: 'upcoming', label: 'Upcoming', icon: 'sunny' },
] as const satisfies readonly { key: HistoryFilter; label: string; icon: IconName }[];

const isFilter = (text: string | undefined): text is HistoryFilter => FILTERS.some((f) => f.key === text);

const keyOf = (r: HistoryRow) => r.key;

/** Every entry by month, with the filters in a dropdown. */
export function HistoryScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useData();
  const today = toDay(useNow());
  const { deleter, question } = useDeleter();
  const [filter, setFilter] = useState<HistoryFilter>(isFilter(params.filter) ? params.filter : 'all');
  const [income, setIncome] = useState(false);
  const [by, setBy] = useState(0);
  const step = useMemo(() => stepOf(filter, by, data, today), [filter, by, data, today]);

  const rows = useMemo(() => historyRows(data, filter, step, income), [data, filter, step, income]);

  const row = useCallback(
    ({ item }: { item: HistoryRow }) => (item.kind === 'heading' ? <TotalHeading label={item.label} net={item.net} /> : <EntryRow entry={item.entry} due={item.due} deleter={deleter} today={today} />),
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
        // Rows are tall: three screens either way is plenty.
        windowSize={7}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={filter === 'all' ? HistorySummary : undefined}
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

const styles = StyleSheet.create({
  empty: { flex: 1, justifyContent: 'center', paddingBottom: 120 },
  type: { alignItems: 'center', marginTop: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 4 },
  shrink: { flexShrink: 1 },
  none: { textAlign: 'center', paddingTop: 60 },
});
