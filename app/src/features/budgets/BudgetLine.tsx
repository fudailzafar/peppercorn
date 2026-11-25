import { StyleSheet, View } from 'react-native';
import type { Progress } from '@/domain/budgets';
import type { Budget, Category } from '@/domain/model';
import { openPage } from '@/lib/navigation';
import { useMoney } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { EmojiAvatar, IconButton, LinearProgress } from '@/ui/material';
import { Menu } from '@/ui/Menu';
import { Touch } from '@/ui/Touch';
import { PaceLabel, usePace } from './PaceLabel';

/** Said of a category's budget, unless it is for a month, as most are. */
const WHEN = { day: ' today', week: ' this week', month: '', year: ' this year' } as const;

export interface Line {
  budget: Budget;
  category?: Category;
  p: Progress;
}

export function Options({ label, budget, onDelete }: { label: string; budget: Budget; onDelete: (b: Budget) => void }) {
  const items = [
    { label: 'Edit', icon: 'pencil', onPress: () => openPage({ pathname: '/edit-budget', params: { id: budget.id } }) },
    { label: 'Delete', icon: 'trash', destructive: true, onPress: () => onDelete(budget) },
  ] as const;
  return <Menu items={items}>{(open) => <IconButton icon="ellipsis-vertical" label={label} onPress={open} />}</Menu>;
}

/** A category's budget: how much is left, and a line in the colour of how it's going. */
export function BudgetLine({ budget, category, p, onDelete }: Line & { onDelete: (b: Budget) => void }) {
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
  split: { flexDirection: 'row', alignItems: 'center' },
  line: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16, paddingLeft: 16, paddingVertical: 16 },
  about: { flex: 1, gap: 8 },
  nameRow: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 8 },
});
