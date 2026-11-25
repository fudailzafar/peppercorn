import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toDay } from '@/domain/dates';
import { newestFirst } from '@/domain/entries';
import { EntryRow } from '@/features/entries/EntryRow';
import { useDeleter } from '@/features/entries/useDeleter';
import { openPage } from '@/lib/navigation';
import { useData, useNow } from '@/state/hooks';
import { shape } from '@/theme/material';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { Avatar } from '@/ui/Avatar';
import { Icon } from '@/ui/Icon';
import { Button, SEARCH_HEIGHT } from '@/ui/material';
import { Touch } from '@/ui/Touch';
import { useFabScroll } from '@/ui/useFabScroll';
import { MonthCard } from './MonthCard';
import { Shortcut } from './Shortcut';

/** Home's latest entries. */
const RECENT = 6;

/** Search, this month at a glance, four shortcuts, and the latest entries. */
export function HomeScreen() {
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

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  search: { flex: 1, height: SEARCH_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderRadius: shape.full, overflow: 'hidden' },
  searchText: { letterSpacing: 0 },
  avatar: { borderRadius: shape.full, overflow: 'hidden' },
  shortcuts: { flexDirection: 'row', paddingHorizontal: 8, marginTop: 12 },
  heading: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 4, marginTop: 8 },
  none: { paddingHorizontal: 16, paddingVertical: 4 },
});
