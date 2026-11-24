import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFabScroll } from '../../lib/useFabScroll';
import { Icon } from '../../components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { CapsuleProgress } from '../../components/Charts';
import { Button, Card, EmojiAvatar, IconButton, TopAppBar } from '../../components/material';
import { ConfirmSheet, Popover, PopoverItem, useAnchor, anchorProps } from '../../components/Overlays';
import { budgetProgress, budgetSpent, mainBudgetSpent } from '../../lib/calc';
import { BUDGET_PERIOD_PHRASE, type Budget } from '../../lib/types';
import { currencySymbol, fmtFull, fmtSmart } from '../../lib/format';
import { Haptics } from '../../lib/haptics';
import { useStore } from '../../lib/store';
import { shape } from '../../theme/material';
import { useTheme } from '../../theme/theme';

export default function BudgetScreen() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const fabScroll = useFabScroll();
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
    <View style={{ flex: 1, backgroundColor: m3.surface }}>
      <ScrollView {...fabScroll} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        <TopAppBar title="Budgets" inset={false} actions={<IconButton icon="add" onPress={() => router.push('/new-budget')} label="New budget" tint={m3.onSurface} />} />

        {nothing ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: m3.surfaceContainerHigh }]}>
              <Icon name="wallet-outline" size={44} color={m3.onSurfaceVariant} />
            </View>
            <AppText variant="headlineSmall" color={m3.onSurface} style={{ marginTop: 24 }}>
              No budgets yet
            </AppText>
            <AppText variant="bodyLarge" color={m3.onSurfaceVariant} style={{ marginTop: 8, textAlign: 'center' }}>
              Set an overall budget, or one per category, and watch your pace.
            </AppText>
            <Button variant="tonal" icon="add" label="New budget" onPress={() => router.push('/new-budget')} style={{ marginTop: 24 }} />
          </View>
        ) : null}

        {mainBudget
          ? (() => {
              const spent = mainBudgetSpent(mainBudget, transactions);
              const p = budgetProgress(mainBudget, spent);
              return (
                // The overall budget: a tonal card with the amount left and a linear progress indicator.
                <Card
                  hero
                  hasActions
                  onPress={() => router.push({ pathname: '/budget-detail', params: { id: 'main' } })}
                  onLongPress={() => {
                    Haptics.light();
                    mainMenu.open();
                  }}
                  style={styles.overall}
                >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <AppText variant="titleMedium" color={m3.onSurfaceVariant}>
                          Overall budget
                        </AppText>
                        <View {...anchorProps(mainMenu)}>
                          <IconButton icon="ellipsis-vertical" onPress={mainMenu.open} label="More options" />
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                        <AppText variant="titleLarge" color={m3.onSurfaceVariant}>
                          {sym}
                        </AppText>
                        <AppText variant="displayMedium" color={p.over ? m3.error : m3.onSurface} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                          {fmtSmart(Math.abs(p.left), settings.showCents)}
                        </AppText>
                      </View>
                      <AppText variant="bodyLarge" color={m3.onSurfaceVariant} style={{ marginBottom: 12 }}>
                        {p.over ? 'over' : 'left'} {BUDGET_PERIOD_PHRASE[mainBudget.type]} · {p.daysLeft} {p.daysLeft === 1 ? 'day' : 'days'} left
                      </AppText>
                      <CapsuleProgress fraction={p.fraction} elapsed={p.elapsed} colour={p.over ? m3.error : m3.primary} height={12} />
                      <View style={styles.overallFoot}>
                        <AppText variant="labelMedium" color={m3.onSurfaceVariant}>
                          {sym}
                          {fmtFull(spent)} spent
                        </AppText>
                        <AppText variant="labelMedium" color={p.over ? m3.error : m3.onSurfaceVariant}>
                          {Math.round(p.fraction * 100)}% of {sym}
                          {fmtFull(mainBudget.amount)}
                        </AppText>
                      </View>
                </Card>
              );
            })()
          : null}

        <Popover visible={mainMenu.visible} anchor={mainMenu.anchor} onClose={mainMenu.close} align="right" width={200}>
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
                // The overall card already says how long is left; a category card only repeats it when its period differs.
                showDays={!mainBudget || budgetProgress(b, 0).daysLeft !== budgetProgress(mainBudget, 0).daysLeft}
                onDelete={() => setToDelete({ kind: 'category', budget: b })}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <ConfirmSheet
        visible={toDelete !== null}
        title={toDelete?.kind === 'main' ? 'Delete your overall budget?' : `Delete the “${categories.find((x) => x.id === (toDelete?.kind === 'category' ? toDelete.budget.categoryId : ''))?.name ?? ''}” budget?`}
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

/** An M3 filled card per category budget: avatar and name, amount left, a status chip and a progress indicator. */
function BudgetCard({ budget, spent, category, showDays, onDelete }: { budget: Budget; spent: number; category?: { emoji: string; name: string; colour: string }; showDays: boolean; onDelete: () => void }) {
  const { m3 } = useTheme();
  const settings = useStore((s) => s.settings);
  const menu = useAnchor();
  const p = budgetProgress(budget, spent);
  const sym = currencySymbol(settings.currency);
  const percent = Math.round(p.fraction * 100);
  const tint = category?.colour ?? m3.primary;
  const status = p.over
    ? { label: 'Over budget', bg: m3.errorContainer, fg: m3.error }
    : p.fraction > p.elapsed + 0.1
      ? { label: 'Spending fast', bg: m3.warningContainer, fg: m3.warning }
      : { label: 'On track', bg: m3.successContainer, fg: m3.success };

  return (
    <View {...anchorProps(menu)} style={{ width: '48.5%' }}>
      <Card
        onPress={() => router.push({ pathname: '/budget-detail', params: { id: budget.id } })}
        onLongPress={() => {
          Haptics.light();
          menu.open();
        }}
        style={styles.card}
      >
            <View style={styles.cardHead}>
              <EmojiAvatar emoji={category?.emoji ?? '❓'} colour={tint} size={32} />
              <View style={{ flex: 1 }}>
                <AppText variant="titleMedium" color={m3.onSurface} numberOfLines={1}>
                  {category?.name ?? 'Unknown'}
                </AppText>
                {showDays ? (
                  <AppText variant="bodySmall" color={m3.onSurfaceVariant}>
                    {p.daysLeft} {p.daysLeft === 1 ? 'day' : 'days'} left
                  </AppText>
                ) : null}
              </View>
            </View>

            <View style={{ flex: 1, minHeight: 16 }} />
            {/* Status by pace, not just by how much is spent: over budget, spending ahead of the calendar, or on track. */}
            <View style={[styles.status, { backgroundColor: status.bg }]}>
              <AppText variant="labelSmall" color={status.fg}>
                {percent}% · {status.label}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 8 }}>
              <AppText variant="titleMedium" color={m3.onSurfaceVariant}>
                {sym}
              </AppText>
              <AppText variant="headlineMedium" color={m3.onSurface} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {fmtSmart(Math.abs(p.left), settings.showCents)}
              </AppText>
            </View>
            <AppText variant="bodySmall" color={m3.onSurfaceVariant} style={{ marginBottom: 8 }}>
              {p.over ? 'over' : 'left'} {BUDGET_PERIOD_PHRASE[budget.type]}
            </AppText>
            <CapsuleProgress fraction={p.fraction} elapsed={p.elapsed} colour={p.over ? m3.error : tint} height={8} />
      </Card>

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
  empty: { alignItems: 'center', paddingTop: 72, paddingHorizontal: 32 },
  emptyIcon: { width: 96, height: 96, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
  overall: { marginHorizontal: 16, marginTop: 8, padding: 20, paddingTop: 12 },
  overallFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginTop: 16, paddingHorizontal: 16 },
  card: { padding: 16, minHeight: 210 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  status: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: shape.extraSmall },
});
