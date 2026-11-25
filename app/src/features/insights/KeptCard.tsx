import { StyleSheet, View } from 'react-native';
import { compared, type Period } from '@/domain/insights';
import { useData, useMoney } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { Card, LinearProgress, Subheader } from '@/ui/material';

/** What's left of what came in? */
export function KeptCard({ p, hasAssets }: { p: Period; hasAssets: boolean }) {
  const { m3 } = useTheme();
  const { brief } = useMoney();
  const { entries } = useData();
  const spent = compared(entries, p, false).now;
  const earned = compared(entries, p, true).now;
  if (earned <= 0) return null;
  const kept = earned - spent;
  return (
    <>
      <Subheader text="Earned and spent" />
      <Card style={styles.kept}>
        <AppText variant="titleMedium">{kept >= 0 ? `You kept ${brief(kept)} of ${brief(earned)}` : `You spent ${brief(kept)} more than you earned`}</AppText>
        <LinearProgress fraction={spent / earned} color={kept >= 0 ? m3.primary : m3.error} height={12} />
        <View style={styles.sides}>
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant}>
            {brief(spent)} spent{hasAssets ? ', with assets' : ''}
          </AppText>
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant}>
            {brief(earned)} earned
          </AppText>
        </View>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  kept: { marginHorizontal: 16, padding: 16, gap: 12 },
  sides: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
});
