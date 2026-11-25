import { StyleSheet, View } from 'react-native';
import { latest, previous, type Asset } from '@/domain/assets';
import { shortLabel, toDay } from '@/domain/dates';
import { inr } from '@/domain/money';
import { useData, useNow } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';

/** Today's price, and how it moved. */
export function PriceLine({ asset }: { asset: Asset }) {
  const { m3 } = useTheme();
  const book = useData().prices[asset.id];
  const today = toDay(useNow());
  const quote = latest(book);
  const before = previous(book);
  const change = quote && before ? quote.rate - before.rate : null;
  return (
    <View style={styles.price}>
      <View style={styles.fill}>
        <AppText variant="bodyMedium" color={m3.onSurfaceVariant}>
          {asset.metal ? `${asset.id === 'gold' ? '22K, ' : ''}Chennai, per gram` : 'Closing price, per unit (Direct Growth)'}
        </AppText>
        <AppText variant="bodySmall" color={m3.onSurfaceVariant}>
          {quote ? shortLabel(quote.day, today) : 'Not available yet'}
        </AppText>
      </View>
      <View style={styles.right}>
        <AppText variant="titleMedium">{quote ? inr(quote.rate) : '-'}</AppText>
        {change === null ? null : (
          <AppText variant="bodySmall" color={change > 0 ? m3.success : m3.onSurfaceVariant}>
            {change === 0 ? 'No change' : `${change > 0 ? '+' : '-'}${inr(change)}`}
          </AppText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  right: { alignItems: 'flex-end' },
  price: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingTop: 16 },
});
