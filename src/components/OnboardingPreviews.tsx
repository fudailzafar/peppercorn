import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { assetById } from '../lib/assets';
import type { BudgetProgress } from '../lib/calc';
import { fmtSmart } from '../lib/format';
import { useStore } from '../lib/store';
import { shape } from '../theme/material';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { gainText, inr } from './AssetBits';
import { BigAmount } from './Bits';
import { PaceLabel, usePace } from './BudgetBits';
import { ColumnChart } from './Charts';
import { Icon } from './Icon';
import { Comparison, useMoney } from './InsightBits';
import { Card, EmojiAvatar, FilterChip, IconAvatar, LinearProgress, ListItem, ProgressRing, SegmentedButton } from './material';

/*
 * The onboarding pictures are the app's own components with sample numbers, so they always look like the real thing.
 * They are decoration: not touchable, and hidden from screen readers (the page's text says what they show).
 */

const nothing = () => {};

function Frame({ children }: { children: ReactNode }) {
  const { m3, dark } = useTheme();
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
      style={[styles.frame, { backgroundColor: dark ? m3.surfaceContainerHigh : m3.primaryContainer }]}
    >
      <View onLayout={(e) => setNeeded(e.nativeEvent.layout.height)} style={[styles.inner, { transform: [{ scale }] }]}>
        {children}
      </View>
    </View>
  );
}

function Surface({ children, hero = false, padded = true }: { children: ReactNode; hero?: boolean; padded?: boolean }) {
  const { m3 } = useTheme();
  return (
    <Card hero={hero} style={{ backgroundColor: m3.surface, padding: padded ? 16 : 0 }}>
      {children}
    </Card>
  );
}

/** The entry screen: type, amount, note and category, and the message after saving. */
export function AddPreview() {
  const { m3 } = useTheme();
  const currency = useStore((s) => s.settings.currency);
  return (
    <Frame>
      <Surface hero>
        <View style={{ gap: 16 }}>
          <SegmentedButton fullWidth options={['Expense', 'Income']} index={0} onChange={nothing} />
          <BigAmount value="180" currency={currency} size={52} />
          <View style={[styles.note, { backgroundColor: m3.surfaceContainerHigh }]}>
            <Icon name="create-outline" size={20} color={m3.onSurfaceVariant} />
            <AppText variant="bodyLarge">Lunch with Sara</AppText>
          </View>
          <View style={styles.chips}>
            <FilterChip emoji="🍔" label="Food" selected onPress={nothing} />
            <FilterChip emoji="🚌" label="Transport" selected={false} onPress={nothing} />
          </View>
        </View>
      </Surface>
      <View style={[styles.snackbar, { backgroundColor: m3.inverseSurface }]}>
        <AppText variant="bodyMedium" color={m3.inverseOnSurface} style={{ flex: 1 }}>
          Expense saved
        </AppText>
        <AppText variant="labelLarge" color={m3.inversePrimary}>
          Undo
        </AppText>
      </View>
    </Frame>
  );
}

const sample = (amount: number, spent: number, elapsed: number, daysLeft: number): BudgetProgress => ({ amount, spent, left: amount - spent, fraction: spent / amount, elapsed, daysLeft, over: spent > amount });

/** The budget ring with its status and safe amount per day, and a category that needs a look. */
export function BudgetPreview() {
  const { m3 } = useTheme();
  const money = useMoney();
  const settings = useStore((s) => s.settings);
  const all = sample(15000, 6600, 0.6, 12);
  const food = sample(3000, 2460, 0.6, 12);
  const pace = usePace(all);
  const fast = usePace(food);
  return (
    <Frame>
      <Surface hero>
        <View style={{ alignItems: 'center', gap: 12 }}>
          <ProgressRing fraction={all.fraction} color={pace.color} size={152} stroke={13}>
            <BigAmount value={fmtSmart(all.left, settings.showCents)} currency={settings.currency} size={30} />
            <AppText variant="bodySmall" color={m3.onSurfaceVariant}>
              left of {money(all.amount)}
            </AppText>
          </ProgressRing>
          <PaceLabel p={all} />
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant}>
            {money(all.left / all.daysLeft)} safe per day, {all.daysLeft} days left
          </AppText>
        </View>
      </Surface>
      <Surface>
        <View style={styles.row}>
          <EmojiAvatar emoji="🍔" colour="#FF78A3" />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={[styles.row, { gap: 8 }]}>
              <AppText variant="titleMedium" numberOfLines={1} style={{ flex: 1 }}>
                Food
              </AppText>
              <PaceLabel p={food} />
            </View>
            <LinearProgress fraction={food.fraction} color={fast.color} />
          </View>
        </View>
      </Surface>
    </Frame>
  );
}

/** A month compared with the last, its weeks, and something that stands out. */
export function InsightsPreview() {
  const { m3 } = useTheme();
  const money = useMoney();
  const settings = useStore((s) => s.settings);
  const weeks = [
    { label: '1-7', value: 3150 },
    { label: '8-14', value: 1420 },
    { label: '15-21', value: 2080, current: true },
    { label: '22-28', value: 0, future: true },
    { label: '29-30', value: 0, future: true },
  ];
  return (
    <Frame>
      <Surface hero>
        <AppText variant="titleSmall" color={m3.onSurfaceVariant}>
          Spent this month
        </AppText>
        <BigAmount value={fmtSmart(6650, settings.showCents)} currency={settings.currency} size={36} align="flex-start" />
        <View style={{ marginTop: 4, marginBottom: 8 }}>
          <Comparison now={6650} before={7090} income={false} against="this time last month" />
        </View>
        <ColumnChart columns={weeks.map((w) => ({ ...w, name: '' }))} height={96} />
      </Surface>
      <Surface padded={false}>
        <ListItem leading={<IconAvatar icon="calendar" />} headline={`On pace for ${money(9500)}`} supporting={`${money(5500)} inside your budget`} />
      </Surface>
    </Frame>
  );
}

/** What gold, silver and a fund are worth together, and each on its own. */
export function AssetsPreview() {
  const { m3 } = useTheme();
  const settings = useStore((s) => s.settings);
  const rows = [
    { id: 'gold', qty: '10 g, 22K', invested: 112430, value: 117150 },
    { id: 'silver', qty: '250 g', invested: 44550, value: 43750 },
    { id: 'tata', qty: '100 units', invested: 39340, value: 41738 },
  ] as const;
  const invested = rows.reduce((n, r) => n + r.invested, 0);
  const value = rows.reduce((n, r) => n + r.value, 0);
  return (
    <Frame>
      <Surface hero>
        <AppText variant="titleSmall" color={m3.onSurfaceVariant}>
          Current value
        </AppText>
        <BigAmount value={fmtSmart(value, settings.showCents)} currency="INR" size={36} align="flex-start" />
        <AppText variant="bodyMedium" color={m3.success} style={{ marginTop: 4 }}>
          {gainText({ value, invested }).replace('.00', '')}
        </AppText>
      </Surface>
      <Surface padded={false}>
        {rows.map((r) => {
          const a = assetById(r.id);
          const percent = ((r.value - r.invested) / r.invested) * 100;
          return (
            <ListItem
              key={r.id}
              headline={a.name}
              supporting={r.qty}
              leading={<EmojiAvatar emoji={a.emoji} colour={a.colour} />}
              trailing={
                <View style={{ alignItems: 'flex-end' }}>
                  <AppText variant="titleSmall">{inr(r.value).replace('.00', '')}</AppText>
                  <AppText variant="bodySmall" color={percent > 0 ? m3.success : m3.onSurfaceVariant}>
                    {percent > 0 ? '+' : '-'}
                    {Math.abs(percent).toFixed(1)}%
                  </AppText>
                </View>
              }
            />
          );
        })}
      </Surface>
    </Frame>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, borderRadius: shape.extraLarge, overflow: 'hidden', justifyContent: 'center', paddingHorizontal: 20 },
  inner: { gap: 12, width: '100%', maxWidth: 340, alignSelf: 'center' },
  note: { height: 48, borderRadius: shape.full, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20 },
  chips: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  snackbar: { minHeight: 48, borderRadius: shape.extraSmall, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
});
