import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { overallOf, progress } from '@/domain/budgets';
import { categoryOf } from '@/domain/entries';
import type { Budget } from '@/domain/model';
import { haptics } from '@/lib/haptics';
import { openPage } from '@/lib/navigation';
import { store } from '@/state/app';
import { useData, useNow } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { Confirm } from '@/ui/Confirm';
import { Empty } from '@/ui/Empty';
import { Button, Card, IconAvatar, IconButton, ListGroup, ListItem, Subheader, TopAppBar } from '@/ui/material';
import { useFabScroll } from '@/ui/useFabScroll';
import { BudgetHero } from './BudgetHero';
import { type Line, Options, BudgetLine } from './BudgetLine';

const TITLE = { day: 'Daily budget', week: 'Weekly budget', month: 'Monthly budget', year: 'Yearly budget' } as const;

/** The ones that need attention come first. */
const URGENCY = { over: 0, fast: 1, onTrack: 2 } as const;

/** The overall budget as a ring, then each category's. */
export function BudgetsScreen() {
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

const styles = StyleSheet.create({
  fill: { flex: 1 },
  empty: { paddingTop: 72 },
  card: { marginHorizontal: 16 },
  more: { alignItems: 'center', marginTop: 16 },
});
