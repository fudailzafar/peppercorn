import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { BigAmount } from '../../components/Bits';
import { useDeleteFlow } from '../../components/DeleteFlow';
import { Popover, PopoverItem, useAnchor, anchorProps } from '../../components/Overlays';
import { TransactionRow } from '../../components/TransactionRow';
import { groupByDay, logPeriodStart, totalsSince, upcoming } from '../../lib/calc';
import { addDays, addMonths, dayLabel, isSameDay, monthName, startOfDay, startOfMonth, startOfWeek } from '../../lib/dates';
import { fmtFull, fmtSmart, currencySymbol } from '../../lib/format';
import { Haptics } from '../../lib/haptics';
import { useStore } from '../../lib/store';
import { useNow } from '../../lib/useNow';
import type { Transaction } from '../../lib/types';
import { useTheme } from '../../theme/theme';

type FilterType = 'all' | 'type' | 'day' | 'week' | 'month' | 'category' | 'recurring' | 'upcoming';

const FILTERS: { key: FilterType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'all entries', icon: 'albums' },
  { key: 'type', label: 'by type', icon: 'cash' },
  { key: 'day', label: 'by day', icon: 'calendar' },
  { key: 'week', label: 'by week', icon: 'calendar-number' },
  { key: 'month', label: 'by month', icon: 'calendar-clear' },
  { key: 'category', label: 'by category', icon: 'grid' },
  { key: 'recurring', label: 'recurring', icon: 'repeat' },
  { key: 'upcoming', label: 'upcoming', icon: 'sunny' },
];

const TIMEFRAMES = ['today', 'this week', 'this month', 'this year', 'all time'];
const HEADINGS: Record<number, string> = { 1: 'Net total', 2: 'Earned', 3: 'Spent' };

type Row =
  | { kind: 'header'; key: string; label: string; net: number | null }
  | { kind: 'item'; key: string; t: Transaction; future?: boolean; futureDate?: number };

export default function LogScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const settings = useStore((s) => s.settings);
  const welcomed = useStore((s) => s.settings.welcomed);
  const now = useNow();
  const { ask, remove, element: deleteSheet } = useDeleteFlow();
  const filterMenu = useAnchor();

  const [filter, setFilter] = useState<FilterType>('all');
  const [income, setIncome] = useState(false);
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [categoryIndex, setCategoryIndex] = useState(0);

  // First launch: show the welcome screen.
  useEffect(() => {
    if (!welcomed) router.push('/welcome');
  }, [welcomed]);

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
    if (settings.showUpcoming && (filter === 'all' || filter === 'upcoming')) {
      const next = upcoming(transactions);
      if (next.length > 0) {
        out.push({ kind: 'header', key: 'h-upcoming', label: 'UPCOMING', net: null });
        next.forEach((u) => out.push({ kind: 'item', key: `u-${u.transaction.id}`, t: u.transaction, future: true, futureDate: u.date }));
      }
    }
    if (filter !== 'upcoming') {
      for (const g of groupByDay(filtered)) {
        const label = isSameDay(g.day, now) ? 'TODAY' : dayLabel(new Date(g.day)).toUpperCase();
        out.push({ kind: 'header', key: `h-${g.day}`, label, net: g.net });
        g.items.forEach((t) => out.push({ kind: 'item', key: t.id, t }));
      }
    }
    return out;
  }, [filter, filtered, transactions, settings.showUpcoming, now]);

  if (transactions.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: c.PrimaryBackground }]}>
        <Ionicons name="file-tray-outline" size={75} color={c.GreyIcon} style={{ marginBottom: 20 }} />
        <AppText size={25} weight="medium" color="PrimaryText" style={{ opacity: 0.8, textAlign: 'center' }}>
          Your Log is Empty
        </AppText>
        <AppText size={19} weight="medium" color="SubtitleText" style={{ opacity: 0.8, textAlign: 'center', marginTop: 4 }}>
          {'Press the plus button\nto add your first entry'}
        </AppText>
      </View>
    );
  }

  const showHeader = filter === 'all';
  const filterTag = FILTERS.find((f) => f.key === filter)?.label ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: c.PrimaryBackground }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <IconBox onPress={() => router.push('/search')} label="Search">
          <Ionicons name="search" size={26} color={c.DarkIcon} />
        </IconBox>
        {filter !== 'all' ? (
          <AppText size={16} weight="semibold" color="SubtitleText">
            {filterTag}
          </AppText>
        ) : null}
        <View {...anchorProps(filterMenu)}>
          <IconBox onPress={filterMenu.open} label="Filter" active={filterMenu.visible}>
            <Ionicons name={filter === 'all' ? 'triangle-outline' : 'triangle'} size={24} color={c.DarkIcon} style={{ transform: [{ rotate: '180deg' }] }} />
          </IconBox>
        </View>
      </View>

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
            <AppText size={19} weight="medium" color="SubtitleText">
              No entries found.
            </AppText>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: 25, paddingBottom: 24 }}
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <DayHeader label={item.label} net={item.net} />
          ) : (
            <TransactionRow transaction={item.t} future={item.future} futureDate={item.futureDate} onDelete={ask} onQuickDelete={remove} />
          )
        }
      />
      {deleteSheet}
    </View>
  );
}

// MARK: Header (heading, timeframe pill, total)

function LogHeader() {
  const { c } = useTheme();
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
    <View style={{ alignItems: 'center', paddingTop: 36, paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View {...anchorProps(headingMenu)}>
          <Pressable onLongPress={headingMenu.open} delayLongPress={300}>
            <AppText size={18} weight="medium" style={{ opacity: 0.9 }}>
              {HEADINGS[settings.logHeading]}
            </AppText>
          </Pressable>
        </View>
        <View {...anchorProps(pill)}>
          <Pressable onPress={pill.open} style={[styles.pill, { borderColor: c.Outline }]} accessibilityLabel="Change time frame">
            <AppText size={18} weight="medium">
              {TIMEFRAMES[settings.logTimeFrame - 1]}
            </AppText>
          </Pressable>
        </View>
      </View>

      <View style={{ marginTop: 6 }}>
        <BigAmount value={fmtSmart(Math.abs(value), settings.showCents)} sign={sign as '+' | '-' | ''} currency={settings.currency} size={72} />
      </View>

      {bothSides ? (
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
          <AppText size={17} weight="medium" color="IncomeGreen">
            +{currencySymbol(settings.currency)}
            {fmtSmart(totals.income, settings.showCents)}
          </AppText>
          <AppText size={17} weight="medium" color="SubtitleText">
            -{currencySymbol(settings.currency)}
            {fmtSmart(totals.spent, settings.showCents)}
          </AppText>
        </View>
      ) : null}

      <Popover visible={pill.visible} anchor={pill.anchor} onClose={pill.close} align="center" width={170}>
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

      <Popover visible={headingMenu.visible} anchor={headingMenu.anchor} onClose={headingMenu.close} align="left" width={190}>
        {([3, 2, 1] as const).map((h) => (
          <PopoverItem
            key={h}
            label={h === 3 ? 'Total Spent' : h === 2 ? 'Total Income' : 'Net Total'}
            icon={h === 3 ? 'remove' : h === 2 ? 'add' : 'swap-vertical'}
            selected={settings.logHeading === h}
            onPress={() => {
              headingMenu.close();
              updateSettings({ logHeading: h });
            }}
          />
        ))}
      </Popover>
    </View>
  );
}

function DayHeader({ label, net }: { label: string; net: number | null }) {
  const { c } = useTheme();
  const showSign = useStore((s) => s.settings.showSign);
  const currency = useStore((s) => s.settings.currency);
  return (
    <View style={{ marginTop: 18, marginBottom: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 6 }}>
        <AppText size={20} weight="semibold" color="SubtitleText">
          {label}
        </AppText>
        {net !== null ? (
          <AppText size={20} weight="semibold" color="SubtitleText">
            {showSign ? (net >= 0 ? '+' : '-') : ''}
            {currencySymbol(currency)}
            {fmtFull(Math.abs(net))}
          </AppText>
        ) : null}
      </View>
      <View style={{ height: 2, borderRadius: 1, backgroundColor: c.Outline }} />
    </View>
  );
}

// MARK: Small pieces

function IconBox({ children, onPress, label, active }: { children: React.ReactNode; onPress: () => void; label: string; active?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={{ padding: 6, borderRadius: 8, backgroundColor: active ? c.SecondaryBackground : 'transparent' }}
    >
      {children}
    </Pressable>
  );
}

function Stepper({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  const { c } = useTheme();
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onPrev} hitSlop={12} style={[styles.stepButton, { backgroundColor: c.SecondaryBackground }]} accessibilityLabel="Previous">
        <Ionicons name="chevron-back" size={20} color={c.DarkIcon} />
      </Pressable>
      <AppText size={20} weight="semibold">
        {label}
      </AppText>
      <Pressable onPress={onNext} hitSlop={12} style={[styles.stepButton, { backgroundColor: c.SecondaryBackground }]} accessibilityLabel="Next">
        <Ionicons name="chevron-forward" size={20} color={c.DarkIcon} />
      </Pressable>
    </View>
  );
}

function TypeToggle({ income, onChange }: { income: boolean; onChange: (v: boolean) => void }) {
  const { c } = useTheme();
  const seg = (label: string, active: boolean, value: boolean) => (
    <Pressable
      onPress={() => onChange(value)}
      style={[styles.seg, active && { backgroundColor: c.SecondaryBackground }]}
    >
      <AppText size={18} weight="semibold" color={active ? 'PrimaryText' : 'SubtitleText'}>
        {label}
      </AppText>
    </Pressable>
  );
  return (
    <View style={[styles.segWrap, { borderColor: c.Outline }]}>
      {seg('Expense', !income, false)}
      {seg('Income', income, true)}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingBottom: 140 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25, minHeight: 50 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1.3, borderRadius: 100 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25, paddingTop: 8, paddingBottom: 4 },
  stepButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  segWrap: { flexDirection: 'row', alignSelf: 'center', borderWidth: 1.5, borderRadius: 100, padding: 3, marginTop: 8 },
  seg: { paddingHorizontal: 22, paddingVertical: 7, borderRadius: 100 },
});
