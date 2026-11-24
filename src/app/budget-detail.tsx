import { goBack } from '../lib/nav';
import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { CapsuleProgress } from '../components/Charts';
import { useDeleteFlow } from '../components/DeleteFlow';
import { Card, IconButton, Subheader, TopAppBar } from '../components/material';
import { TransactionRow } from '../components/TransactionRow';
import { budgetProgress, budgetSpent, budgetTransactions, mainBudgetSpent } from '../lib/calc';
import { BUDGET_LABELS, BUDGET_PERIOD_PHRASE } from '../lib/types';
import { currencySymbol, fmtFull, fmtSmart } from '../lib/format';
import { useStore } from '../lib/store';
import { shape } from '../theme/material';
import { useTheme } from '../theme/theme';

/** One budget in detail: progress, what's left per day, and the spending that counts toward it. */
export default function BudgetDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useStore((s) => s.settings);
  const transactions = useStore((s) => s.transactions);
  const mainBudget = useStore((s) => s.mainBudget);
  const budget = useStore((s) => s.budgets.find((b) => b.id === id));
  const category = useStore((s) => s.categories.find((x) => x.id === budget?.categoryId));
  const { ask, remove, element: deleteSheet } = useDeleteFlow();

  const isMain = id === 'main';
  const source = isMain ? mainBudget : budget;
  const sym = currencySymbol(settings.currency);

  if (!source) {
    return (
      <View style={[styles.fill, { backgroundColor: m3.surface }]}>
        <TopAppBar title="Budget" onBack={() => goBack()} />
      </View>
    );
  }

  const spent = isMain ? mainBudgetSpent(mainBudget!, transactions) : budgetSpent(budget!, transactions);
  const p = budgetProgress(source, spent);
  const list = budgetTransactions({ startDate: source.startDate, type: source.type, categoryId: isMain ? undefined : budget!.categoryId }, transactions);
  const perDay = p.daysLeft > 0 ? p.left / p.daysLeft : p.left;
  const colour = isMain ? m3.primary : (category?.colour ?? m3.primary);

  const header = (
    <View style={{ paddingBottom: 8 }}>
      <AppText variant="bodyMedium" color={m3.onSurfaceVariant} style={{ marginHorizontal: 16, marginBottom: 12 }}>
        {BUDGET_LABELS[source.type]} · {p.daysLeft} {p.daysLeft === 1 ? 'day' : 'days'} left
      </AppText>

      {/* Tonal summary card: the amount left, a linear progress indicator, spent vs budget */}
      <Card hero style={styles.summary}>
        <View style={[styles.status, { backgroundColor: p.over ? m3.errorContainer : m3.successContainer }]}>
          <AppText variant="labelMedium" color={p.over ? m3.error : m3.success}>
            {Math.round(p.fraction * 100)}% spent
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 12 }}>
          <AppText variant="titleLarge" color={m3.onSurfaceVariant}>
            {sym}
          </AppText>
          <AppText variant="displayMedium" color={p.over ? m3.error : m3.onSurface} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {fmtSmart(Math.abs(p.left), settings.showCents)}
          </AppText>
        </View>
        <AppText variant="bodyLarge" color={m3.onSurfaceVariant} style={{ marginBottom: 12 }}>
          {p.over ? 'over' : 'left'} {BUDGET_PERIOD_PHRASE[source.type]}
        </AppText>
        <CapsuleProgress fraction={p.fraction} elapsed={p.elapsed} colour={p.over ? m3.error : colour} height={12} />
        <View style={styles.foot}>
          <AppText variant="labelMedium" color={m3.onSurfaceVariant}>
            {sym}
            {fmtFull(spent)} spent
          </AppText>
          <AppText variant="labelMedium" color={m3.onSurfaceVariant}>
            of {sym}
            {fmtFull(source.amount)}
          </AppText>
        </View>
      </Card>

      {!p.over && p.daysLeft > 0 ? (
        <Card style={styles.stat}>
          <AppText variant="bodyLarge" color={m3.onSurfaceVariant}>
            Left each day
          </AppText>
          <AppText variant="titleLarge" color={m3.onSurface}>
            {sym}
            {fmtSmart(Math.max(perDay, 0), settings.showCents)}
          </AppText>
        </Card>
      ) : null}

      <Subheader text="Entries" />
      {list.length === 0 ? (
        <AppText variant="bodyLarge" color={m3.onSurfaceVariant} style={{ marginHorizontal: 16, marginTop: 4 }}>
          Nothing spent yet.
        </AppText>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.fill, { backgroundColor: m3.surface }]}>
      <TopAppBar title={isMain ? 'Overall budget' : `${category?.emoji ?? ''} ${category?.name ?? ''}`} onBack={() => goBack()} actions={<IconButton icon="create-outline" onPress={() => router.push({ pathname: '/new-budget', params: { id } })} label="Edit budget" tint={m3.onSurface} />} />
        <FlatList
          data={list}
          keyExtractor={(t) => t.id}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => <TransactionRow transaction={item} onDelete={ask} onQuickDelete={remove} />}
        />
      {deleteSheet}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  summary: { marginHorizontal: 16, padding: 20 },
  status: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: shape.extraSmall },
  foot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  stat: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 12, padding: 16 },
});
