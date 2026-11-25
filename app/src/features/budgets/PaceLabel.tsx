import { StyleSheet, View } from 'react-native';
import type { Progress } from '@/domain/budgets';
import { shape } from '@/theme/material';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { Icon, type IconName } from '@/ui/Icon';

/** How a budget is doing, with the colours that say so. */
export function usePace({ pace }: Pick<Progress, 'pace'>): { label: string; icon: IconName; color: string; ink: string; container: string } {
  const { m3 } = useTheme();
  if (pace === 'over') return { label: 'Over budget', icon: 'alert-circle', color: m3.error, ink: m3.onErrorContainer, container: m3.errorContainer };
  if (pace === 'fast') return { label: 'Spending fast', icon: 'trending-up', color: m3.warning, ink: m3.warning, container: m3.warningContainer };
  return { label: 'On track', icon: 'checkmark-circle', color: m3.primary, ink: m3.success, container: m3.successContainer };
}

/** The status as a small tonal label: an icon and words, never colour alone. */
export function PaceLabel({ p }: { p: Pick<Progress, 'pace'> }) {
  const pace = usePace(p);
  return (
    <View style={[styles.pace, { backgroundColor: pace.container }]}>
      <Icon name={pace.icon} size={16} color={pace.ink} />
      <AppText variant="labelMedium" color={pace.ink}>
        {pace.label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({ pace: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingHorizontal: 10, borderRadius: shape.small } });
