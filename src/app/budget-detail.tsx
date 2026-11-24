import { goBack } from '../lib/nav';
import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { BudgetHero } from '../components/BudgetBits';
import { useDeleteFlow } from '../components/DeleteFlow';
import { IconButton, Subheader, TopAppBar } from '../components/material';
import { TransactionRow } from '../components/TransactionRow';
import { budgetProgress, budgetSpent, budgetTransactions, mainBudgetSpent } from '../lib/calc';
import { BUDGET_LABELS } from '../lib/types';
import { useStore } from '../lib/store';
import { useTheme } from '../theme/theme';

/** One budget in detail: progress, what's left per day, and the spending that counts toward it. */
export default function BudgetDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const transactions = useStore((s) => s.transactions);
  const mainBudget = useStore((s) => s.mainBudget);
  const budget = useStore((s) => s.budgets.find((b) => b.id === id));
  const category = useStore((s) => s.categories.find((x) => x.id === budget?.categoryId));
  const { ask, remove, element: deleteSheet } = useDeleteFlow();

  const isMain = id === 'main';
  const source = isMain ? mainBudget : budget;

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

  const header = (
    <View style={{ paddingBottom: 8 }}>
      <BudgetHero title={`${BUDGET_LABELS[source.type]} budget`} p={p} type={source.type} />
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
          renderItem={({ item }) => <TransactionRow showDate transaction={item} onDelete={ask} onQuickDelete={remove} />}
        />
      {deleteSheet}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
