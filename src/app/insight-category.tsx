import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BigAmount } from '../components/Bits';
import { AppText } from '../components/AppText';
import { ColumnChart } from '../components/Charts';
import { useDeleteFlow } from '../components/DeleteFlow';
import { Comparison, useMoney } from '../components/InsightBits';
import { Card, Subheader, TopAppBar } from '../components/material';
import { TransactionRow } from '../components/TransactionRow';
import type { InsightsType } from '../lib/calc';
import { fmtSmart } from '../lib/format';
import { categoryLines, period, periodPhrase, trend, UNIT } from '../lib/insights';
import { goBack } from '../lib/nav';
import { useStore } from '../lib/store';
import { useNow } from '../lib/useNow';
import { useTheme } from '../theme/theme';

/** One category in one period: the total, how it compares, the last six periods, and the entries behind it. */
export default function InsightCategory() {
  const params = useLocalSearchParams<{ id: string; type?: string; offset?: string; income?: string }>();
  const type = (['1', '2', '3'].includes(params.type ?? '') ? Number(params.type) : 2) as InsightsType;
  const offset = Math.min(0, Number(params.offset) || 0);
  const income = params.income === '1';
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const money = useMoney();
  const settings = useStore((s) => s.settings);
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const category = categories.find((c) => c.id === params.id);
  const nowMs = useNow();
  const now = useMemo(() => new Date(nowMs), [nowMs]);
  const { ask, remove, element } = useDeleteFlow();

  const p = period(type, offset, settings, now);
  const mine = transactions.filter((t) => t.categoryId === params.id && t.income === income);
  const entries = mine.filter((t) => t.date >= p.start.getTime() && t.date < p.until).sort((a, b) => b.date - a.date);
  const amount = entries.reduce((n, t) => n + t.amount, 0);
  const before = mine.filter((t) => t.date >= p.before.start && t.date < p.before.until).reduce((n, t) => n + t.amount, 0);
  const share = categoryLines(transactions, categories, p, income).find((l) => l.category.id === params.id)?.share ?? 0;
  const history = trend(transactions, params.id, type, offset, income, settings, now);

  return (
    <View style={{ flex: 1, backgroundColor: m3.surface }}>
      <TopAppBar title={category ? `${category.emoji} ${category.name}` : 'Category'} onBack={() => goBack()} />
      <FlatList
        data={entries}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        renderItem={({ item }) => <TransactionRow showDate transaction={item} onDelete={ask} onQuickDelete={remove} />}
        ListHeaderComponent={
          <>
            <Card hero style={{ marginHorizontal: 16, padding: 20 }}>
              <AppText variant="titleSmall" color={m3.onSurfaceVariant}>
                {income ? 'Earned' : 'Spent'} {periodPhrase(type, offset, p.start)}
                {share > 0 ? ` · ${Math.max(Math.round(share * 100), 1)}% of the total` : ''}
              </AppText>
              <View style={{ marginTop: 4 }}>
                <BigAmount value={fmtSmart(amount, settings.showCents)} currency={settings.currency} size={44} align="flex-start" income={income && amount > 0} />
              </View>
              <View style={{ marginTop: 4, marginBottom: 16 }}>
                <Comparison now={amount} before={before} income={income} against={offset === 0 ? `this time last ${UNIT[type]}` : `the ${UNIT[type]} before`} />
              </View>
              <AppText variant="titleSmall" color={m3.onSurfaceVariant}>
                Last six {UNIT[type]}s
              </AppText>
              <ColumnChart columns={history} height={112} format={money} replayKey={params.id} />
            </Card>
            <Subheader text={entries.length === 1 ? '1 entry' : `${entries.length} entries`} />
          </>
        }
        ListEmptyComponent={
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant} style={{ paddingHorizontal: 16 }}>
            No entries {periodPhrase(type, offset, p.start)}.
          </AppText>
        }
      />
      {element}
    </View>
  );
}
