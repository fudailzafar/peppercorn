import { StyleSheet, View } from 'react-native';
import { useMoney, useSettings } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';

/** Over a day's or a month's entries: what it is, and what it comes to. */
export function TotalHeading({ label, net }: { label: string; net: number | null }) {
  const { m3 } = useTheme();
  const money = useMoney();
  const { signs } = useSettings();
  return (
    <View style={styles.line} accessible accessibilityRole="header">
      <AppText variant="labelLarge" color={m3.onSurfaceVariant} numberOfLines={1} style={styles.label}>
        {label}
      </AppText>
      {net === null ? null : (
        <AppText variant="labelLarge" color={m3.onSurfaceVariant}>
          {signs ? (net >= 0 ? '+' : '-') : ''}
          {money.full(net)}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  label: { flexShrink: 1 },
});
