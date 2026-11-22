import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { CircleButton } from '../../components/Bits';
import { CapsuleProgress, Gauge } from '../../components/Charts';
import { ConfirmSheet, Popover, PopoverItem, useAnchor, anchorProps } from '../../components/Overlays';
import { budgetProgress, budgetSpent, mainBudgetSpent } from '../../lib/calc';
import { BUDGET_PERIOD_PHRASE, type Budget } from '../../lib/types';
import { currencySymbol, fmtSmart } from '../../lib/format';
import { Haptics } from '../../lib/haptics';
import { useStore } from '../../lib/store';
import { useTheme } from '../../theme/theme';

export default function BudgetScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const budgets = useStore((s) => s.budgets);
  const mainBudget = useStore((s) => s.mainBudget);
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const settings = useStore((s) => s.settings);
  const deleteBudget = useStore((s) => s.deleteBudget);
  const deleteMainBudget = useStore((s) => s.deleteMainBudget);
  const mainMenu = useAnchor();
  const [toDelete, setToDelete] = useState<{ kind: 'main' } | { kind: 'category'; budget: Budget } | null>(null);

  const sym = currencySymbol(settings.currency);
  const nothing = budgets.length === 0 && !mainBudget;

  return (
    <View style={{ flex: 1, backgroundColor: c.PrimaryBackground }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 25, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <AppText size={36} weight="bold">
            Budgets
          </AppText>
          <CircleButton size={34} onPress={() => router.push('/new-budget')} label="New budget">
            <Ionicons name="add" size={22} color={c.SubtitleText} />
          </CircleButton>
        </View>

        {nothing ? (
          <View style={{ alignItems: 'center', paddingTop: 90 }}>
            <AppText size={64}>🙈</AppText>
            <AppText size={24} weight="medium" style={{ marginTop: 14, opacity: 0.85 }}>
              No Budgets Found
            </AppText>
            <AppText size={19} weight="medium" color="SubtitleText" style={{ marginTop: 4 }}>
              Add your first budget today!
            </AppText>
          </View>
        ) : null}

        {mainBudget
          ? (() => {
              const spent = mainBudgetSpent(mainBudget, transactions);
              const p = budgetProgress(mainBudget, spent);
              return (
                <Pressable
                  onPress={() => router.push({ pathname: '/budget-detail', params: { id: 'main' } })}
                  onLongPress={() => {
                    Haptics.light();
                    mainMenu.open();
                  }}
                  style={{ alignItems: 'center', marginTop: 24 }}
                >
                  <View {...anchorProps(mainMenu)}>
                    <Gauge fraction={p.fraction} elapsed={p.elapsed} caption={`Overall ${p.over ? 'over' : 'spent'}: ${Math.round(p.fraction * 100)}%`} size={340} />
                    <View style={styles.gaugeCenter} pointerEvents="none">
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                        <AppText size={28} weight="medium" color="SubtitleText">
                          {sym}
                        </AppText>
                        <AppText size={64} weight="medium">
                          {fmtSmart(Math.abs(p.left), settings.showCents)}
                        </AppText>
                      </View>
                      <AppText size={22} weight="medium" color="SubtitleText">
                        {p.over ? 'over' : 'left'} {BUDGET_PERIOD_PHRASE[mainBudget.type]}
                      </AppText>
                    </View>
                    <View style={styles.gaugeEnds}>
                      <AppText size={17} weight="medium" color="SubtitleText">
                        {fmtSmart(spent, false)}
                      </AppText>
                      <AppText size={17} weight="medium" color="SubtitleText">
                        {fmtSmart(mainBudget.amount, false)}
                      </AppText>
                    </View>
                  </View>
                </Pressable>
              );
            })()
          : null}

        <Popover visible={mainMenu.visible} anchor={mainMenu.anchor} onClose={mainMenu.close} align="center" width={200}>
          <PopoverItem
            label="Edit"
            icon="pencil"
            onPress={() => {
              mainMenu.close();
              router.push({ pathname: '/new-budget', params: { id: 'main' } });
            }}
          />
          <PopoverItem
            label="Delete"
            icon="trash"
            destructive
            onPress={() => {
              mainMenu.close();
              setToDelete({ kind: 'main' });
            }}
          />
        </Popover>

        {budgets.length > 0 ? (
          <View style={styles.grid}>
            {budgets.map((b) => (
              <BudgetCard
                key={b.id}
                budget={b}
                spent={budgetSpent(b, transactions)}
                category={categories.find((x) => x.id === b.categoryId)}
                onDelete={() => setToDelete({ kind: 'category', budget: b })}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <ConfirmSheet
        visible={toDelete !== null}
        title={toDelete?.kind === 'main' ? 'Delete your overall budget?' : `Delete the '${categories.find((x) => x.id === (toDelete?.kind === 'category' ? toDelete.budget.categoryId : ''))?.name ?? ''}' budget?`}
        message="This action cannot be undone."
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete?.kind === 'main') deleteMainBudget();
          else if (toDelete?.kind === 'category') deleteBudget(toDelete.budget.id);
          Haptics.success();
          setToDelete(null);
        }}
      />
    </View>
  );
}

function BudgetCard({ budget, spent, category, onDelete }: { budget: Budget; spent: number; category?: { emoji: string; name: string; colour: string }; onDelete: () => void }) {
  const { c } = useTheme();
  const settings = useStore((s) => s.settings);
  const menu = useAnchor();
  const p = budgetProgress(budget, spent);
  const sym = currencySymbol(settings.currency);
  const percent = Math.round(p.fraction * 100);

  return (
    <View {...anchorProps(menu)} style={{ width: '48%' }}>
      <Pressable
        onPress={() => router.push({ pathname: '/budget-detail', params: { id: budget.id } })}
        onLongPress={() => {
          Haptics.light();
          menu.open();
        }}
        style={({ pressed }) => [styles.card, { backgroundColor: c.BudgetBackground }, pressed && { opacity: 0.7 }]}
      >
        <AppText size={22} weight="semibold" numberOfLines={1}>
          {category?.emoji ?? '❓'} {category?.name ?? 'Unknown'}
        </AppText>
        <AppText size={19} weight="medium" color="SubtitleText">
          {p.daysLeft} {p.daysLeft === 1 ? 'day' : 'days'} left
        </AppText>

        <View style={{ flex: 1, minHeight: 28 }} />
        <AppText size={18} weight="bold" color={p.over ? 'AlertRed' : 'IncomeGreen'} style={{ letterSpacing: 0.3 }}>
          {percent}% {p.over ? 'OVER' : 'SPENT'}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
          <AppText size={20} weight="medium" color="SubtitleText">
            {sym}
          </AppText>
          <AppText size={40} weight="medium" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {fmtSmart(Math.abs(p.left), settings.showCents)}
          </AppText>
        </View>
        <AppText size={19} weight="medium" color="SubtitleText" style={{ marginBottom: 4 }}>
          {p.over ? 'over' : 'left'} {BUDGET_PERIOD_PHRASE[budget.type]}
        </AppText>
        <CapsuleProgress fraction={p.fraction} elapsed={p.elapsed} colour={category?.colour ?? c.DarkIcon} />
      </Pressable>

      <Popover visible={menu.visible} anchor={menu.anchor} onClose={menu.close} align="center" width={180}>
        <PopoverItem
          label="Edit"
          icon="pencil"
          onPress={() => {
            menu.close();
            router.push({ pathname: '/new-budget', params: { id: budget.id } });
          }}
        />
        <PopoverItem
          label="Delete"
          icon="trash"
          destructive
          onPress={() => {
            menu.close();
            onDelete();
          }}
        />
      </Popover>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gaugeCenter: { position: 'absolute', left: 0, right: 0, top: 112, alignItems: 'center' },
  gaugeEnds: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 40, marginTop: -2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16, marginTop: 28 },
  card: { borderRadius: 22, padding: 16, minHeight: 246 },
});
