import { useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { gainText, latest, quantityTyped, type Asset } from '@/domain/assets';
import { inr, exact } from '@/domain/money';
import { haptics } from '@/lib/haptics';
import { prices, store } from '@/state/app';
import { useData } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { Button, PillField } from '@/ui/material';

/** Something already owned: it counts toward the asset's value, not as spending. */
export function AddOwned({ asset, onClose }: { asset: Asset; onClose: () => void }) {
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
  sheet: { gap: 16 },
  sheetTitle: { gap: 4, marginBottom: 4 },
  labelled: { gap: 6 },
  label: { marginLeft: 4 },
  centre: { textAlign: 'center' },
});
