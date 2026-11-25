import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { BigAmount } from '../components/BigAmount';
import { ColumnChart } from '../components/ColumnChart';
import { EntryRow } from '../components/EntryRow';
import { Comparison } from '../components/InsightBits';
import { countOf } from '../components/labels';
import { Card, Subheader } from '../components/material';
import { Page } from '../components/Page';
import { useData, useMoney, useNow } from '../data/hooks';
import { toDay } from '../domain/dates';
import { categoryOf, newestFirst } from '../domain/entries';
import { against, categoryLines, compared, periodOf, phrase, trend, type Span } from '../domain/insights';
import type { Entry } from '../domain/model';
import { useDeleter } from '../hooks/useDeleter';
import { useTheme } from '../theme/theme';

const SPANS: readonly Span[] = ['week', 'month', 'year'];
const keyOf = (e: Entry) => e.id;

/** One category in one period: the total, how it compares, the last six periods, and the entries behind it. */
export default function InsightCategory() {
  const params = useLocalSearchParams<{ id: string; span?: string; offset?: string; income?: string }>();
  const { id } = params;
  const span = SPANS.find((s) => s === params.span) ?? 'month';
  const offset = Math.min(0, Number(params.offset) || 0);
  const income = params.income === '1';
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useData();
  const now = useNow();
  const { code, brief, briefDigits } = useMoney();
  const { deleter, question } = useDeleter();

  const p = useMemo(() => periodOf(span, offset, now, data.settings), [span, offset, now, data.settings]);
  const mine = useMemo(() => data.entries.filter((e) => e.categoryId === id && e.income === income), [data.entries, id, income]);
  const entries = useMemo(() => newestFirst(mine.filter((e) => e.date >= p.from && e.date < p.until)), [mine, p]);
  const sums = compared(mine, p, income);
  const share = categoryLines(data, data.entries, p, income).find((l) => l.category.id === id)?.share ?? 0;
  const category = categoryOf(data, id);
  const today = toDay(now);
  const row = useCallback(({ item }: { item: Entry }) => <EntryRow entry={item} deleter={deleter} today={today} />, [deleter, today]);

  return (
    <Page title={category ? `${category.emoji} ${category.name}` : 'Category'} scroll={false}>
      <FlatList
        data={entries}
        keyExtractor={keyOf}
        renderItem={row}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <>
            <Card hero style={styles.card}>
              <AppText variant="titleSmall" color={m3.onSurfaceVariant}>
                {income ? 'Earned' : 'Spent'} {phrase(p)}
                {share > 0 ? ` · ${Math.max(1, Math.round(share * 100))}% of the total` : ''}
              </AppText>
              <View style={styles.gap}>
                <BigAmount digits={briefDigits(sums.now)} currency={code} size={44} income={income && sums.now > 0} />
              </View>
              <View style={styles.comparison}>
                <Comparison {...sums} income={income} against={against(p)} />
              </View>
              <AppText variant="titleSmall" color={m3.onSurfaceVariant}>
                Last six {span}s
              </AppText>
              <ColumnChart bars={trend(data, id, p, income, now)} height={112} format={brief} />
            </Card>
            <Subheader text={countOf(entries.length, 'entry', 'entries')} />
          </>
        }
        ListEmptyComponent={
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant} style={styles.none}>
            No entries {phrase(p)}.
          </AppText>
        }
      />
      {question}
    </Page>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, padding: 20 },
  gap: { marginTop: 4 },
  comparison: { marginTop: 4, marginBottom: 16 },
  none: { paddingHorizontal: 16 },
});
