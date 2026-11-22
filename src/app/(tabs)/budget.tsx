import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { CapsuleProgress } from '../../components/Charts';
import { Chip, IconButton, StateLayer } from '../../components/m3';
import { ConfirmSheet, Popover, PopoverItem, useAnchor, anchorProps } from '../../components/Overlays';
import { budgetProgress, budgetSpent, mainBudgetSpent } from '../../lib/calc';
import { BUDGET_PERIOD_PHRASE, type Budget } from '../../lib/types';
import { currencySymbol, fmtFull, fmtSmart } from '../../lib/format';
import { Haptics } from '../../lib/haptics';
import { useStore } from '../../lib/store';
import { shape, typeScale } from '../../theme/material';
import { useTheme, withAlpha } from '../../theme/theme';

export default function BudgetScreen() {
  const { m3 } = useTheme();
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
    <View style={{ flex: 1, backgroundColor: m3.surface }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        {/* M3 small top app bar with an add action */}
        <View style={styles.topBar}>
          <AppText size={typeScale.titleLarge.size} color={m3.onSurface} style={{ flex: 1, marginLeft: 16 }}>
            Budgets
          </AppText>
          <IconButton icon="add" onPress={() => router.push('/new-budget')} label="New budget" tint={m3.onSurface} />
        </View>

        {nothing ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: m3.surfaceContainerHigh }]}>
              <Icon name="wallet-outline" size={44} color={m3.onSurfaceVariant} />
            </View>
            <AppText size={typeScale.headlineSmall.size} color={m3.onSurface} style={{ marginTop: 24 }}>
              No Budgets Found
            </AppText>
            <AppText size={typeScale.bodyLarge.size} color={m3.onSurfaceVariant} style={{ marginTop: 8, textAlign: 'center' }}>
              Set an overall budget, or one per category, and watch your pace.
            </AppText>
            <Chip icon="add" label="New budget" tint={m3.secondaryContainer} onTint={m3.onSecondaryContainer} onPress={() => router.push('/new-budget')} style={{ marginTop: 24 }} />
          </View>
        ) : null}

        {mainBudget
          ? (() => {
              const spent = mainBudgetSpent(mainBudget, transactions);
              const p = budgetProgress(mainBudget, spent);
              return (
                // The overall budget: a tonal card with the amount left and a linear progress indicator.
                <Pressable
                  onPress={() => router.push({ pathname: '/budget-detail', params: { id: 'main' } })}
                  onLongPress={() => {
                    Haptics.light();
                    mainMenu.open();
                  }}
                  android_ripple={{ color: `${m3.onSurface}1F` }}
                  style={[styles.overall, { backgroundColor: m3.surfaceContainerLow, borderColor: m3.outlineVariant }]}
                >
                  {({ pressed }) => (
                    <>
                      <StateLayer pressed={pressed} color={m3.onSurface} radius={shape.extraLarge} />
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <AppText size={typeScale.titleMedium.size} weight="semibold" color={m3.onSurfaceVariant} style={{ letterSpacing: typeScale.titleMedium.tracking }}>
                          Overall budget
                        </AppText>
                        <View {...anchorProps(mainMenu)}>
                          <IconButton icon="ellipsis-vertical" onPress={mainMenu.open} label="More options" />
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                        <AppText size={typeScale.titleLarge.size} color={m3.onSurfaceVariant}>
                          {sym}
                        </AppText>
                        <AppText size={typeScale.displayMedium.size} color={p.over ? m3.error : m3.onSurface} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                          {fmtSmart(Math.abs(p.left), settings.showCents)}
                        </AppText>
                      </View>
                      <AppText size={typeScale.bodyLarge.size} color={m3.onSurfaceVariant} style={{ marginBottom: 12, letterSpacing: typeScale.bodyLarge.tracking }}>
                        {p.over ? 'over' : 'left'} {BUDGET_PERIOD_PHRASE[mainBudget.type]}
                      </AppText>
                      <CapsuleProgress fraction={p.fraction} elapsed={p.elapsed} colour={p.over ? m3.error : m3.primary} height={12} />
                      <View style={styles.overallFoot}>
                        <AppText size={typeScale.labelMedium.size} weight="semibold" color={m3.onSurfaceVariant}>
                          {sym}
                          {fmtFull(spent)} spent
                        </AppText>
                        <AppText size={typeScale.labelMedium.size} weight="semibold" color={p.over ? m3.error : m3.onSurfaceVariant}>
                          {Math.round(p.fraction * 100)}% of {sym}
                          {fmtFull(mainBudget.amount)}
                        </AppText>
                      </View>
                    </>
                  )}
                </Pressable>
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

/** An M3 filled card per category budget: avatar and name, amount left, a status chip and a progress indicator. */
function BudgetCard({ budget, spent, category, onDelete }: { budget: Budget; spent: number; category?: { emoji: string; name: string; colour: string }; onDelete: () => void }) {
  const { m3 } = useTheme();
  const settings = useStore((s) => s.settings);
  const menu = useAnchor();
  const p = budgetProgress(budget, spent);
  const sym = currencySymbol(settings.currency);
  const percent = Math.round(p.fraction * 100);
  const tint = category?.colour ?? m3.primary;

  return (
    <View {...anchorProps(menu)} style={{ width: '48.5%' }}>
      <Pressable
        onPress={() => router.push({ pathname: '/budget-detail', params: { id: budget.id } })}
        onLongPress={() => {
          Haptics.light();
          menu.open();
        }}
        android_ripple={{ color: `${m3.onSurface}1F` }}
        style={[styles.card, { backgroundColor: m3.surfaceContainerLow, borderColor: m3.outlineVariant }]}
      >
        {({ pressed }) => (
          <>
            <StateLayer pressed={pressed} color={m3.onSurface} radius={shape.large} />
            <View style={styles.cardHead}>
              <View style={[styles.cardAvatar, { backgroundColor: withAlpha(tint, 0.3) }]}>
                <AppText size={18} style={{ includeFontPadding: false }}>
                  {category?.emoji ?? '❓'}
                </AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText size={typeScale.titleMedium.size} weight="semibold" color={m3.onSurface} numberOfLines={1}>
                  {category?.name ?? 'Unknown'}
                </AppText>
                <AppText size={typeScale.bodySmall.size} color={m3.onSurfaceVariant}>
                  {p.daysLeft} {p.daysLeft === 1 ? 'day' : 'days'} left
                </AppText>
              </View>
            </View>

            <View style={{ flex: 1, minHeight: 16 }} />
            <View style={[styles.status, { backgroundColor: p.over ? m3.errorContainer : m3.successContainer }]}>
              <AppText size={typeScale.labelSmall.size} weight="semibold" color={p.over ? m3.error : m3.success} style={{ letterSpacing: 0.5 }}>
                {percent}% {p.over ? 'OVER' : 'SPENT'}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 8 }}>
              <AppText size={typeScale.titleMedium.size} color={m3.onSurfaceVariant}>
                {sym}
              </AppText>
              <AppText size={typeScale.headlineMedium.size} color={m3.onSurface} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {fmtSmart(Math.abs(p.left), settings.showCents)}
              </AppText>
            </View>
            <AppText size={typeScale.bodySmall.size} color={m3.onSurfaceVariant} style={{ marginBottom: 8 }}>
              {p.over ? 'over' : 'left'} {BUDGET_PERIOD_PHRASE[budget.type]}
            </AppText>
            <CapsuleProgress fraction={p.fraction} elapsed={p.elapsed} colour={p.over ? m3.error : tint} height={8} />
          </>
        )}
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
  topBar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingRight: 4 },
  empty: { alignItems: 'center', paddingTop: 72, paddingHorizontal: 32 },
  emptyIcon: { width: 96, height: 96, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
  overall: { marginHorizontal: 16, marginTop: 8, padding: 20, paddingTop: 12, borderRadius: shape.extraLarge, borderWidth: 1, overflow: 'hidden' },
  overallFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginTop: 16, paddingHorizontal: 16 },
  card: { borderRadius: shape.large, padding: 16, minHeight: 210, borderWidth: 1, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardAvatar: { width: 32, height: 32, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
  status: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: shape.extraSmall },
});
