import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { gainText, inr, ValueCard } from '../../components/AssetBits';
import { Chip, StateLayer } from '../../components/m3';
import { ASSETS, DUST, latestQuote, qtyLabel, valuation } from '../../lib/assets';
import { shortDate } from '../../lib/dates';
import { refreshPrices } from '../../lib/prices';
import { useStore } from '../../lib/store';
import { useFabScroll } from '../../lib/useFabScroll';
import { typeScale } from '../../theme/material';
import { useTheme, withAlpha } from '../../theme/theme';

/** Gold, silver and the two funds: what was put in and what they're worth today. */
export default function AssetsScreen() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const fabScroll = useFabScroll();
  const transactions = useStore((s) => s.transactions);
  const holdings = useStore((s) => s.holdings);
  const prices = useStore((s) => s.prices);
  const priceError = useStore((s) => s.priceError);
  const currency = useStore((s) => s.settings.currency);

  useFocusEffect(
    useCallback(() => {
      void refreshPrices();
    }, []),
  );

  const rows = ASSETS.map((asset) => ({ asset, quote: latestQuote(prices[asset.id]), v: valuation(asset.id, transactions, holdings, prices[asset.id]) }));
  const total = rows.reduce(
    (sum, { v }) => ({ invested: sum.invested + v.invested, value: sum.value === null || v.value === null ? null : sum.value + v.value }),
    { invested: 0, value: 0 as number | null },
  );
  const metalDay = rows[0].quote?.day;
  const fundDay = rows[2].quote?.day;
  const day = (iso: string) => shortDate(new Date(`${iso}T00:00`));

  return (
    <View style={{ flex: 1, backgroundColor: m3.surface }}>
      <ScrollView {...fabScroll} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <AppText size={typeScale.titleLarge.size} color={m3.onSurface} style={{ marginLeft: 16 }}>
            Assets
          </AppText>
        </View>

        {currency !== 'INR' ? (
          <View style={{ paddingHorizontal: 16, gap: 12, alignItems: 'flex-start' }}>
            <AppText size={typeScale.bodyLarge.size} color={m3.onSurfaceVariant}>
              Asset prices are in rupees. Switch your currency to INR to add assets.
            </AppText>
            <Chip label="Change currency" tint={m3.primaryContainer} onTint={m3.onPrimaryContainer} onPress={() => router.push('/settings-currency')} />
          </View>
        ) : null}

        <ValueCard title="Current value" v={total} />

        <View style={{ marginTop: 12 }}>
          {rows.map(({ asset, quote, v }) => (
            <Pressable
              key={asset.id}
              onPress={() => router.push({ pathname: '/asset', params: { id: asset.id } })}
              accessibilityRole="button"
              android_ripple={{ color: `${m3.onSurface}1F` }}
              style={styles.row}
            >
              {({ pressed }) => (
                <>
                  <StateLayer pressed={pressed} color={m3.onSurface} />
                  <View style={[styles.avatar, { backgroundColor: withAlpha(asset.colour, 0.3) }]}>
                    <AppText size={20} style={{ includeFontPadding: false }}>
                      {asset.emoji}
                    </AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText size={typeScale.bodyLarge.size} color={m3.onSurface} numberOfLines={1}>
                      {asset.name}
                    </AppText>
                    <AppText size={typeScale.bodyMedium.size} color={m3.onSurfaceVariant} numberOfLines={1}>
                      {v.count === 0 ? '' : v.qty === 0 ? 'Units pending · ' : `${qtyLabel(asset.id, v.qty)} · `}
                      {quote ? `${inr(quote.rate)} a ${asset.per}` : 'No price yet'}
                    </AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <AppText size={typeScale.titleMedium.size} weight="semibold" color={m3.onSurface}>
                      {v.value === null ? '-' : inr(v.value)}
                    </AppText>
                    {v.count > 0 ? (
                      <AppText size={typeScale.bodySmall.size} color={v.value !== null && v.value - v.invested >= DUST ? m3.success : m3.onSurfaceVariant}>
                        {gainText(v).replace(/.*\((.*)\)/, (_, p) => `${(v.value ?? 0) >= v.invested ? '+' : '-'}${p}`)}
                      </AppText>
                    ) : null}
                  </View>
                </>
              )}
            </Pressable>
          ))}
        </View>

        <AppText size={typeScale.bodySmall.size} color={m3.onSurfaceVariant} style={{ marginTop: 16, marginHorizontal: 16 }}>
          {priceError ? 'Couldn’t update prices just now. ' : ''}
          {metalDay ? `Gold is 22K. Gold and silver: Chennai rate, ${day(metalDay)}. ` : ''}
          {fundDay ? `Funds: closing price, ${day(fundDay)}, Direct Growth plans. ` : ''}
          Updated once a day.
        </AppText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { minHeight: 64, justifyContent: 'center' },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, overflow: 'hidden' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
