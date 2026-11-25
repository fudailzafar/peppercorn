import { StyleSheet, View } from 'react-native';
import { progressFrom } from '@/domain/budgets';
import { PaceLabel, usePace } from '@/features/budgets/PaceLabel';
import { useMoney } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { BigAmount } from '@/ui/BigAmount';
import { EmojiAvatar, LinearProgress, ProgressRing } from '@/ui/material';
import { PreviewFrame, Surface } from './PreviewFrame';

/** The budget ring with its status and safe amount per day, and a category that needs a look. */
export function BudgetPreview() {
  const { m3 } = useTheme();
  const { code, brief: money, briefDigits } = useMoney();
  const all = progressFrom(15000, 6600, 0.6, 12);
  const food = progressFrom(3000, 2460, 0.6, 12);
  const pace = usePace(all);
  const fast = usePace(food);
  return (
    <PreviewFrame>
      <Surface hero>
        <View style={styles.middle}>
          <ProgressRing fraction={all.used} color={pace.color} size={152} stroke={13}>
            <BigAmount digits={briefDigits(all.left)} currency={code} size={30} centred />
            <AppText variant="bodySmall" color={m3.onSurfaceVariant}>
              left of {money(all.limit)}
            </AppText>
          </ProgressRing>
          <PaceLabel p={all} />
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant}>
            {money(all.safePerDay)} safe per day, {all.daysLeft} days left
          </AppText>
        </View>
      </Surface>
      <Surface>
        <View style={styles.row}>
          <EmojiAvatar emoji="🍔" colour="#FF78A3" />
          <View style={styles.about}>
            <View style={[styles.row, styles.near]}>
              <AppText variant="titleMedium" numberOfLines={1} style={styles.fill}>
                Food
              </AppText>
              <PaceLabel p={food} />
            </View>
            <LinearProgress fraction={food.used} color={fast.color} />
          </View>
        </View>
      </Surface>
    </PreviewFrame>
  );
}

const styles = StyleSheet.create({
  middle: { alignItems: 'center', gap: 12 },
  about: { flex: 1, gap: 8 },
  fill: { flex: 1 },
  near: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
});
