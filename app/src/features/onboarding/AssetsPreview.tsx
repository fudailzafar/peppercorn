import { StyleSheet, View } from 'react-native';
import { assetOf, gainText, isUp, percentOf } from '@/domain/assets';
import { money as moneyOf, rupees } from '@/domain/money';
import { useSettings } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { BigAmount } from '@/ui/BigAmount';
import { EmojiAvatar, ListItem } from '@/ui/material';
import { PreviewFrame, Surface } from './PreviewFrame';

/** What gold, silver and a fund are worth together, and each on its own. */
export function AssetsPreview() {
  const { m3 } = useTheme();
  const { cents } = useSettings();
  const inr = (n: number) => rupees(false).brief(n);
  const rows = [
    { id: 'gold', qty: '10 g, 22K', invested: 112430, value: 117150 },
    { id: 'silver', qty: '250 g', invested: 44550, value: 43750 },
    { id: 'tata', qty: '100 units', invested: 39340, value: 41738 },
  ] as const;
  const invested = rows.reduce((n, r) => n + r.invested, 0);
  const value = rows.reduce((n, r) => n + r.value, 0);
  return (
    <PreviewFrame>
      <Surface hero>
        <AppText variant="titleSmall" color={m3.onSurfaceVariant}>
          Current value
        </AppText>
        <BigAmount digits={rupees(cents).briefDigits(value)} currency="INR" size={36} />
        <AppText variant="bodyMedium" color={m3.success} style={styles.gap}>
          {gainText({ value, invested }, { ...moneyOf('INR', false), full: inr })}
        </AppText>
      </Surface>
      <Surface padded={false}>
        {rows.map((r) => {
          const a = assetOf(r.id);
          return (
            <ListItem
              key={r.id}
              headline={a.name}
              supporting={r.qty}
              leading={<EmojiAvatar emoji={a.emoji} colour={a.colour} />}
              trailing={
                <View style={styles.right}>
                  <AppText variant="titleSmall">{inr(r.value)}</AppText>
                  <AppText variant="bodySmall" color={isUp(r) ? m3.success : m3.onSurfaceVariant}>
                    {isUp(r) ? '+' : '-'}
                    {percentOf(r)}
                  </AppText>
                </View>
              }
            />
          );
        })}
      </Surface>
    </PreviewFrame>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: 4 },
  right: { alignItems: 'flex-end' },
});
