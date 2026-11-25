import { View } from 'react-native';
import { useSettings } from '../data/hooks';
import { gainText, isDown, isUp, type Worth } from '../domain/assets';
import { rupees } from '../domain/money';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { BigAmount } from './BigAmount';
import { Card } from './material/Card';

/** "₹1,200.00", as asset prices are written whatever the app's currency is. */
export const inr = rupees().full;

/** Current value, with what was invested and the gain underneath. */
export function ValueCard({ v, children }: { v: Pick<Worth, 'value' | 'invested'>; children?: React.ReactNode }) {
  const { m3 } = useTheme();
  const { cents } = useSettings();
  return (
    <Card hero style={{ marginHorizontal: 16, marginTop: 8, padding: 20 }}>
      <AppText variant="titleSmall" color={m3.onSurfaceVariant}>
        Current value
      </AppText>
      <View style={{ marginTop: 4 }}>
        {v.value === null ? (
          <AppText variant="titleLarge" color={m3.onSurface}>
            Price not available yet
          </AppText>
        ) : (
          <BigAmount digits={rupees(cents).briefDigits(v.value)} currency="INR" size={48} />
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
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
    <View style={{ flex: 1 }}>
      <AppText variant="bodySmall" color={m3.onSurfaceVariant}>
        {label}
      </AppText>
      <AppText variant="bodyLarge" weight="medium" color={color}>
        {value}
      </AppText>
    </View>
  );
}
