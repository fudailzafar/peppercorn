import { goBack } from '../lib/nav';
import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { CapsuleProgress } from '../components/Charts';
import { useDeleteFlow } from '../components/DeleteFlow';
import { IconButton } from '../components/m3';
import { TransactionRow } from '../components/TransactionRow';
import { budgetProgress, budgetSpent, budgetTransactions, mainBudgetSpent } from '../lib/calc';
import { BUDGET_LABELS, BUDGET_PERIOD_PHRASE } from '../lib/types';
import { currencySymbol, fmtFull, fmtSmart } from '../lib/format';
import { useStore } from '../lib/store';
import { shape, typeScale } from '../theme/material';
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
      <View style={[styles.fill, { backgroundColor: m3.surface, paddingTop: insets.top }]}>
        <View style={styles.bar}>
          <IconButton icon="arrow-back" onPress={() => goBack()} label="Back" tint={m3.onSurface} />
        </View>
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
      <AppText size={typeScale.bodyMedium.size} color={m3.onSurfaceVariant} style={{ marginHorizontal: 16, marginBottom: 12 }}>
        {BUDGET_LABELS[source.type]} · {p.daysLeft} {p.daysLeft === 1 ? 'day' : 'days'} left
      </AppText>

      {/* Tonal summary card: the amount left, a linear progress indicator, spent vs budget */}
      <View style={[styles.summary, { backgroundColor: m3.surfaceContainerLow, borderColor: m3.outlineVariant }]}>
        <View style={[styles.status, { backgroundColor: p.over ? m3.errorContainer : m3.successContainer }]}>
          <AppText size={typeScale.labelMedium.size} weight="semibold" color={p.over ? m3.error : m3.success} style={{ letterSpacing: 0.5 }}>
            {Math.round(p.fraction * 100)}% {p.over ? 'OVER' : 'SPENT'}
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 12 }}>
          <AppText size={typeScale.titleLarge.size} color={m3.onSurfaceVariant}>
            {sym}
          </AppText>
          <AppText size={typeScale.displayMedium.size} color={p.over ? m3.error : m3.onSurface} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {fmtSmart(Math.abs(p.left), settings.showCents)}
          </AppText>
        </View>
        <AppText size={typeScale.bodyLarge.size} color={m3.onSurfaceVariant} style={{ marginBottom: 12 }}>
          {p.over ? 'over' : 'left'} {BUDGET_PERIOD_PHRASE[source.type]}
        </AppText>
        <CapsuleProgress fraction={p.fraction} elapsed={p.elapsed} colour={p.over ? m3.error : colour} height={12} />
        <View style={styles.foot}>
          <AppText size={typeScale.labelMedium.size} weight="semibold" color={m3.onSurfaceVariant}>
            {sym}
            {fmtFull(spent)} spent
          </AppText>
          <AppText size={typeScale.labelMedium.size} weight="semibold" color={m3.onSurfaceVariant}>
            of {sym}
            {fmtFull(source.amount)}
          </AppText>
        </View>
      </View>

      {!p.over && p.daysLeft > 0 ? (
        <View style={[styles.stat, { backgroundColor: m3.surfaceContainerHigh }]}>
          <AppText size={typeScale.bodyLarge.size} color={m3.onSurfaceVariant}>
            Left each day
          </AppText>
          <AppText size={typeScale.titleLarge.size} color={m3.onSurface}>
            {sym}
            {fmtSmart(Math.max(perDay, 0), settings.showCents)}
          </AppText>
        </View>
      ) : null}

      <AppText size={typeScale.labelLarge.size} weight="semibold" color={m3.onSurfaceVariant} style={styles.subheader}>
        Transactions
      </AppText>
      {list.length === 0 ? (
        <AppText size={typeScale.bodyLarge.size} color={m3.onSurfaceVariant} style={{ marginHorizontal: 16, marginTop: 4 }}>
          Nothing spent yet.
        </AppText>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.fill, { backgroundColor: m3.surface }]}>
      {/* M3 small top app bar: back, title, edit */}
      <View style={[styles.bar, { paddingTop: insets.top }]}>
        <IconButton icon="arrow-back" onPress={() => goBack()} label="Back" tint={m3.onSurface} />
        <AppText size={typeScale.titleLarge.size} color={m3.onSurface} numberOfLines={1} style={{ flex: 1, marginLeft: 8 }}>
          {isMain ? 'Overall budget' : `${category?.emoji ?? ''} ${category?.name ?? ''}`}
        </AppText>
        <IconButton icon="create-outline" onPress={() => router.push({ pathname: '/new-budget', params: { id } })} label="Edit budget" tint={m3.onSurface} />
      </View>
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
  bar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  summary: { marginHorizontal: 16, padding: 20, borderRadius: shape.extraLarge, borderWidth: 1 },
  status: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: shape.extraSmall },
  foot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  stat: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: shape.large },
  subheader: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8, letterSpacing: 0.1 },
});
