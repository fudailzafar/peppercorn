import { goBack } from '../lib/nav';
import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '../components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { CircleButton } from '../components/Bits';
import { CapsuleProgress } from '../components/Charts';
import { useDeleteFlow } from '../components/DeleteFlow';
import { TransactionRow } from '../components/TransactionRow';
import { budgetProgress, budgetSpent, budgetTransactions, mainBudgetSpent } from '../lib/calc';
import { BUDGET_LABELS, BUDGET_PERIOD_PHRASE } from '../lib/types';
import { currencySymbol, fmtFull, fmtSmart } from '../lib/format';
import { useStore } from '../lib/store';
import { useTheme } from '../theme/theme';

/** One budget in detail: progress, what's left per day, and the spending that counts toward it. */
export default function BudgetDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
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
      <View style={[styles.fill, { backgroundColor: c.PrimaryBackground, paddingTop: insets.top + 12, paddingHorizontal: 20 }]}>
        <CircleButton onPress={() => goBack()} label="Back">
          <Icon name="chevron-back" size={22} color={c.DarkIcon} />
        </CircleButton>
      </View>
    );
  }

  const spent = isMain ? mainBudgetSpent(mainBudget!, transactions) : budgetSpent(budget!, transactions);
  const p = budgetProgress(source, spent);
  const list = budgetTransactions({ startDate: source.startDate, type: source.type, categoryId: isMain ? undefined : budget!.categoryId }, transactions);
  const perDay = p.daysLeft > 0 ? p.left / p.daysLeft : p.left;
  const colour = isMain ? c.DarkIcon : (category?.colour ?? c.DarkIcon);

  const header = (
    <View style={{ paddingBottom: 12 }}>
      <AppText size={34} weight="bold">
        {isMain ? 'Overall Budget' : `${category?.emoji ?? ''} ${category?.name ?? ''}`}
      </AppText>
      <AppText size={19} weight="medium" color="SubtitleText">
        {BUDGET_LABELS[source.type]} · {p.daysLeft} {p.daysLeft === 1 ? 'day' : 'days'} left
      </AppText>

      <View style={{ marginTop: 28 }}>
        <AppText size={18} weight="bold" color={p.over ? 'AlertRed' : 'IncomeGreen'} style={{ letterSpacing: 0.3 }}>
          {Math.round(p.fraction * 100)}% {p.over ? 'OVER' : 'SPENT'}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
          <AppText size={26} weight="medium" color="SubtitleText">
            {sym}
          </AppText>
          <AppText size={64} weight="medium">
            {fmtSmart(Math.abs(p.left), settings.showCents)}
          </AppText>
        </View>
        <AppText size={22} weight="medium" color="SubtitleText" style={{ marginBottom: 10 }}>
          {p.over ? 'over' : 'left'} {BUDGET_PERIOD_PHRASE[source.type]}
        </AppText>
        <CapsuleProgress fraction={p.fraction} elapsed={p.elapsed} colour={colour} height={12} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <AppText size={17} weight="semibold" color="SubtitleText">
            {sym}
            {fmtFull(spent)}
          </AppText>
          <AppText size={17} weight="semibold" color="SubtitleText">
            {sym}
            {fmtFull(source.amount)}
          </AppText>
        </View>
      </View>

      {!p.over && p.daysLeft > 0 ? (
        <View style={[styles.stat, { backgroundColor: c.SecondaryBackground }]}>
          <AppText size={19} weight="medium" color="SubtitleText">
            left each day
          </AppText>
          <AppText size={22} weight="semibold">
            {sym}
            {fmtSmart(Math.max(perDay, 0), settings.showCents)}
          </AppText>
        </View>
      ) : null}

      <AppText size={22} weight="semibold" color="SubtitleText" style={{ marginTop: 28, marginBottom: 6 }}>
        Transactions
      </AppText>
      {list.length === 0 ? (
        <AppText size={18} weight="medium" color="SubtitleText" style={{ marginTop: 8 }}>
          Nothing spent yet.
        </AppText>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.fill, { backgroundColor: c.PrimaryBackground }]}>
      <View style={[styles.bar, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => goBack()} style={[styles.back, { backgroundColor: c.SecondaryBackground }]} accessibilityLabel="Back">
          <Icon name="chevron-back" size={20} color={c.DarkIcon} />
          <AppText size={18} weight="semibold">
            Back
          </AppText>
        </Pressable>
        <CircleButton onPress={() => router.push({ pathname: '/new-budget', params: { id } })} label="Edit budget">
          <Icon name="pencil" size={18} color={c.DarkIcon} />
        </CircleButton>
      </View>
      <FlatList
        data={list}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: 25, paddingBottom: insets.bottom + 24 }}
        renderItem={({ item }) => <TransactionRow transaction={item} onDelete={ask} onQuickDelete={remove} />}
      />
      {deleteSheet}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 8, paddingLeft: 8, paddingRight: 14, borderRadius: 100 },
  stat: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, marginTop: 20 },
});
