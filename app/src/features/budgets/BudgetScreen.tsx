import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { countedIn, progress } from '@/domain/budgets';
import { toDay } from '@/domain/dates';
import { categoryOf } from '@/domain/entries';
import type { Entry } from '@/domain/model';
import { EntryRow } from '@/features/entries/EntryRow';
import { useDeleter } from '@/features/entries/useDeleter';
import { openPage } from '@/lib/navigation';
import { useData, useNow } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { IconButton, Subheader } from '@/ui/material';
import { Page } from '@/ui/Page';
import { BudgetHero } from './BudgetHero';

const TITLE = { day: 'Daily budget', week: 'Weekly budget', month: 'Monthly budget', year: 'Yearly budget' } as const;

/** One budget, and the spending that counts toward it. */
export function BudgetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useData();
  const now = useNow();
  const { deleter, question } = useDeleter();
  const budget = data.budgets.find((b) => b.id === id);
  const entries = useMemo(() => (budget ? countedIn(data, budget, now) : []), [budget, data, now]);
  const today = toDay(now);
  const row = useCallback(({ item }: { item: Entry }) => <EntryRow entry={item} deleter={deleter} today={today} />, [deleter, today]);

  if (!budget) return <Page title="Budget">{null}</Page>;
  const category = categoryOf(data, budget.categoryId);
  const title = category ? `${category.emoji} ${category.name}` : 'Overall budget';
  const edit = <IconButton icon="pencil" label="Edit budget" tint={m3.onSurface} onPress={() => openPage({ pathname: '/edit-budget', params: { id } })} />;
  return (
    <Page title={title} actions={edit} scroll={false}>
      <FlatList
        data={entries}
        keyExtractor={keyOf}
        renderItem={row}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <>
            <BudgetHero title={TITLE[budget.period]} p={progress(data, budget, now)} period={budget.period} />
            <Subheader text="Entries" />
          </>
        }
        ListEmptyComponent={
          <AppText variant="bodyLarge" color={m3.onSurfaceVariant} style={styles.none}>
            Nothing spent yet
          </AppText>
        }
      />
      {question}
    </Page>
  );
}

const keyOf = (e: Entry) => e.id;

const styles = StyleSheet.create({ none: { paddingHorizontal: 16, paddingVertical: 4 } });
