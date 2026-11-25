import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { Avatar } from '../../components/Avatar';
import { BigAmount } from '../../components/BigAmount';
import { EntryRow } from '../../components/EntryRow';
import { Icon, type IconName } from '../../components/Icon';
import { Button, Card, IconAvatar, LinearProgress, SEARCH_HEIGHT } from '../../components/material';
import { Touch } from '../../components/Touch';
import { useData, useMoney, useNow } from '../../data/hooks';
import { overallOf, progress } from '../../domain/budgets';
import { monthStart, toDay } from '../../domain/dates';
import { newestFirst, since, totals } from '../../domain/entries';
import { haptics } from '../../hooks/haptics';
import { openPage } from '../../hooks/nav';
import { useDeleter } from '../../hooks/useDeleter';
import { useFabScroll } from '../../hooks/useFabScroll';
import { shape } from '../../theme/material';
import { useTheme } from '../../theme/theme';

/** Home's latest entries. */
const RECENT = 6;

/** Search, this month at a glance, four shortcuts, and the latest entries. */
export default function Home() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useData();
  const now = useNow();
  const scroll = useFabScroll();
  const { deleter, question } = useDeleter();
  const recent = useMemo(() => newestFirst(data.entries).slice(0, RECENT), [data.entries]);
  const { income, name } = data.settings;

  return (
    <View style={[styles.fill, { backgroundColor: m3.surface }]}>
      <ScrollView {...scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 160 }}>
        <View style={styles.top}>
          <Touch ink={m3.onSurface} label="Search entries" accessibilityRole="search" onPress={() => openPage('/search')} style={[styles.search, { backgroundColor: m3.surfaceContainerHigh }]}>
            <Icon name="search" size={22} color={m3.onSurface} />
            <AppText variant="bodyLarge" color={m3.onSurfaceVariant} style={styles.searchText}>
              Search entries
            </AppText>
          </Touch>
          <Touch ink={m3.onSurface} radius={shape.full} label="Your profile" hitSlop={4} onPress={() => router.navigate('/settings')} style={styles.avatar}>
            <Avatar name={name} />
          </Touch>
        </View>

        <MonthCard />

        <View style={styles.shortcuts}>
          <Shortcut icon="expense" label={'Add\nexpense'} onPress={() => openPage('/entry')} />
          {income ? <Shortcut icon="income" label={'Add\nincome'} onPress={() => openPage('/entry?income=1')} /> : <Shortcut icon="wallet" label={'New\nbudget'} onPress={() => openPage('/edit-budget')} />}
          <Shortcut icon="history" label={'See\nhistory'} onPress={() => openPage('/history')} />
          <Shortcut icon="grid" label={'Edit\ncategories'} onPress={() => openPage('/categories')} />
        </View>

        <View style={styles.heading}>
          <AppText variant="titleLarge" accessibilityRole="header" style={styles.fill}>
            Recent
          </AppText>
          {recent.length > 0 ? <Button variant="text" label="See all" onPress={() => openPage('/history')} /> : null}
        </View>
        {recent.length === 0 ? (
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant} style={styles.none}>
            No entries yet. Tap Add entry to add your first one.
          </AppText>
        ) : null}
        {recent.map((entry) => (
          <EntryRow key={entry.id} entry={entry} deleter={deleter} today={toDay(now)} />
        ))}
      </ScrollView>
      {question}
    </View>
  );
}

/** What was spent this month, what came in, and how the overall budget is going. */
function MonthCard() {
  const { m3 } = useTheme();
  const data = useData();
  const now = useNow();
  const { code, brief, briefDigits } = useMoney();
  const month = useMemo(() => totals(since(data.entries, monthStart(toDay(now), data.settings), now)), [data, now]);
  const overall = overallOf(data);
  const p = overall && progress(data, overall, now);
  const pace = { over: m3.error, fast: m3.warning, onTrack: m3.primary };
  return (
    <Card hero style={styles.card}>
      <View style={styles.month}>
        <AppText variant="titleSmall" color={m3.onSurfaceVariant}>
          Spent this month
        </AppText>
        <View style={styles.amount}>
          <BigAmount digits={briefDigits(month.spent)} currency={code} size={48} />
        </View>
        {data.settings.income ? (
          <View style={styles.stats}>
            <Stat label="Income" value={brief(month.earned)} color={month.earned > 0 ? m3.success : undefined} />
            <Stat label={month.net < 0 ? 'Overspent' : 'Balance'} value={brief(month.net)} />
          </View>
        ) : null}
        <View style={[styles.line, { backgroundColor: m3.outlineVariant }]} />
      </View>
      <Touch
        ink={m3.onSurface}
        label={p ? `${brief(p.left)} ${p.over ? 'over' : 'left in'} your ${PERIOD[overall.period]} budget` : 'Set a monthly budget'}
        onPress={() => (overall ? router.navigate('/budget') : openPage('/edit-budget'))}
        style={styles.budget}
      >
        {p ? (
          <View style={[styles.fill, styles.budgetText]}>
            <AppText variant="bodyMedium" color={p.over ? m3.error : m3.onSurface}>
              {brief(p.left)} {p.over ? 'over' : 'left in'} your {PERIOD[overall.period]} budget
            </AppText>
            <LinearProgress fraction={p.used} color={pace[p.pace]} />
          </View>
        ) : (
          <AppText variant="labelLarge" color={m3.primary} style={styles.fill}>
            Set a monthly budget
          </AppText>
        )}
        <Icon name="chevron-forward" size={20} color={m3.onSurfaceVariant} />
      </Touch>
    </Card>
  );
}

const PERIOD = { day: 'daily', week: 'weekly', month: 'monthly', year: 'yearly' } as const;

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  const { m3 } = useTheme();
  return (
    <View style={styles.fill}>
      <AppText variant="bodySmall" color={m3.onSurfaceVariant}>
        {label}
      </AppText>
      <AppText variant="bodyLarge" weight="medium" color={color} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </AppText>
    </View>
  );
}

function Shortcut({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { m3 } = useTheme();
  return (
    <Touch
      ink={m3.onSurface}
      radius={shape.large}
      label={label.replace('\n', ' ')}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={styles.shortcut}
    >
      <IconAvatar icon={icon} size={56} />
      <AppText variant="labelMedium" maxFontSizeMultiplier={1.3} style={styles.shortcutText}>
        {label}
      </AppText>
    </Touch>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  search: { flex: 1, height: SEARCH_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderRadius: shape.full, overflow: 'hidden' },
  searchText: { letterSpacing: 0 },
  avatar: { borderRadius: shape.full, overflow: 'hidden' },
  card: { marginHorizontal: 16, marginTop: 20 },
  month: { paddingHorizontal: 20, paddingTop: 20 },
  amount: { marginTop: 4 },
  stats: { flexDirection: 'row', gap: 16, marginTop: 12 },
  line: { height: StyleSheet.hairlineWidth, marginTop: 16 },
  budget: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  budgetText: { gap: 8 },
  shortcuts: { flexDirection: 'row', paddingHorizontal: 8, marginTop: 12 },
  shortcut: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 12, borderRadius: shape.large, overflow: 'hidden' },
  shortcutText: { textAlign: 'center' },
  heading: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 4, marginTop: 8 },
  none: { paddingHorizontal: 16, paddingVertical: 4 },
});
