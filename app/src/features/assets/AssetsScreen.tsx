import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ASSETS, isUp, latest, percentOf, quantityLabel, totalWorth, worth } from '@/domain/assets';
import { shortLabel, toDay } from '@/domain/dates';
import { inr } from '@/domain/money';
import { openPage } from '@/lib/navigation';
import { prices } from '@/state/app';
import { useData, useNow } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { Button, EmojiAvatar, ListItem, TopAppBar } from '@/ui/material';
import { useFabScroll } from '@/ui/useFabScroll';
import { ValueCard } from './ValueCard';

/** Gold, silver and the two funds: what was put in and what they're worth today. */
export function AssetsScreen() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const fabScroll = useFabScroll();
  const data = useData();
  const now = useNow();

  useFocusEffect(
    useCallback(() => {
      void prices.refresh();
    }, []),
  );

  const rows = ASSETS.map((asset) => ({ asset, quote: latest(data.prices[asset.id]), w: worth(data, asset.id, now) }));
  const day = (id: 'gold' | 'taurus') => {
    const on = latest(data.prices[id])?.day;
    return on && shortLabel(on, toDay(now));
  };
  const metalDay = day('gold');
  const fundDay = day('taurus');

  return (
    <View style={[styles.fill, { backgroundColor: m3.surface }]}>
      <ScrollView {...fabScroll} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        <TopAppBar title="Assets" inset={false} />

        {data.settings.currency !== 'INR' ? (
          <View style={styles.currency}>
            <AppText variant="bodyLarge" color={m3.onSurfaceVariant}>
              Asset prices are in rupees. Switch your currency to INR to add assets.
            </AppText>
            <Button variant="tonal" label="Change currency" onPress={() => openPage('/currency')} />
          </View>
        ) : null}

        <ValueCard v={totalWorth(data, now)} />

        <View style={styles.list}>
          {rows.map(({ asset, quote, w }) => (
            <ListItem
              key={asset.id}
              onPress={() => openPage({ pathname: '/asset', params: { id: asset.id } })}
              leading={<EmojiAvatar emoji={asset.emoji} colour={asset.colour} />}
              headline={asset.name}
              supporting={`${w.count === 0 ? '' : w.quantity === 0 ? 'Units pending · ' : `${quantityLabel(asset, w.quantity)} · `}${quote ? `${inr(quote.rate)} a ${asset.per}` : 'No price yet'}`}
              trailing={
                <View style={styles.right}>
                  <AppText variant="titleMedium" color={m3.onSurface}>
                    {w.value === null ? '-' : inr(w.value)}
                  </AppText>
                  {w.count > 0 && w.value !== null ? (
                    <AppText variant="bodySmall" color={isUp(w) ? m3.success : m3.onSurfaceVariant}>
                      {percentOf(w) === null ? 'No change' : `${isUp(w) ? '+' : '-'}${percentOf(w)}`}
                    </AppText>
                  ) : null}
                </View>
              }
            />
          ))}
        </View>

        <AppText variant="bodySmall" color={m3.onSurfaceVariant} style={styles.note}>
          {data.priceError ? 'Couldn’t update prices just now. ' : ''}
          {metalDay ? `Gold is 22K. Gold and silver: Chennai rate, ${metalDay}. ` : ''}
          {fundDay ? `Funds: closing price, ${fundDay}, Direct Growth plans. ` : ''}
          Updated once a day.
        </AppText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  currency: { paddingHorizontal: 16, gap: 12, alignItems: 'flex-start' },
  list: { marginTop: 12 },
  right: { alignItems: 'flex-end' },
  note: { marginTop: 16, marginHorizontal: 16 },
});
