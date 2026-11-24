import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { assetById } from '../lib/assets';
import { currencySymbol } from '../lib/format';
import { useStore } from '../lib/store';
import { shape } from '../theme/material';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { inr } from './AssetBits';
import { BigAmount } from './Bits';
import { BarChart } from './Charts';
import { Button, Card, EmojiAvatar, FilterChip, LinearProgress, ListItem, ProgressRing } from './material';

/*
 * The onboarding pictures are the app's own components with sample numbers, so they always look like the real thing.
 * They are decoration: not touchable, and hidden from screen readers (the page's text says what they show).
 */

const nothing = () => {};

function Frame({ children }: { children: ReactNode }) {
  const { m3 } = useTheme();
  // On a short screen the picture is scaled down to fit rather than clipped.
  const [room, setRoom] = useState(0);
  const [needed, setNeeded] = useState(0);
  const scale = room > 0 && needed > 0 ? Math.min(1, (room - 32) / needed) : 1;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      onLayout={(e) => setRoom(e.nativeEvent.layout.height)}
      style={[styles.frame, { backgroundColor: m3.primaryContainer }]}
    >
      <View onLayout={(e) => setNeeded(e.nativeEvent.layout.height)} style={[styles.inner, { transform: [{ scale }] }]}>
        {children}
      </View>
    </View>
  );
}

function Surface({ children, padded = true }: { children: ReactNode; padded?: boolean }) {
  const { m3 } = useTheme();
  return <Card style={{ backgroundColor: m3.surface, padding: padded ? 16 : 0 }}>{children}</Card>;
}

/** An amount, its category, and the saved entry. */
export function AddPreview() {
  const currency = useStore((s) => s.settings.currency);
  return (
    <Frame>
      <Surface>
        <View style={{ alignItems: 'center', gap: 16 }}>
          <BigAmount value="180" currency={currency} size={48} />
          <View style={styles.chips}>
            <FilterChip emoji="🍔" label="Food" selected onPress={nothing} />
            <FilterChip emoji="🚌" label="Transport" selected={false} onPress={nothing} />
          </View>
          <Button label="Save" icon="checkmark" onPress={nothing} style={{ alignSelf: 'stretch' }} />
        </View>
      </Surface>
      <Surface padded={false}>
        <ListItem headline="Lunch" supporting="Today, 1:05 PM" leading={<EmojiAvatar emoji="🍔" colour="#FE724E" />} trailing={<AppText variant="titleMedium">-{currencySymbol(currency)}180</AppText>} />
      </Surface>
    </Frame>
  );
}

/** An overall budget and two category budgets with their pace. */
export function BudgetPreview() {
  const { m3 } = useTheme();
  const symbol = currencySymbol(useStore((s) => s.settings.currency));
  const small = (emoji: string, name: string, colour: string, percent: number, label: string, bg: string, ink: string) => (
    <View style={{ flex: 1 }}>
      <Surface>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <EmojiAvatar emoji={emoji} colour={colour} size={32} />
          <AppText variant="titleSmall" numberOfLines={1} style={{ flex: 1 }}>
            {name}
          </AppText>
        </View>
        <View style={[styles.status, { backgroundColor: bg }]}>
          <AppText variant="labelSmall" color={ink} numberOfLines={1}>
            {label}
          </AppText>
        </View>
        <LinearProgress fraction={percent / 100} color={ink === m3.warning ? m3.warning : m3.primary} />
      </Surface>
    </View>
  );
  return (
    <Frame>
      <Surface>
        <View style={{ alignItems: 'center' }}>
          <ProgressRing fraction={0.44} color={m3.primary} size={148} stroke={12}>
            <AppText variant="headlineSmall">{symbol}8,400</AppText>
            <AppText variant="bodySmall" color={m3.onSurfaceVariant}>
              left of {symbol}15,000
            </AppText>
          </ProgressRing>
        </View>
      </Surface>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {small('🍔', 'Food', '#FE724E', 48, 'On track', m3.successContainer, m3.success)}
        {small('🛍️', 'Shopping', '#FF78A3', 82, 'Spending fast', m3.warningContainer, m3.warning)}
      </View>
    </Frame>
  );
}

/** A week of spending with the biggest category. */
export function InsightsPreview() {
  const { m3 } = useTheme();
  const symbol = currencySymbol(useStore((s) => s.settings.currency));
  const values = [320, 180, 540, 260, 410, 720, 380];
  return (
    <Frame>
      <Surface>
        <AppText variant="titleSmall" color={m3.onSurfaceVariant}>
          Spent this week
        </AppText>
        <AppText variant="headlineMedium" style={{ marginBottom: 12 }}>
          {symbol}2,810
        </AppText>
        <BarChart values={values} labels={['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((text, index) => ({ index, text }))} fadeFrom={values.length} height={96} />
      </Surface>
      <Surface padded={false}>
        <ListItem headline="Food" leading={<EmojiAvatar emoji="🍔" colour="#FE724E" />} trailingText={`${symbol}1,240`} trailing={<AppText variant="labelLarge">44%</AppText>} />
      </Surface>
    </Frame>
  );
}

/** Gold, silver and a fund with what they're worth. */
export function AssetsPreview() {
  const { m3 } = useTheme();
  const row = (id: 'gold' | 'silver' | 'tata', qty: string, value: number, gain: string) => {
    const a = assetById(id);
    return (
      <ListItem
        headline={a.name}
        supporting={qty}
        leading={<EmojiAvatar emoji={a.emoji} colour={a.colour} />}
        trailing={
          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="titleSmall">{inr(value).replace('.00', '')}</AppText>
            <AppText variant="bodySmall" color={gain.startsWith('+') ? m3.success : m3.onSurfaceVariant}>
              {gain}
            </AppText>
          </View>
        }
      />
    );
  };
  return (
    <Frame>
      <Surface padded={false}>
        {row('gold', '10 g, 22K', 117150, '+4.2%')}
        {row('silver', '250 g', 43750, '-1.8%')}
        {row('tata', '100 units', 41738, '+6.1%')}
      </Surface>
    </Frame>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, borderRadius: shape.extraLarge, overflow: 'hidden', justifyContent: 'center', paddingHorizontal: 20 },
  inner: { gap: 12, width: '100%', maxWidth: 340, alignSelf: 'center' },
  chips: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  status: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: shape.extraSmall, marginTop: 12, marginBottom: 4 },
});
