import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ASSETS, quantityLabel, worth } from '@/domain/assets';
import { shortLabel, toDay } from '@/domain/dates';
import { newestFirst } from '@/domain/entries';
import type { Entry, Owned } from '@/domain/model';
import { inr } from '@/domain/money';
import { EntryRow } from '@/features/entries/EntryRow';
import { useDeleter } from '@/features/entries/useDeleter';
import { openPage } from '@/lib/navigation';
import { messages, store } from '@/state/app';
import { useData, useNow } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { BottomSheet, Button, EmojiAvatar, IconButton, ListItem, Subheader } from '@/ui/material';
import { Page } from '@/ui/Page';
import { AddOwned } from './AddOwned';
import { PriceLine } from './PriceLine';
import { ValueCard } from './ValueCard';

type Item = { key: string; entry: Entry } | { key: string; owned: Owned };
const keyOf = (i: Item) => i.key;
const heading = ({ section }: { section: { title: string } }) => <Subheader text={section.title} />;

function removeOwned(o: Owned) {
  const gone = store.removeOwned(o.id);
  if (gone) messages.show('Removed', { undo: () => store.putBackOwned(gone) });
}

/** One asset: its value, today's price, and everything bought or already owned. */
export function AssetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const asset = ASSETS.find((a) => a.id === id) ?? ASSETS[0];
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useData();
  const now = useNow();
  const today = toDay(now);
  const { deleter, question } = useDeleter();
  const [adding, setAdding] = useState(false);

  const sections = useMemo(() => {
    const bought = newestFirst(data.entries.filter((e) => e.asset === asset.id)).map((entry): Item => ({ key: entry.id, entry }));
    const owned = data.owned
      .filter((o) => o.asset === asset.id)
      .sort((a, b) => b.date - a.date)
      .map((o): Item => ({ key: o.id, owned: o }));
    return [
      { title: 'Purchases', data: bought },
      { title: 'Already owned', data: owned },
    ].filter((s) => s.data.length > 0);
  }, [data.entries, data.owned, asset.id]);

  const row = useCallback(
    ({ item }: { item: Item }) =>
      'entry' in item ? (
        <EntryRow entry={item.entry} deleter={deleter} today={today} />
      ) : (
        <ListItem
          leading={<EmojiAvatar emoji={asset.emoji} colour={asset.colour} />}
          headline={quantityLabel(asset, item.owned.quantity)}
          supporting={item.owned.paid ? `${inr(item.owned.invested)} paid` : `${inr(item.owned.invested)} when added, ${shortLabel(toDay(item.owned.date), today)}`}
          actions={<IconButton icon="trash-outline" label="Remove" onPress={() => removeOwned(item.owned)} />}
          style={styles.owned}
        />
      ),
    [asset, deleter, today],
  );

  const w = worth(data, asset.id, now);
  return (
    <Page title={asset.name} scroll={false}>
      <SectionList
        sections={sections}
        keyExtractor={keyOf}
        renderItem={row}
        renderSectionHeader={heading}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <>
            <ValueCard v={w}>
              <AppText variant="bodyMedium" color={m3.onSurfaceVariant} style={styles.have}>
                You have {quantityLabel(asset, w.quantity)}
                {w.waiting > 0 ? ` and ${inr(w.waiting)} waiting for its day’s price` : ''}
              </AppText>
            </ValueCard>
            <PriceLine asset={asset} />
            {data.settings.currency === 'INR' ? (
              <View style={styles.actions}>
                <Button icon="add" label="Add purchase" onPress={() => openPage({ pathname: '/entry', params: { asset: asset.id } })} />
                <Button variant="tonal" label="I already own some" onPress={() => setAdding(true)} />
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant} style={styles.none}>
            Nothing here yet. Add a purchase, or what you already own.
          </AppText>
        }
      />
      <BottomSheet visible={adding} onClose={() => setAdding(false)} bottomInset={insets.bottom}>
        <AddOwned key={String(adding)} asset={asset} onClose={() => setAdding(false)} />
      </BottomSheet>
      {question}
    </Page>
  );
}

const styles = StyleSheet.create({
  have: { marginTop: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  owned: { paddingRight: 4 },
  none: { margin: 16 },
});
