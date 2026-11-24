import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { gainText, inr, ValueCard } from '../components/AssetBits';
import { useDeleteFlow } from '../components/DeleteFlow';
import { BottomSheet, Button, EmojiAvatar, IconButton, ListItem, PillField, Subheader, TopAppBar } from '../components/material';
import { TransactionRow } from '../components/TransactionRow';
import { ASSETS, latestQuote, previousQuote, qtyLabel, valuation } from '../lib/assets';
import { shortDate } from '../lib/dates';
import { Haptics } from '../lib/haptics';
import { goBack } from '../lib/nav';
import { refreshPrices } from '../lib/prices';
import { useStore, useUi } from '../lib/store';
import type { Holding } from '../lib/types';
import { useTheme } from '../theme/theme';

/** One asset: its value, today's price, and everything bought. */
export default function AssetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const asset = ASSETS.find((a) => a.id === id) ?? ASSETS[0];
  const metal = asset.kind === 'metal';
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const transactions = useStore((s) => s.transactions);
  const holdings = useStore((s) => s.holdings);
  const price = useStore((s) => s.prices[asset.id]);
  const currency = useStore((s) => s.settings.currency);
  const addHolding = useStore((s) => s.addHolding);
  const deleteHolding = useStore((s) => s.deleteHolding);
  const restoreHolding = useStore((s) => s.restoreHolding);
  const showToast = useUi((s) => s.showToast);
  const { ask, remove, element } = useDeleteFlow();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [paidText, setPaidText] = useState('');

  const v = valuation(asset.id, transactions, holdings, price);
  const quote = latestQuote(price);
  const before = previousQuote(price);
  const change = quote && before ? quote.rate - before.rate : null;
  const bought = transactions.filter((t) => t.asset === asset.id).sort((a, b) => b.date - a.date);
  const owned = holdings.filter((h) => h.asset === asset.id).sort((a, b) => b.date - a.date);

  const number = (s: string) => parseFloat(s.replace(/,/g, '')) || 0;
  const qty = number(text);
  const paid = metal ? 0 : number(paidText);
  const worth = quote ? Math.round(qty * quote.rate * 100) / 100 : null;
  const hint = qty > 0 && worth !== null && quote ? `Worth ${inr(worth)} at ${inr(quote.rate)} a ${asset.per}${paid > 0 ? `\n${worth >= paid ? 'Gain' : 'Loss'}: ${gainText({ value: worth, invested: paid })}` : ''}` : '';

  const closeSheet = () => {
    setAdding(false);
    setText('');
    setPaidText('');
  };

  const save = () => {
    if (!(qty > 0)) {
      Haptics.warning();
      showToast({ title: metal ? 'Enter the grams' : 'Enter the units', icon: 'alert-circle', tone: 'info' }, 1800);
      return;
    }
    // With what was paid, today's price isn't needed to save; without it, today's value is the starting point.
    if (paid <= 0 && worth === null) {
      Haptics.error();
      showToast({ title: 'Couldn’t get the price. Check your connection and try again.', icon: 'alert-circle', tone: 'error' }, 3000);
      void refreshPrices(true);
      return;
    }
    addHolding(paid > 0 ? { asset: asset.id, qty, invested: paid, paid: true } : { asset: asset.id, qty, invested: worth ?? 0 });
    Haptics.success();
    closeSheet();
  };

  const removeHolding = (h: Holding) => {
    const removed = deleteHolding(h.id);
    if (removed) showToast({ title: 'Removed', icon: 'trash', tone: 'info', onTap: () => restoreHolding(removed) }, 4000);
  };

  return (
    <View style={{ flex: 1, backgroundColor: m3.surface }}>
      <TopAppBar title={asset.name} onBack={() => goBack()} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <ValueCard title="Current value" v={v}>
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant} style={{ marginTop: 12 }}>
            You have {qtyLabel(asset.id, v.qty)}
            {v.pending > 0 ? ` and ${inr(v.pending)} waiting for its day’s price` : ''}
          </AppText>
        </ValueCard>

        <View style={styles.price}>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyMedium" color={m3.onSurfaceVariant}>
              {metal ? `${asset.id === 'gold' ? '22K, ' : ''}Chennai, per gram` : 'Closing price, per unit (Direct Growth)'}
            </AppText>
            <AppText variant="bodySmall" color={m3.onSurfaceVariant}>
              {quote ? shortDate(new Date(`${quote.day}T00:00`)) : 'Not available yet'}
            </AppText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="titleMedium" color={m3.onSurface}>
              {quote ? inr(quote.rate) : '-'}
            </AppText>
            {change !== null ? (
              <AppText variant="bodySmall" color={change > 0 ? m3.success : m3.onSurfaceVariant}>
                {change === 0 ? 'No change' : `${change > 0 ? '+' : '-'}${inr(change)}`}
              </AppText>
            ) : null}
          </View>
        </View>

        {currency === 'INR' ? (
          <View style={styles.actions}>
            <Button icon="add" label="Add purchase" onPress={() => router.push({ pathname: '/transaction', params: { asset: asset.id } })} />
            <Button variant="tonal" label="I already own some" onPress={() => setAdding(true)} />
          </View>
        ) : null}

        {bought.length > 0 ? <Subheader text="Purchases" /> : null}
        {bought.map((t) => (
          <TransactionRow key={t.id} showDate transaction={t} onDelete={ask} onQuickDelete={remove} />
        ))}

        {owned.length > 0 ? <Subheader text="Already owned" /> : null}
        {owned.map((h) => (
          <ListItem
            key={h.id}
            leading={<EmojiAvatar emoji={asset.emoji} colour={asset.colour} />}
            headline={qtyLabel(asset.id, h.qty)}
            supporting={h.paid ? `${inr(h.invested)} paid` : `${inr(h.invested)} when added, ${shortDate(new Date(h.date))}`}
            actions={<IconButton icon="trash-outline" onPress={() => removeHolding(h)} label="Remove" />}
            style={{ paddingRight: 4 }}
          />
        ))}

        {bought.length === 0 && owned.length === 0 ? (
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant} style={{ margin: 16 }}>
            Nothing here yet. Add a purchase, or what you already own.
          </AppText>
        ) : null}
      </ScrollView>

      <BottomSheet visible={adding} onClose={closeSheet} bottomInset={insets.bottom}>
        <AppText variant="titleLarge" color={m3.onSurface}>
          Your {asset.name}
        </AppText>
        <AppText variant="bodyMedium" color={m3.onSurfaceVariant} style={{ marginTop: 4, marginBottom: 20 }}>
          {metal ? 'Valued at today’s price.' : 'Add what you paid to see your gain or loss. Without it, tracking starts from today’s value.'} It isn’t taken from your balance.
        </AppText>
        <View style={{ gap: 16 }}>
          <Field label={metal ? 'Grams' : 'Units'}>
            <PillField placeholder="0" value={text} onChangeText={setText} keyboardType="decimal-pad" maxLength={12} autoFocus returnKeyType="done" accessibilityLabel={metal ? 'Grams' : 'Units'} onSubmitEditing={metal ? save : undefined} />
          </Field>
          {metal ? null : (
            <Field label="Total you paid, in rupees (optional)">
              <PillField placeholder="0" value={paidText} onChangeText={setPaidText} keyboardType="decimal-pad" maxLength={14} returnKeyType="done" accessibilityLabel="Total you paid, in rupees, optional" onSubmitEditing={save} />
            </Field>
          )}
          {hint ? (
            <AppText variant="bodyMedium" color={m3.onSurfaceVariant} style={{ textAlign: 'center' }}>
              {hint}
            </AppText>
          ) : null}
          <Button large label="Add" onPress={save} />
        </View>
      </BottomSheet>
      {element}
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const { m3 } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="labelLarge" color={m3.onSurfaceVariant} style={{ marginLeft: 4 }}>
        {label}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  price: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingTop: 16 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 16 },
});
