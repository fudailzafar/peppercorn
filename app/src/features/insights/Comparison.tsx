import { StyleSheet, View } from 'react-native';
import type { Compared } from '@/domain/insights';
import { useMoney } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { Icon } from '@/ui/Icon';

/**
 * How this compares, in words with an icon. Spending less (or earning more) is green; the other way stays neutral:
 * it is information, not a telling-off.
 */
export function Comparison({ now, before, income, against }: Compared & { income: boolean; against: string }) {
  const { m3 } = useTheme();
  const { brief: money } = useMoney();
  if (before <= 0) {
    return (
      <AppText variant="bodyMedium" color={m3.onSurfaceVariant}>
        Nothing {income ? 'earned' : 'spent'} {against.startsWith('this time') ? `by ${against}` : against}
      </AppText>
    );
  }
  const change = now - before;
  const same = Math.abs(change) < before * 0.01;
  const good = income ? change > 0 : change < 0;
  const ink = !same && good ? m3.success : m3.onSurfaceVariant;
  return (
    <View style={styles.compare}>
      {same ? null : <Icon name={change > 0 ? 'trending-up' : 'trending-down'} size={18} color={ink} />}
      <AppText variant="bodyMedium" color={ink} style={styles.shrink}>
        {same ? `About the same as ${against}` : `${money(change)} ${change > 0 ? 'more' : 'less'} than ${against}`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  shrink: { flexShrink: 1 },
  compare: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
