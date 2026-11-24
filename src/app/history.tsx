import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { goBack } from '../lib/nav';
import { FlatList, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '../components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { BigAmount } from '../components/Bits';
import { useDeleteFlow } from '../components/DeleteFlow';
import { AssistChip, Card, IconButton, SegmentedButton, TopAppBar } from '../components/material';
import { Popover, PopoverItem, useAnchor, anchorProps } from '../components/Overlays';
import { TransactionRow } from '../components/TransactionRow';
import { groupByMonth, logPeriodStart, totalsSince, upcoming } from '../lib/calc';
import { addDays, addMonths, dayLabel, isSameDay, monthName, monthYear, startOfDay, startOfMonth, startOfWeek } from '../lib/dates';
import { fmtFull, fmtSmart, currencySymbol } from '../lib/format';
import { Haptics } from '../lib/haptics';
import { useStore } from '../lib/store';
import { useNow } from '../lib/useNow';
import type { Transaction } from '../lib/types';
import { shape } from '../theme/material';
import { useTheme } from '../theme/theme';

type FilterType = 'all' | 'type' | 'day' | 'week' | 'month' | 'category' | 'recurring' | 'upcoming';

const FILTERS: { key: FilterType; label: string; icon: IconName }[] = [
  { key: 'all', label: 'All entries', icon: 'albums' },
  { key: 'type', label: 'By type', icon: 'cash' },
  { key: 'day', label: 'By day', icon: 'calendar' },
  { key: 'week', label: 'By week', icon: 'calendar-number' },
  { key: 'month', label: 'By month', icon: 'calendar-clear' },
  { key: 'category', label: 'By category', icon: 'grid' },
  { key: 'recurring', label: 'Repeating', icon: 'repeat' },
  { key: 'upcoming', label: 'Upcoming', icon: 'sunny' },
];

const TIMEFRAMES = ['Today', 'This week', 'This month', 'This year', 'All time'];
const HEADINGS: Record<number, string> = { 1: 'Net total', 2: 'Earned', 3: 'Spent' };

type Row =
  | { kind: 'header'; key: string; label: string; net: number | null }
  | { kind: 'item'; key: string; t: Transaction; future?: boolean; futureDate?: number };

/** Transaction history: every entry grouped by month, with the filters in a dropdown. */
export default function HistoryScreen() {
  const { filter: initialFilter } = useLocalSearchParams<{ filter?: FilterType }>();
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const settings = useStore((s) => s.settings);
  const now = useNow();
  const { ask, remove, element: deleteSheet } = useDeleteFlow();
  const filterMenu = useAnchor();

  const [filter, setFilter] = useState<FilterType>(FILTERS.some((f) => f.key === initialFilter) ? (initialFilter as FilterType) : 'all');
  const [income, setIncome] = useState(false);
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [categoryIndex, setCategoryIndex] = useState(0);

  const sortedCategories = useMemo(() => [...categories].sort((a, b) => Number(a.income) - Number(b.income) || a.order - b.order), [categories]);
  const category = sortedCategories[Math.min(categoryIndex, Math.max(sortedCategories.length - 1, 0))];

  const weekStart = useMemo(() => addDays(startOfWeek(new Date(now), settings.firstWeekday), weekOffset * 7), [weekOffset, settings.firstWeekday, now]);
  const monthStart = useMemo(() => addMonths(startOfMonth(new Date(now)), monthOffset), [monthOffset, now]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'type': return transactions.filter((t) => t.income === income);
      case 'day': return transactions.filter((t) => isSameDay(t.date, day));
      case 'week': return transactions.filter((t) => t.date >= weekStart.getTime() && t.date < addDays(weekStart, 7).getTime());
      case 'month': return transactions.filter((t) => t.date >= monthStart.getTime() && t.date < addMonths(monthStart, 1).getTime());
      case 'category': return category ? transactions.filter((t) => t.categoryId === category.id) : [];
      case 'recurring': return transactions.filter((t) => t.recurringType > 0);
      case 'upcoming': return [];
      default: return transactions;
    }
  }, [filter, transactions, income, day, weekStart, monthStart, category]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    if (filter === 'upcoming' || (filter === 'all' && settings.showUpcoming)) {
      const next = upcoming(transactions);
      if (next.length > 0) {
        out.push({ kind: 'header', key: 'h-upcoming', label: 'Upcoming', net: null });
        next.forEach((u) => out.push({ kind: 'item', key: `u-${u.transaction.id}`, t: u.transaction, future: true, futureDate: u.date }));
      }
    }
    if (filter !== 'upcoming') {
      for (const g of groupByMonth(filtered)) {
        out.push({ kind: 'header', key: `h-${g.month}`, label: monthYear(new Date(g.month)), net: g.net });
        g.items.forEach((t) => out.push({ kind: 'item', key: t.id, t }));
      }
    }
    return out;
  }, [filter, filtered, transactions, settings.showUpcoming]);

  if (transactions.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: m3.surface }]}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
          <TopAppBar title="History" onBack={() => goBack()} />
        </View>
        <View style={[styles.emptyIcon, { backgroundColor: m3.surfaceContainerHigh }]}>
          <Icon name="file-tray-outline" size={44} color={m3.onSurfaceVariant} />
        </View>
        <AppText variant="headlineSmall" color={m3.onSurface} style={{ textAlign: 'center', marginTop: 24 }}>
          No entries yet
        </AppText>
        <AppText variant="bodyLarge" color={m3.onSurfaceVariant} style={{ textAlign: 'center', marginTop: 8 }}>
          Your expenses and income will show up here.
        </AppText>
      </View>
    );
  }

  const showHeader = filter === 'all';

  return (
    <View style={{ flex: 1, backgroundColor: m3.surface }}>
      <TopAppBar
        title="History"
        onBack={() => goBack()}
        actions={
          <>
            <IconButton icon="search" onPress={() => router.push('/search')} label="Search" />
            <View {...anchorProps(filterMenu)}>
              <IconButton icon={filter === 'all' ? 'options-outline' : 'options'} onPress={filterMenu.open} label="Filter" tint={filter === 'all' ? undefined : m3.primary} />
            </View>
          </>
        }
      />

      <Popover visible={filterMenu.visible} anchor={filterMenu.anchor} onClose={filterMenu.close} align="right" width={210}>
        {FILTERS.map((f) => (
          <PopoverItem
            key={f.key}
            label={f.label}
            icon={f.icon}
            selected={filter === f.key}
            onPress={() => {
              Haptics.selection();
              filterMenu.close();
              setFilter(f.key);
            }}
          />
        ))}
      </Popover>

      {filter === 'type' ? <TypeToggle income={income} onChange={setIncome} /> : null}
      {filter === 'day' ? <Stepper label={isSameDay(day, now) ? 'Today' : dayLabel(day)} onPrev={() => setDay(addDays(day, -1))} onNext={() => setDay(addDays(day, 1))} /> : null}
      {filter === 'week' ? (
        <Stepper
          label={weekOffset === 0 ? 'This week' : `${weekStart.getDate()} ${monthName(weekStart)} - ${addDays(weekStart, 6).getDate()} ${monthName(addDays(weekStart, 6))}`}
          onPrev={() => setWeekOffset(weekOffset - 1)}
          onNext={() => setWeekOffset(weekOffset + 1)}
        />
      ) : null}
      {filter === 'month' ? (
        <Stepper label={monthOffset === 0 ? 'This month' : `${monthName(monthStart)} ${monthStart.getFullYear()}`} onPrev={() => setMonthOffset(monthOffset - 1)} onNext={() => setMonthOffset(monthOffset + 1)} />
      ) : null}
      {filter === 'category' && category ? (
        <Stepper
          label={`${category.emoji}  ${category.name}`}
          onPrev={() => setCategoryIndex((i) => (i - 1 + sortedCategories.length) % sortedCategories.length)}
          onNext={() => setCategoryIndex((i) => (i + 1) % sortedCategories.length)}
        />
      ) : null}

      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        ListHeaderComponent={showHeader ? <LogHeader /> : <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <AppText variant="bodyLarge" color={m3.onSurfaceVariant}>
              No entries match this filter
            </AppText>
          </View>
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <MonthHeader label={item.label} net={item.net} />
          ) : (
            <TransactionRow showDate transaction={item.t} future={item.future} futureDate={item.futureDate} onDelete={ask} onQuickDelete={remove} />
          )
        }
      />
      {deleteSheet}
    </View>
  );
}

// MARK: Header (heading, timeframe pill, total)

function LogHeader() {
  const { m3 } = useTheme();
  const transactions = useStore((s) => s.transactions);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const headingMenu = useAnchor();
  const pill = useAnchor();

  const totals = useMemo(() => totalsSince(transactions, logPeriodStart(settings.logTimeFrame, settings)), [transactions, settings]);
  const value = settings.logHeading === 1 ? totals.net : settings.logHeading === 2 ? totals.income : totals.spent;
  const sign = !settings.showSign ? '' : settings.logHeading === 1 ? (value >= 0 ? '+' : '-') : settings.logHeading === 2 ? '+' : '-';
  const bothSides = totals.spent !== 0 && totals.income !== 0 && settings.logHeading === 1;

  return (
    // A tonal "summary" card (28dp corners) holding the heading, the period chip and the total.
    <Card hero style={styles.summary}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View {...anchorProps(headingMenu)}>
          <AssistChip label={HEADINGS[settings.logHeading]} accessibilityLabel="Change what the total shows" onPress={headingMenu.open} trailing={<Icon name="chevron-down" size={18} color={m3.onSurfaceVariant} />} />
        </View>
        <View {...anchorProps(pill)}>
          <AssistChip
            label={TIMEFRAMES[settings.logTimeFrame - 1]}
            accessibilityLabel="Change time frame"
            onPress={pill.open}
            trailing={<Icon name="chevron-down" size={18} color={m3.onSurfaceVariant} />}
          />
        </View>
      </View>

      <View style={{ marginTop: 12, alignItems: 'flex-start' }}>
        <BigAmount value={fmtSmart(Math.abs(value), settings.showCents)} sign={sign as '+' | '-' | ''} currency={settings.currency} size={57} align="flex-start" />
      </View>

      {bothSides ? (
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
          <AppText variant="labelLarge" color={m3.success}>
            +{currencySymbol(settings.currency)}
            {fmtSmart(totals.income, settings.showCents)}
          </AppText>
          <AppText variant="labelLarge" color={m3.onSurfaceVariant}>
            -{currencySymbol(settings.currency)}
            {fmtSmart(totals.spent, settings.showCents)}
          </AppText>
        </View>
      ) : null}

      <Popover visible={pill.visible} anchor={pill.anchor} onClose={pill.close} align="right" width={190}>
        {TIMEFRAMES.map((label, i) => (
          <PopoverItem
            key={label}
            label={label}
            selected={settings.logTimeFrame === i + 1}
            onPress={() => {
              Haptics.selection();
              pill.close();
              updateSettings({ logTimeFrame: (i + 1) as 1 | 2 | 3 | 4 | 5 });
            }}
          />
        ))}
      </Popover>

      <Popover visible={headingMenu.visible} anchor={headingMenu.anchor} onClose={headingMenu.close} align="left" width={200}>
        {([3, 2, 1] as const).map((h) => (
          <PopoverItem
            key={h}
            label={HEADINGS[h]}
            icon={h === 3 ? 'remove' : h === 2 ? 'add' : 'swap-vertical'}
            selected={settings.logHeading === h}
            onPress={() => {
              headingMenu.close();
              updateSettings({ logHeading: h });
            }}
          />
        ))}
      </Popover>
    </Card>
  );
}

/** An M3 list subheader: label on the left, the month's total on the right. */
function MonthHeader({ label, net }: { label: string; net: number | null }) {
  const { m3 } = useTheme();
  const showSign = useStore((s) => s.settings.showSign);
  const currency = useStore((s) => s.settings.currency);
  return (
    <View style={styles.subheader}>
      <AppText variant="labelLarge" color={m3.onSurfaceVariant}>
        {label}
      </AppText>
      {net !== null ? (
        <AppText variant="labelLarge" color={m3.onSurfaceVariant}>
          {showSign ? (net >= 0 ? '+' : '-') : ''}
          {currencySymbol(currency)}
          {fmtFull(Math.abs(net))}
        </AppText>
      ) : null}
    </View>
  );
}

// MARK: Small pieces

function Stepper({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  const { m3 } = useTheme();
  return (
    <View style={styles.stepper}>
      <IconButton icon="chevron-back" onPress={onPrev} label="Previous" />
      <AppText variant="titleMedium" color={m3.onSurface}>
        {label}
      </AppText>
      <IconButton icon="chevron-forward" onPress={onNext} label="Next" />
    </View>
  );
}

function TypeToggle({ income, onChange }: { income: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ alignSelf: 'center', marginTop: 8 }}>
      <SegmentedButton options={['Expense', 'Income']} index={income ? 1 : 0} onChange={(i) => onChange(i === 1)} />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 120 },
  emptyIcon: { width: 96, height: 96, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
  summary: { marginHorizontal: 16, marginTop: 8, marginBottom: 8, padding: 20 },
  subheader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 4 },
});
