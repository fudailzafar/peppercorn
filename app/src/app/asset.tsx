import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { inr, ValueCard } from '../components/AssetBits';
import { EntryRow } from '../components/EntryRow';
import { BottomSheet, Button, EmojiAvatar, IconButton, ListItem, PillField, Subheader } from '../components/material';
import { Page } from '../components/Page';
import { messages, prices, store } from '../data/app';
import { useData, useNow } from '../data/hooks';
import { ASSETS, gainText, latest, previous, quantityLabel, quantityTyped, worth, type Asset } from '../domain/assets';
import { shortLabel, toDay } from '../domain/dates';
import { newestFirst } from '../domain/entries';
import type { Entry, Owned } from '../domain/model';
import { exact } from '../domain/money';
import { haptics } from '../hooks/haptics';
import { openPage } from '../hooks/nav';
import { useDeleter } from '../hooks/useDeleter';
import { useTheme } from '../theme/theme';

type Item = { key: string; entry: Entry } | { key: string; owned: Owned };
const keyOf = (i: Item) => i.key;
const heading = ({ section }: { section: { title: string } }) => <Subheader text={section.title} />;

function removeOwned(o: Owned) {
  const gone = store.removeOwned(o.id);
  if (gone) messages.show('Removed', { undo: () => store.putBackOwned(gone) });
}

/** One asset: its value, today's price, and everything bought or already owned. */
export default function AssetPage() {
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

/** Today's price, and how it moved. */
function PriceLine({ asset }: { asset: Asset }) {
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

/** Something already owned: it counts toward the asset's value, not as spending. */
function AddOwned({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const { m3 } = useTheme();
  const quote = latest(useData().prices[asset.id]);
  const [text, setText] = useState('');
  const [paidText, setPaidText] = useState('');
  // Said here: a message at the bottom of the screen would be behind this sheet.
  const [problem, setProblem] = useState('');
  const done = useRef(false);

  const quantity = quantityTyped(text) ?? 0;
  const paid = asset.metal ? 0 : (quantityTyped(paidText) ?? 0);
  const value = quote ? exact(quantity * quote.rate) : null;

  const missing = (): string => {
    if ([text, paidText].some((t) => t.trim() !== '' && quantityTyped(t) === null)) return 'Check the number';
    if (quantity <= 0) return asset.metal ? 'Enter the grams' : 'Enter the units';
    // With what was paid, today's price isn't needed; without it, today's value is the starting point.
    if (paid > 0 || value !== null) return '';
    void prices.refresh(true);
    return 'Couldn’t get the price. Check your connection and try again.';
  };

  const add = () => {
    if (done.current) return;
    const why = missing();
    setProblem(why);
    if (why) return haptics.no();
    done.current = true;
    store.addOwned({ asset: asset.id, quantity, invested: paid > 0 ? paid : (value ?? 0), paid: paid > 0 });
    haptics.done();
    onClose();
  };

  const typed = (set: (t: string) => void) => (t: string) => {
    set(t);
    setProblem('');
  };

  const about = asset.metal ? 'Valued at today’s price.' : 'Add what you paid to see your gain or loss. Without it, tracking starts from today’s value.';
  const gain = value !== null && paid > 0 ? `\n${value >= paid ? 'Gain' : 'Loss'}: ${gainText({ value, invested: paid })}` : '';
  return (
    <View style={styles.sheet}>
      <View style={styles.sheetTitle}>
        <AppText variant="titleLarge" accessibilityRole="header">
          Your {asset.name}
        </AppText>
        <AppText variant="bodyMedium" color={m3.onSurfaceVariant}>
          {about} It isn’t taken from your balance.
        </AppText>
      </View>
      <Labelled label={asset.metal ? 'Grams' : 'Units'}>
        <PillField placeholder="0" accessibilityLabel={asset.metal ? 'Grams' : 'Units'} value={text} onChangeText={typed(setText)} keyboardType="decimal-pad" maxLength={12} autoFocus returnKeyType="done" onSubmitEditing={asset.metal ? add : undefined} />
      </Labelled>
      {asset.metal ? null : (
        <Labelled label="Total you paid, in rupees (optional)">
          <PillField placeholder="0" accessibilityLabel="Total you paid, in rupees, optional" value={paidText} onChangeText={typed(setPaidText)} keyboardType="decimal-pad" maxLength={14} returnKeyType="done" onSubmitEditing={add} />
        </Labelled>
      )}
      {quote && value !== null && quantity > 0 ? (
        <AppText variant="bodyMedium" color={m3.onSurfaceVariant} style={styles.centre}>
          Worth {inr(value)} at {inr(quote.rate)} a {asset.per}
          {gain}
        </AppText>
      ) : null}
      {problem ? (
        <AppText variant="bodyMedium" color={m3.error} accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.centre}>
          {problem}
        </AppText>
      ) : null}
      <Button large label="Add" onPress={add} />
    </View>
  );
}

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  const { m3 } = useTheme();
  return (
    <View style={styles.labelled}>
      <AppText variant="labelLarge" color={m3.onSurfaceVariant} style={styles.label}>
        {label}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  right: { alignItems: 'flex-end' },
  have: { marginTop: 12 },
  price: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingTop: 16 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  owned: { paddingRight: 4 },
  none: { margin: 16 },
  sheet: { gap: 16 },
  sheetTitle: { gap: 4, marginBottom: 4 },
  labelled: { gap: 6 },
  label: { marginLeft: 4 },
  centre: { textAlign: 'center' },
});
