import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMoney } from '../data/hooks';
import type { Progress } from '../domain/budgets';
import type { BudgetPeriod } from '../domain/model';
import { shape } from '../theme/material';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { BigAmount } from './BigAmount';
import { Icon, type IconName } from './Icon';
import { Card } from './material/Card';
import { ProgressRing } from './material/Progress';

/** How a budget is doing, with the colours that say so. */
export function usePace({ pace }: Pick<Progress, 'pace'>): { label: string; icon: IconName; color: string; ink: string; container: string } {
  const { m3 } = useTheme();
  if (pace === 'over') return { label: 'Over budget', icon: 'alert-circle', color: m3.error, ink: m3.onErrorContainer, container: m3.errorContainer };
  if (pace === 'fast') return { label: 'Spending fast', icon: 'trending-up', color: m3.warning, ink: m3.warning, container: m3.warningContainer };
  return { label: 'On track', icon: 'checkmark-circle', color: m3.primary, ink: m3.success, container: m3.successContainer };
}

/** The status as a small tonal label: an icon and words, never colour alone. */
export function PaceLabel({ p }: { p: Pick<Progress, 'pace'> }) {
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
export function BudgetHero({ title, p, period, action, onPress }: { title: string; p: Progress; period: BudgetPeriod; action?: ReactNode; onPress?: () => void }) {
  const { m3 } = useTheme();
  const { code, brief, briefDigits } = useMoney();
  const pace = usePace(p);
  const used = Math.round(p.used * 100);
  const gone = Math.round(p.elapsed * 100);
  return (
    <Card hero hasActions={action !== undefined} onPress={onPress} style={styles.hero} accessibilityLabel={`${title}: ${brief(p.left)} ${p.over ? 'over' : 'left'}, ${pace.label}`}>
      <View style={styles.head}>
        <AppText variant="titleMedium" color={m3.onSurface} style={{ flex: 1 }} numberOfLines={1}>
          {title}
        </AppText>
        {action}
      </View>

      <View style={styles.ring}>
        <ProgressRing fraction={p.used} color={pace.color} size={208} stroke={16}>
          <View style={styles.inRing}>
            <BigAmount digits={briefDigits(p.left)} currency={code} size={40} centred />
          </View>
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant}>
            {p.over ? 'over' : 'left of'} {brief(p.limit)}
          </AppText>
        </ProgressRing>
      </View>

      <View style={styles.status}>
        <PaceLabel p={p} />
        <AppText variant="bodyMedium" color={m3.onSurfaceVariant} style={{ textAlign: 'center' }}>
          {used}% used, {gone}% of the {period} gone
        </AppText>
      </View>

      <View style={[styles.stats, { borderTopColor: m3.outlineVariant }]}>
        <Stat label="Spent" value={brief(p.spent)} />
        <Stat label={p.over ? 'Over by' : 'Safe per day'} value={brief(p.over ? p.left : p.safePerDay)} />
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
  inRing: { alignSelf: 'stretch', paddingHorizontal: 28 },
  status: { alignItems: 'center', gap: 8, marginTop: 16 },
  pace: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingHorizontal: 10, borderRadius: shape.small },
  stats: { flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
