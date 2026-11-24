import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { gainText, inr, ValueCard } from '../../components/AssetBits';
import { Button, EmojiAvatar, ListItem, TopAppBar } from '../../components/material';
import { ASSETS, DUST, latestQuote, qtyLabel, valuation } from '../../lib/assets';
import { shortDate } from '../../lib/dates';
import { refreshPrices } from '../../lib/prices';
import { useStore } from '../../lib/store';
import { useFabScroll } from '../../lib/useFabScroll';
import { useTheme } from '../../theme/theme';

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
        <TopAppBar title="Assets" inset={false} />

        {currency !== 'INR' ? (
          <View style={{ paddingHorizontal: 16, gap: 12, alignItems: 'flex-start' }}>
            <AppText variant="bodyLarge" color={m3.onSurfaceVariant}>
              Asset prices are in rupees. Switch your currency to INR to add assets.
            </AppText>
            <Button variant="tonal" label="Change currency" onPress={() => router.push('/settings-currency')} />
          </View>
        ) : null}

        <ValueCard title="Current value" v={total} />

        <View style={{ marginTop: 12 }}>
          {rows.map(({ asset, quote, v }) => (
            <ListItem
              key={asset.id}
              onPress={() => router.push({ pathname: '/asset', params: { id: asset.id } })}
              leading={<EmojiAvatar emoji={asset.emoji} colour={asset.colour} />}
              headline={asset.name}
              supporting={`${v.count === 0 ? '' : v.qty === 0 ? 'Units pending · ' : `${qtyLabel(asset.id, v.qty)} · `}${quote ? `${inr(quote.rate)} a ${asset.per}` : 'No price yet'}`}
              trailing={
                <View style={{ alignItems: 'flex-end' }}>
                  <AppText variant="titleMedium" color={m3.onSurface}>
                    {v.value === null ? '-' : inr(v.value)}
                  </AppText>
                  {v.count > 0 ? (
                    <AppText variant="bodySmall" color={v.value !== null && v.value - v.invested >= DUST ? m3.success : m3.onSurfaceVariant}>
                      {gainText(v).replace(/.*\((.*)\)/, (_, p) => `${(v.value ?? 0) >= v.invested ? '+' : '-'}${p}`)}
                    </AppText>
                  ) : null}
                </View>
              }
            />
          ))}
        </View>

        <AppText variant="bodySmall" color={m3.onSurfaceVariant} style={{ marginTop: 16, marginHorizontal: 16 }}>
          {priceError ? 'Couldn’t update prices just now. ' : ''}
          {metalDay ? `Gold is 22K. Gold and silver: Chennai rate, ${day(metalDay)}. ` : ''}
          {fundDay ? `Funds: closing price, ${day(fundDay)}, Direct Growth plans. ` : ''}
          Updated once a day.
        </AppText>
      </ScrollView>
    </View>
  );
}
