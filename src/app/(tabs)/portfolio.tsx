import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { inr, ValueCard } from '../../components/AssetBits';
import { Button, EmojiAvatar, ListItem, TopAppBar } from '../../components/material';
import { prices } from '../../data/app';
import { useData, useNow } from '../../data/hooks';
import { ASSETS, isUp, latest, percentOf, quantityLabel, totalWorth, worth } from '../../domain/assets';
import { shortLabel, toDay } from '../../domain/dates';
import { openPage } from '../../hooks/nav';
import { useFabScroll } from '../../hooks/useFabScroll';
import { useTheme } from '../../theme/theme';

/** Gold, silver and the two funds: what was put in and what they're worth today. */
export default function AssetsScreen() {
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
    <View style={{ flex: 1, backgroundColor: m3.surface }}>
      <ScrollView {...fabScroll} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        <TopAppBar title="Assets" inset={false} />

        {data.settings.currency !== 'INR' ? (
          <View style={{ paddingHorizontal: 16, gap: 12, alignItems: 'flex-start' }}>
            <AppText variant="bodyLarge" color={m3.onSurfaceVariant}>
              Asset prices are in rupees. Switch your currency to INR to add assets.
            </AppText>
            <Button variant="tonal" label="Change currency" onPress={() => openPage('/currency')} />
          </View>
        ) : null}

        <ValueCard v={totalWorth(data, now)} />

        <View style={{ marginTop: 12 }}>
          {rows.map(({ asset, quote, w }) => (
            <ListItem
              key={asset.id}
              onPress={() => openPage({ pathname: '/asset', params: { id: asset.id } })}
              leading={<EmojiAvatar emoji={asset.emoji} colour={asset.colour} />}
              headline={asset.name}
              supporting={`${w.count === 0 ? '' : w.quantity === 0 ? 'Units pending · ' : `${quantityLabel(asset, w.quantity)} · `}${quote ? `${inr(quote.rate)} a ${asset.per}` : 'No price yet'}`}
              trailing={
                <View style={{ alignItems: 'flex-end' }}>
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

        <AppText variant="bodySmall" color={m3.onSurfaceVariant} style={{ marginTop: 16, marginHorizontal: 16 }}>
          {data.priceError ? 'Couldn’t update prices just now. ' : ''}
          {metalDay ? `Gold is 22K. Gold and silver: Chennai rate, ${metalDay}. ` : ''}
          {fundDay ? `Funds: closing price, ${fundDay}, Direct Growth plans. ` : ''}
          Updated once a day.
        </AppText>
      </ScrollView>
    </View>
  );
}
