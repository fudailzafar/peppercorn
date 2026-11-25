import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toDay, weekdayLabel } from '@/domain/dates';
import { byDay, search } from '@/domain/entries';
import type { Entry } from '@/domain/model';
import { goBack } from '@/lib/navigation';
import { useData, useNow } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { IconButton, SearchBar } from '@/ui/material';
import { EntryRow } from './EntryRow';
import { TotalHeading } from './TotalHeading';
import { useDeleter } from './useDeleter';

const keyOf = (e: Entry) => e.id;

/** Search over notes, categories and amounts. */
export function SearchScreen() {
  const { q: first = '' } = useLocalSearchParams<{ q?: string }>();
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useData();
  const today = toDay(useNow());
  const { deleter, question } = useDeleter();
  const [query, setQuery] = useState(first);
  const sections = useMemo(() => byDay(search(data, query)).map((g) => ({ title: weekdayLabel(g.day, today), net: g.net, data: g.entries })), [data, query, today]);
  const row = useCallback(({ item }: { item: Entry }) => <EntryRow entry={item} deleter={deleter} today={today} timeOnly />, [deleter, today]);

  return (
    <View style={[styles.fill, { backgroundColor: m3.surface, paddingTop: insets.top + 12 }]}>
      <SearchBar grow autoFocus={first === ''} value={query} onChangeText={setQuery} placeholder="Search entries" leading={<IconButton icon="arrow-back" label="Back" tint={m3.onSurface} onPress={goBack} />} />
      <SectionList
        sections={sections}
        keyExtractor={keyOf}
        renderItem={row}
        // Rows are tall: three screens either way is plenty.
        windowSize={7}
        renderSectionHeader={heading}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 24 }}
        ListEmptyComponent={
          query.trim() === '' ? undefined : (
            <AppText variant="bodyLarge" color={m3.onSurfaceVariant} style={styles.none}>
              No entries match “{query.trim()}”
            </AppText>
          )
        }
      />
      {question}
    </View>
  );
}

const heading = ({ section }: { section: { title: string; net: number } }) => <TotalHeading label={section.title} net={section.net} />;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  none: { textAlign: 'center', marginTop: 48, paddingHorizontal: 16 },
});
