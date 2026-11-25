import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Progress } from '@/domain/budgets';
import type { BudgetPeriod } from '@/domain/model';
import { useMoney } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { BigAmount } from '@/ui/BigAmount';
import { Card } from '@/ui/material/Card';
import { ProgressRing } from '@/ui/material/Progress';
import { usePace, PaceLabel } from './PaceLabel';

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
        <AppText variant="titleMedium" color={m3.onSurface} style={styles.fill} numberOfLines={1}>
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
        <AppText variant="bodyMedium" color={m3.onSurfaceVariant} style={styles.centred}>
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
    <View style={styles.stat}>
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
  fill: { flex: 1 },
  centred: { textAlign: 'center' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  hero: { marginHorizontal: 16, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  head: { minHeight: 48, flexDirection: 'row', alignItems: 'center' },
  ring: { alignItems: 'center', marginTop: 4 },
  inRing: { alignSelf: 'stretch', paddingHorizontal: 28 },
  status: { alignItems: 'center', gap: 8, marginTop: 16 },
  stats: { flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
