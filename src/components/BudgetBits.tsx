import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { budgetPace, type BudgetProgress } from '../lib/calc';
import { currencySymbol, fmtSmart } from '../lib/format';
import { useStore } from '../lib/store';
import type { BudgetType } from '../lib/types';
import { shape } from '../theme/material';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { BigAmount } from './Bits';
import { Icon, type IconName } from './Icon';
import { Card } from './material/Card';
import { ProgressRing } from './material/Progress';

const PERIOD: Record<BudgetType, string> = { 1: 'day', 2: 'week', 3: 'month', 4: 'year' };

/** How a budget is doing, with the colours that say so. */
export function usePace(p: BudgetProgress): { label: string; icon: IconName; color: string; ink: string; container: string } {
  const { m3 } = useTheme();
  const pace = budgetPace(p);
  if (pace === 'over') return { label: 'Over budget', icon: 'alert-circle', color: m3.error, ink: m3.onErrorContainer, container: m3.errorContainer };
  if (pace === 'fast') return { label: 'Spending fast', icon: 'trending-up', color: m3.warning, ink: m3.warning, container: m3.warningContainer };
  return { label: 'On track', icon: 'checkmark-circle', color: m3.primary, ink: m3.success, container: m3.successContainer };
}

/** The status as a small tonal label: an icon and words, never colour alone. */
export function PaceLabel({ p }: { p: BudgetProgress }) {
  const pace = usePace(p);
  return (
    <View style={[styles.pace, { backgroundColor: pace.container }]}>
      <Icon name={pace.icon} size={16} color={pace.ink} />
      <AppText variant="labelMedium" color={pace.ink}>
        {pace.label}
      </AppText>
    </View>
  );
}

/** A budget at a glance: the ring with what's left, how it's going, and what can be spent each day. */
export function BudgetHero({ title, p, type, action, onPress }: { title: string; p: BudgetProgress; type: BudgetType; action?: ReactNode; onPress?: () => void }) {
  const { m3 } = useTheme();
  const settings = useStore((s) => s.settings);
  const pace = usePace(p);
  const symbol = currencySymbol(settings.currency);
  const money = (n: number) => `${symbol}${fmtSmart(Math.abs(n), settings.showCents)}`;
  const used = Math.round(p.fraction * 100);
  const gone = Math.round(p.elapsed * 100);
  return (
    <Card hero hasActions={action !== undefined} onPress={onPress} style={styles.hero} accessibilityLabel={`${title}: ${money(p.left)} ${p.over ? 'over' : 'left'}, ${pace.label}`}>
      <View style={styles.head}>
        <AppText variant="titleMedium" color={m3.onSurface} style={{ flex: 1 }} numberOfLines={1}>
          {title}
        </AppText>
        {action}
      </View>

      <View style={styles.ring}>
        <ProgressRing fraction={p.fraction} color={pace.color} size={208} stroke={16}>
          <BigAmount value={fmtSmart(Math.abs(p.left), settings.showCents)} currency={settings.currency} size={40} />
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant}>
            {p.over ? 'over' : 'left of'} {money(p.amount)}
          </AppText>
        </ProgressRing>
      </View>

      <View style={styles.status}>
        <PaceLabel p={p} />
        <AppText variant="bodyMedium" color={m3.onSurfaceVariant} style={{ textAlign: 'center' }}>
          {used}% used, {gone}% of the {PERIOD[type]} gone
        </AppText>
      </View>

      <View style={[styles.stats, { borderTopColor: m3.outlineVariant }]}>
        <Stat label="Spent" value={money(p.spent)} />
        <Stat label={p.over ? 'Over by' : 'Safe per day'} value={p.over ? money(p.left) : money(p.left / Math.max(p.daysLeft, 1))} />
        <Stat label="Days left" value={String(p.daysLeft)} />
      </View>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { m3 } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <AppText variant="titleMedium" color={m3.onSurface} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {value}
      </AppText>
      <AppText variant="bodySmall" color={m3.onSurfaceVariant}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { marginHorizontal: 16, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  head: { minHeight: 48, flexDirection: 'row', alignItems: 'center' },
  ring: { alignItems: 'center', marginTop: 4 },
  status: { alignItems: 'center', gap: 8, marginTop: 16 },
  pace: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingHorizontal: 10, borderRadius: shape.small },
  stats: { flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
