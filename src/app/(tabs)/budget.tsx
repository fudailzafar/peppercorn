import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { BudgetHero, PaceLabel, usePace } from '../../components/BudgetBits';
import { Icon } from '../../components/Icon';
import { Button, Card, IconAvatar, IconButton, LinearProgress, ListItem, StateLayer, Subheader, TopAppBar, EmojiAvatar } from '../../components/material';
import { anchorProps, ConfirmSheet, Popover, PopoverItem, useAnchor } from '../../components/Overlays';
import { budgetPace, budgetProgress, budgetSpent, mainBudgetSpent, type BudgetProgress } from '../../lib/calc';
import { currencySymbol, fmtSmart } from '../../lib/format';
import { Haptics } from '../../lib/haptics';
import { useStore } from '../../lib/store';
import { BUDGET_LABELS, BUDGET_PERIOD_PHRASE, type Budget, type Category } from '../../lib/types';
import { useFabScroll } from '../../lib/useFabScroll';
import { shape } from '../../theme/material';
import { useTheme } from '../../theme/theme';

const URGENCY = { over: 0, fast: 1, ok: 2 } as const;

/** The overall budget as a ring, then each category, the ones that need attention first. */
export default function BudgetScreen() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const fabScroll = useFabScroll();
  const budgets = useStore((s) => s.budgets);
  const mainBudget = useStore((s) => s.mainBudget);
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const deleteBudget = useStore((s) => s.deleteBudget);
  const deleteMainBudget = useStore((s) => s.deleteMainBudget);
  const mainMenu = useAnchor();
  const [toDelete, setToDelete] = useState<{ kind: 'main' } | { kind: 'category'; budget: Budget } | null>(null);

  const add = () => router.push('/new-budget');
  const rows = budgets
    .map((budget) => ({ budget, p: budgetProgress(budget, budgetSpent(budget, transactions)), category: categories.find((c) => c.id === budget.categoryId) }))
    .sort((a, b) => URGENCY[budgetPace(a.p)] - URGENCY[budgetPace(b.p)] || b.p.fraction - a.p.fraction);
  const nameOf = (b: Budget) => categories.find((c) => c.id === b.categoryId)?.name ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: m3.surface }}>
      <ScrollView {...fabScroll} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        <TopAppBar title="Budgets" inset={false} actions={<IconButton icon="add" onPress={add} label="New budget" tint={m3.onSurface} />} />

        {!mainBudget && rows.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: m3.secondaryContainer }]}>
              <Icon name="wallet-outline" size={44} color={m3.onSecondaryContainer} />
            </View>
            <AppText variant="headlineSmall" style={{ marginTop: 24 }}>
              No budgets yet
            </AppText>
            <AppText variant="bodyLarge" color={m3.onSurfaceVariant} style={{ marginTop: 8, textAlign: 'center' }}>
              Set one for everything, or one per category, and see what you can spend each day.
            </AppText>
            <Button icon="add" label="New budget" onPress={add} style={{ marginTop: 24 }} />
          </View>
        ) : null}

        {mainBudget ? (
          <BudgetHero
            title={`${BUDGET_LABELS[mainBudget.type]} budget`}
            p={budgetProgress(mainBudget, mainBudgetSpent(mainBudget, transactions))}
            type={mainBudget.type}
            onPress={() => router.push({ pathname: '/budget-detail', params: { id: 'main' } })}
            action={
              <View {...anchorProps(mainMenu)} style={{ marginRight: -8 }}>
                <IconButton icon="ellipsis-vertical" onPress={mainMenu.open} label="Budget options" />
              </View>
            }
          />
        ) : rows.length > 0 ? (
          <Card onPress={() => router.push({ pathname: '/new-budget', params: { kind: 'overall' } })} style={{ marginHorizontal: 16 }}>
            <ListItem leading={<IconAvatar icon="wallet" />} headline="Set an overall budget" supporting="One limit for all your spending" chevron />
          </Card>
        ) : null}

        {rows.length > 0 ? (
          <>
            <Subheader text="Categories" />
            <View style={styles.list}>
              {rows.map(({ budget, p, category }, i) => (
                <BudgetRow key={budget.id} budget={budget} p={p} category={category} first={i === 0} last={i === rows.length - 1} onDelete={() => setToDelete({ kind: 'category', budget })} />
              ))}
            </View>
          </>
        ) : null}

        {mainBudget || rows.length > 0 ? (
          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <Button variant="tonal" icon="add" label="Add a category budget" onPress={() => router.push({ pathname: '/new-budget', params: { kind: 'category' } })} />
          </View>
        ) : null}
      </ScrollView>

      <BudgetMenu
        menu={mainMenu}
        onEdit={() => router.push({ pathname: '/new-budget', params: { id: 'main' } })}
        onDelete={() => setToDelete({ kind: 'main' })}
      />
      <ConfirmSheet
        visible={toDelete !== null}
        title={toDelete?.kind === 'category' ? `Delete the “${nameOf(toDelete.budget)}” budget?` : 'Delete your overall budget?'}
        message="Your entries are kept. You can’t undo this."
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

/** One category budget: who, how much is left, and a progress line in its status colour. Rows join into one group. */
function BudgetRow({ budget, p, category, first, last, onDelete }: { budget: Budget; p: BudgetProgress; category?: Category; first: boolean; last: boolean; onDelete: () => void }) {
  const { m3 } = useTheme();
  const settings = useStore((s) => s.settings);
  const pace = usePace(p);
  const menu = useAnchor();
  const symbol = currencySymbol(settings.currency);
  const money = (n: number) => `${symbol}${fmtSmart(Math.abs(n), settings.showCents)}`;
  const top = first ? shape.large : shape.extraSmall;
  const bottom = last ? shape.large : shape.extraSmall;
  const name = category?.name ?? 'Unknown';

  return (
    <View style={[styles.row, { backgroundColor: m3.surfaceContainer, borderTopLeftRadius: top, borderTopRightRadius: top, borderBottomLeftRadius: bottom, borderBottomRightRadius: bottom }]}>
      <Pressable
        onPress={() => router.push({ pathname: '/budget-detail', params: { id: budget.id } })}
        onLongPress={() => {
          Haptics.light();
          menu.open();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${name}: ${money(p.left)} ${p.over ? 'over' : 'left'}, ${pace.label}`}
        android_ripple={{ color: `${m3.onSurface}1F` }}
        style={styles.rowMain}
      >
        {({ pressed }) => (
          <>
            <StateLayer pressed={pressed} color={m3.onSurface} />
            <EmojiAvatar emoji={category?.emoji ?? '❓'} colour={category?.colour ?? m3.outline} />
            <View style={{ flex: 1, gap: 8 }}>
              <View>
                <View style={{ minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AppText variant="titleMedium" numberOfLines={1} style={{ flex: 1 }}>
                    {name}
                  </AppText>
                  {budgetPace(p) === 'ok' ? (
                    <AppText variant="labelLarge" color={m3.onSurfaceVariant}>
                      {Math.round(p.fraction * 100)}%
                    </AppText>
                  ) : (
                    <PaceLabel p={p} />
                  )}
                </View>
                <AppText variant="bodyMedium" color={m3.onSurfaceVariant} numberOfLines={1}>
                  {money(p.left)} {p.over ? 'over' : 'left of'} {money(p.amount)}
                  {budget.type === 3 ? '' : ` ${BUDGET_PERIOD_PHRASE[budget.type]}`}
                </AppText>
              </View>
              <LinearProgress fraction={p.fraction} color={pace.color} />
            </View>
          </>
        )}
      </Pressable>
      <View {...anchorProps(menu)}>
        <IconButton icon="ellipsis-vertical" onPress={menu.open} label={`${name} budget options`} />
      </View>
      <BudgetMenu menu={menu} onEdit={() => router.push({ pathname: '/new-budget', params: { id: budget.id } })} onDelete={onDelete} />
    </View>
  );
}

function BudgetMenu({ menu, onEdit, onDelete }: { menu: ReturnType<typeof useAnchor>; onEdit: () => void; onDelete: () => void }) {
  const run = (then: () => void) => () => {
    menu.close();
    then();
  };
  return (
    <Popover visible={menu.visible} anchor={menu.anchor} onClose={menu.close} align="right" width={180}>
      <PopoverItem label="Edit" icon="pencil" onPress={run(onEdit)} />
      <PopoverItem label="Delete" icon="trash" destructive onPress={run(onDelete)} />
    </Popover>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingTop: 72, paddingHorizontal: 32 },
  emptyIcon: { width: 96, height: 96, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
  list: { marginHorizontal: 16, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16, paddingLeft: 16, paddingVertical: 16 },
});
