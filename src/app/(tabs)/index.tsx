import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { Avatar } from '../../components/Avatar';
import { BigAmount } from '../../components/Bits';
import { CapsuleProgress } from '../../components/Charts';
import { useDeleteFlow } from '../../components/DeleteFlow';
import { Icon, type IconName } from '../../components/Icon';
import { Button, Card, SEARCH_HEIGHT, StateLayer } from '../../components/material';
import { TransactionRow } from '../../components/TransactionRow';
import { budgetProgress, mainBudgetSpent, totalsSince } from '../../lib/calc';
import { startOfCustomMonth } from '../../lib/dates';
import { currencySymbol, fmtSmart } from '../../lib/format';
import { Haptics } from '../../lib/haptics';
import { useStore } from '../../lib/store';
import { BUDGET_LABELS } from '../../lib/types';
import { useFabScroll } from '../../lib/useFabScroll';
import { useNow } from '../../lib/useNow';
import { shape } from '../../theme/material';
import { useTheme } from '../../theme/theme';

const RECENT = 6;

/** Home: search, this month at a glance, four shortcuts, and the latest entries. */
export default function HomeScreen() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const fabScroll = useFabScroll();
  const transactions = useStore((s) => s.transactions);
  const mainBudget = useStore((s) => s.mainBudget);
  const settings = useStore((s) => s.settings);
  const now = useNow();
  const { ask, remove, element } = useDeleteFlow();

  // First launch: show the welcome screen.
  useEffect(() => {
    if (!settings.welcomed) router.push('/welcome');
  }, [settings.welcomed]);

  const month = useMemo(() => totalsSince(transactions, startOfCustomMonth(new Date(now), settings.firstDayOfMonth)), [transactions, settings.firstDayOfMonth, now]);
  const recent = useMemo(() => [...transactions].sort((a, b) => b.date - a.date).slice(0, RECENT), [transactions]);

  const sym = currencySymbol(settings.currency);
  const money = (n: number) => `${sym}${fmtSmart(Math.abs(n), settings.showCents)}`;
  const budget = mainBudget ? budgetProgress(mainBudget, mainBudgetSpent(mainBudget, transactions)) : null;

  const shortcuts: { icon: IconName; label: string; go: () => void }[] = [
    { icon: 'expense', label: 'Add\nexpense', go: () => router.push('/transaction') },
    settings.incomeTracking
      ? { icon: 'income', label: 'Add\nincome', go: () => router.push({ pathname: '/transaction', params: { income: '1' } }) }
      : { icon: 'wallet', label: 'New\nbudget', go: () => router.push('/new-budget') },
    { icon: 'history', label: 'See\nhistory', go: () => router.push('/history') },
    { icon: 'grid', label: 'Edit\ncategories', go: () => router.push('/categories') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: m3.surface }}>
      <ScrollView {...fabScroll} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Search and profile */}
        <View style={styles.searchRow}>
          <Pressable
            onPress={() => router.push('/search')}
            accessibilityRole="search"
            accessibilityLabel="Search entries"
            android_ripple={{ color: `${m3.onSurface}1F` }}
            style={[styles.search, { backgroundColor: m3.surfaceContainerHigh }]}
          >
            <Icon name="search" size={22} color={m3.onSurface} />
            <AppText variant="bodyLarge" color={m3.onSurfaceVariant} style={{ includeFontPadding: false }}>
              Search entries
            </AppText>
          </Pressable>
          <Pressable onPress={() => router.navigate('/settings')} accessibilityRole="button" accessibilityLabel="Your profile" hitSlop={6}>
            <Avatar name={settings.profileName} size={40} />
          </Pressable>
        </View>

        {/* This month */}
        <Card hero style={styles.card}>
          <AppText variant="titleSmall" color={m3.onSurfaceVariant}>
            Spent this month
          </AppText>
          <View style={{ marginTop: 4 }}>
            <BigAmount value={fmtSmart(month.spent, settings.showCents)} currency={settings.currency} size={48} align="flex-start" />
          </View>
          {settings.incomeTracking ? (
            <View style={styles.split}>
              <Stat label="Income" value={money(month.income)} color={month.income > 0 ? m3.success : m3.onSurface} />
              <Stat label={month.net < 0 ? 'Overspent' : 'Balance'} value={money(month.net)} color={m3.onSurface} />
            </View>
          ) : null}
          <Pressable
            onPress={() => (mainBudget ? router.navigate('/budget') : router.push('/new-budget'))}
            accessibilityRole="button"
            style={[styles.budget, { borderTopColor: m3.outlineVariant }]}
          >
            {budget && mainBudget ? (
              <View style={{ flex: 1 }}>
                <AppText variant="bodyMedium" color={budget.over ? m3.error : m3.onSurface}>
                  {money(budget.left)} {budget.over ? 'over your' : 'left in your'} {BUDGET_LABELS[mainBudget.type].toLowerCase()} budget
                </AppText>
                <CapsuleProgress fraction={budget.fraction} elapsed={budget.elapsed} colour={budget.over ? m3.error : m3.primary} height={8} />
              </View>
            ) : (
              <AppText variant="labelLarge" color={m3.primary} style={{ flex: 1 }}>
                Set a monthly budget
              </AppText>
            )}
            <Icon name="chevron-forward" size={20} color={m3.onSurfaceVariant} />
          </Pressable>
        </Card>

        {/* Shortcuts */}
        <View style={styles.grid}>
          {shortcuts.map((s) => (
            <Pressable
              key={s.label}
              onPress={() => {
                Haptics.selection();
                s.go();
              }}
              accessibilityRole="button"
              accessibilityLabel={s.label.replace('\n', ' ')}
              style={styles.shortcut}
            >
              {({ pressed }) => (
                <>
                  <View style={[styles.shortcutIcon, { backgroundColor: m3.secondaryContainer }]}>
                    <StateLayer pressed={pressed} color={m3.onSecondaryContainer} radius={shape.full} />
                    <Icon name={s.icon} size={24} color={m3.onSecondaryContainer} />
                  </View>
                  <AppText variant="labelMedium" color={m3.onSurface} style={{ textAlign: 'center' }}>
                    {s.label}
                  </AppText>
                </>
              )}
            </Pressable>
          ))}
        </View>

        {/* Latest entries */}
        <View style={styles.sectionTitle}>
          <AppText variant="titleLarge" color={m3.onSurface} accessibilityRole="header">
            Recent
          </AppText>
          {transactions.length > 0 ? (
            <Button variant="text" label="See all" onPress={() => router.push('/history')} />
          ) : null}
        </View>
        {recent.length === 0 ? (
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant} style={{ paddingHorizontal: 16, paddingTop: 4 }}>
            No entries yet. Tap Add entry to add your first one.
          </AppText>
        ) : (
          recent.map((t) => <TransactionRow key={t.id} showDate transaction={t} onDelete={ask} onQuickDelete={remove} />)
        )}
      </ScrollView>
      {element}
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  const { m3 } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <AppText variant="bodySmall" color={m3.onSurfaceVariant}>
        {label}
      </AppText>
      <AppText variant="titleMedium" color={color} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  search: { flex: 1, height: SEARCH_HEIGHT, borderRadius: shape.full, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  card: { marginHorizontal: 16, marginTop: 20, padding: 20, paddingBottom: 12 },
  split: { flexDirection: 'row', gap: 16, marginTop: 12 },
  budget: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, paddingTop: 12, minHeight: 52, borderTopWidth: StyleSheet.hairlineWidth },
  grid: { flexDirection: 'row', paddingHorizontal: 8, marginTop: 12 },
  shortcut: { width: '25%', alignItems: 'center', gap: 8, paddingVertical: 12 },
  shortcutIcon: { width: 56, height: 56, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 4, marginTop: 8 },
});
