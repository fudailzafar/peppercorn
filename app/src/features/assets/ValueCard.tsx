import { StyleSheet, View } from 'react-native';
import { gainText, isDown, isUp, type Worth } from '@/domain/assets';
import { rupees, inr } from '@/domain/money';
import { useSettings } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { BigAmount } from '@/ui/BigAmount';
import { Card } from '@/ui/material/Card';

/** Current value, with what was invested and the gain underneath. */
export function ValueCard({ v, children }: { v: Pick<Worth, 'value' | 'invested'>; children?: React.ReactNode }) {
  const { m3 } = useTheme();
  const { cents } = useSettings();
  return (
    <Card hero style={styles.card}>
      <AppText variant="titleSmall" color={m3.onSurfaceVariant}>
        Current value
      </AppText>
      <View style={styles.gap}>
        {v.value === null ? (
          <AppText variant="titleLarge" color={m3.onSurface}>
            Price not available yet
          </AppText>
        ) : (
          <BigAmount digits={rupees(cents).briefDigits(v.value)} currency="INR" size={48} />
        )}
      </View>
      <View style={styles.stats}>
        <Stat label="Invested" value={inr(v.invested)} color={m3.onSurface} />
        <Stat label={isDown(v) ? 'Loss' : 'Gain'} value={gainText(v) || '-'} color={isUp(v) ? m3.success : m3.onSurface} />
      </View>
      {children}
    </Card>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  const { m3 } = useTheme();
  return (
    <View style={styles.fill}>
      <AppText variant="bodySmall" color={m3.onSurfaceVariant}>
        {label}
      </AppText>
      <AppText variant="bodyLarge" weight="medium" color={color}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 8, padding: 20 },
  gap: { marginTop: 4 },
  stats: { flexDirection: 'row', gap: 16, marginTop: 12 },
  fill: { flex: 1 },
});
