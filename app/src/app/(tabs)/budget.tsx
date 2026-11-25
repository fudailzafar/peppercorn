import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { BudgetHero, PaceLabel, usePace } from '../../components/BudgetBits';
import { Confirm } from '../../components/Confirm';
import { Empty } from '../../components/Empty';
import { Button, Card, EmojiAvatar, IconAvatar, IconButton, LinearProgress, ListGroup, ListItem, Subheader, TopAppBar } from '../../components/material';
import { Menu } from '../../components/Menu';
import { Touch } from '../../components/Touch';
import { store } from '../../data/app';
import { useData, useMoney, useNow } from '../../data/hooks';
import { overallOf, progress, type Progress } from '../../domain/budgets';
import { categoryOf } from '../../domain/entries';
import type { Budget, Category } from '../../domain/model';
import { haptics } from '../../hooks/haptics';
import { openPage } from '../../hooks/nav';
import { useFabScroll } from '../../hooks/useFabScroll';
import { useTheme } from '../../theme/theme';

const TITLE = { day: 'Daily budget', week: 'Weekly budget', month: 'Monthly budget', year: 'Yearly budget' } as const;
/** Said of a category's budget, unless it is for a month, as most are. */
const WHEN = { day: ' today', week: ' this week', month: '', year: ' this year' } as const;
/** The ones that need attention come first. */
const URGENCY = { over: 0, fast: 1, onTrack: 2 } as const;

interface Line {
  budget: Budget;
  category?: Category;
  p: Progress;
}

/** The overall budget as a ring, then each category's. */
export default function Budgets() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useData();
  const now = useNow();
  const scroll = useFabScroll();
  const [deleting, setDeleting] = useState<Budget | null>(null);

  const overall = overallOf(data);
  const lines: Line[] = data.budgets
    .filter((b) => b.categoryId !== null)
    .map((budget) => ({ budget, category: categoryOf(data, budget.categoryId), p: progress(data, budget, now) }))
    .sort((a, b) => URGENCY[a.p.pace] - URGENCY[b.p.pace] || b.p.used - a.p.used);
  const none = !overall && lines.length === 0;

  return (
    <View style={[styles.fill, { backgroundColor: m3.surface }]}>
      <ScrollView {...scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 160 }}>
        <TopAppBar title="Budgets" inset={false} actions={<IconButton icon="add" label="New budget" tint={m3.onSurface} onPress={() => openPage('/edit-budget')} />} />

        {overall ? (
          <BudgetHero
            title={TITLE[overall.period]}
            period={overall.period}
            p={progress(data, overall, now)}
            onPress={() => openPage({ pathname: '/budget-page', params: { id: overall.id } })}
            action={<Options label="Budget options" budget={overall} onDelete={setDeleting} />}
          />
        ) : none ? (
          <Empty icon="wallet" title="No budgets yet" text="Set one for everything, or one per category, and see what you can spend each day." style={styles.empty}>
            <Button icon="add" label="New budget" onPress={() => openPage('/edit-budget')} />
          </Empty>
        ) : (
          <Card style={styles.card}>
            <ListItem leading={<IconAvatar icon="wallet" />} headline="Set an overall budget" supporting="One limit for all your spending" chevron onPress={() => openPage('/edit-budget?kind=overall')} />
          </Card>
        )}

        {lines.length > 0 ? (
          <>
            <Subheader text="Categories" />
            <ListGroup>
              {lines.map((line) => (
                <BudgetLine key={line.budget.id} {...line} onDelete={setDeleting} />
              ))}
            </ListGroup>
          </>
        ) : null}
        {none ? null : (
          <View style={styles.more}>
            <Button variant="tonal" icon="add" label="Add a category budget" onPress={() => openPage('/edit-budget?kind=category')} />
          </View>
        )}
      </ScrollView>

      <Confirm
        visible={deleting !== null}
        title={deleting?.categoryId ? `Delete the “${categoryOf(data, deleting.categoryId)?.name ?? ''}” budget?` : 'Delete your overall budget?'}
        message="Your entries are kept. You can’t undo this."
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) store.removeBudget(deleting.id);
          haptics.done();
          setDeleting(null);
        }}
      />
    </View>
  );
}

function Options({ label, budget, onDelete }: { label: string; budget: Budget; onDelete: (b: Budget) => void }) {
  const items = [
    { label: 'Edit', icon: 'pencil', onPress: () => openPage({ pathname: '/edit-budget', params: { id: budget.id } }) },
    { label: 'Delete', icon: 'trash', destructive: true, onPress: () => onDelete(budget) },
  ] as const;
  return <Menu items={items}>{(open) => <IconButton icon="ellipsis-vertical" label={label} onPress={open} />}</Menu>;
}

/** A category's budget: how much is left, and a line in the colour of how it's going. */
function BudgetLine({ budget, category, p, onDelete }: Line & { onDelete: (b: Budget) => void }) {
  const { m3 } = useTheme();
  const { brief } = useMoney();
  const { color, label } = usePace(p);
  const name = category?.name ?? 'Unknown';
  const percent = `${Math.round(p.used * 100)}%`;
  const left = `${brief(p.left)} ${p.over ? 'over' : 'left of'} ${brief(p.limit)}${WHEN[budget.period]}`;
  return (
    <View style={styles.split}>
      <Touch ink={m3.onSurface} label={`${name}, ${left}, ${label}`} onPress={() => openPage({ pathname: '/budget-page', params: { id: budget.id } })} style={styles.line}>
        <EmojiAvatar emoji={category?.emoji ?? '❔'} colour={category?.colour ?? m3.outline} />
        <View style={styles.about}>
          <View>
            <View style={styles.nameRow}>
              <AppText variant="titleMedium" numberOfLines={1} style={styles.fill}>
                {name}
              </AppText>
              {p.pace === 'onTrack' ? (
                <AppText variant="labelLarge" color={m3.onSurfaceVariant}>
                  {percent}
                </AppText>
              ) : (
                <PaceLabel p={p} />
              )}
            </View>
            <AppText variant="bodyMedium" color={m3.onSurfaceVariant} numberOfLines={1}>
              {left}
            </AppText>
          </View>
          <LinearProgress fraction={p.used} color={color} />
        </View>
      </Touch>
      <Options label={`${name} budget options`} budget={budget} onDelete={onDelete} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  empty: { paddingTop: 72 },
  card: { marginHorizontal: 16 },
  more: { alignItems: 'center', marginTop: 16 },
  split: { flexDirection: 'row', alignItems: 'center' },
  line: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16, paddingLeft: 16, paddingVertical: 16 },
  about: { flex: 1, gap: 8 },
  nameRow: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 8 },
});
