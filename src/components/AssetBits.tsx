import { View } from 'react-native';
import { DUST, type Valuation } from '../lib/assets';
import { currencySymbol, fmtFull, fmtSmart } from '../lib/format';
import { useStore } from '../lib/store';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { BigAmount } from './Bits';
import { Card } from './material/Card';

export const inr = (n: number) => `${currencySymbol('INR')}${fmtFull(Math.abs(n))}`;

/** "+₹1,200.00 (4.2%)" */
export function gainText(v: Pick<Valuation, 'value' | 'invested'>): string {
  if (v.value === null || v.invested <= 0) return '';
  const gain = v.value - v.invested;
  if (Math.abs(gain) < DUST) return 'No change';
  return `${gain >= 0 ? '+' : '-'}${inr(gain)} (${Math.abs((gain / v.invested) * 100).toFixed(1)}%)`;
}

/** Current value, with what was invested and the gain underneath. */
export function ValueCard({ title, v, children }: { title: string; v: Pick<Valuation, 'value' | 'invested'>; children?: React.ReactNode }) {
  const { m3 } = useTheme();
  const showCents = useStore((s) => s.settings.showCents);
  const up = v.value !== null && v.value - v.invested >= DUST;
  return (
    <Card hero style={{ marginHorizontal: 16, marginTop: 8, padding: 20 }}>
      <AppText variant="titleSmall" color={m3.onSurfaceVariant}>
        {title}
      </AppText>
      <View style={{ marginTop: 4 }}>
        {v.value === null ? (
          <AppText variant="titleLarge" color={m3.onSurface}>
            Price not available yet
          </AppText>
        ) : (
          <BigAmount value={fmtSmart(v.value, showCents)} currency="INR" size={48} align="flex-start" />
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
        <Stat label="Invested" value={inr(v.invested)} color={m3.onSurface} />
        <Stat label={v.value !== null && v.invested - v.value >= DUST ? 'Loss' : 'Gain'} value={gainText(v) || '-'} color={up ? m3.success : m3.onSurface} />
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
      <AppText variant="bodyLarge" weight="semibold" color={color}>
        {value}
      </AppText>
    </View>
  );
}
