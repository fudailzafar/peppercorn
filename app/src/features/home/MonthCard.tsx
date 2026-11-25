import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { overallOf, progress } from '@/domain/budgets';
import { monthStart, toDay } from '@/domain/dates';
import { since, totals } from '@/domain/entries';
import { openPage } from '@/lib/navigation';
import { useData, useMoney, useNow } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { BigAmount } from '@/ui/BigAmount';
import { Icon } from '@/ui/Icon';
import { Card, LinearProgress } from '@/ui/material';
import { Touch } from '@/ui/Touch';

/** What was spent this month, what came in, and how the overall budget is going. */
export function MonthCard() {
  const { m3 } = useTheme();
  const data = useData();
  const now = useNow();
  const { code, brief, briefDigits } = useMoney();
  const month = useMemo(() => totals(since(data.entries, monthStart(toDay(now), data.settings), now)), [data, now]);
  const overall = overallOf(data);
  const p = overall && progress(data, overall, now);
  const pace = { over: m3.error, fast: m3.warning, onTrack: m3.primary };
  return (
    <Card hero style={styles.card}>
      <View style={styles.month}>
        <AppText variant="titleSmall" color={m3.onSurfaceVariant}>
          Spent this month
        </AppText>
        <View style={styles.amount}>
          <BigAmount digits={briefDigits(month.spent)} currency={code} size={48} />
        </View>
        {data.settings.income ? (
          <View style={styles.stats}>
            <Stat label="Income" value={brief(month.earned)} color={month.earned > 0 ? m3.success : undefined} />
            <Stat label={month.net < 0 ? 'Overspent' : 'Balance'} value={brief(month.net)} />
          </View>
        ) : null}
        <View style={[styles.line, { backgroundColor: m3.outlineVariant }]} />
      </View>
      <Touch
        ink={m3.onSurface}
        label={p ? `${brief(p.left)} ${p.over ? 'over' : 'left in'} your ${PERIOD[overall.period]} budget` : 'Set a monthly budget'}
        onPress={() => (overall ? router.navigate('/budget') : openPage('/edit-budget'))}
        style={styles.budget}
      >
        {p ? (
          <View style={[styles.fill, styles.budgetText]}>
            <AppText variant="bodyMedium" color={p.over ? m3.error : m3.onSurface}>
              {brief(p.left)} {p.over ? 'over' : 'left in'} your {PERIOD[overall.period]} budget
            </AppText>
            <LinearProgress fraction={p.used} color={pace[p.pace]} />
          </View>
        ) : (
          <AppText variant="labelLarge" color={m3.primary} style={styles.fill}>
            Set a monthly budget
          </AppText>
        )}
        <Icon name="chevron-forward" size={20} color={m3.onSurfaceVariant} />
      </Touch>
    </Card>
  );
}

const PERIOD = { day: 'daily', week: 'weekly', month: 'monthly', year: 'yearly' } as const;

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  const { m3 } = useTheme();
  return (
    <View style={styles.fill}>
      <AppText variant="bodySmall" color={m3.onSurfaceVariant}>
        {label}
      </AppText>
      <AppText variant="bodyLarge" weight="medium" color={color} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  card: { marginHorizontal: 16, marginTop: 20 },
  month: { paddingHorizontal: 20, paddingTop: 20 },
  amount: { marginTop: 4 },
  stats: { flexDirection: 'row', gap: 16, marginTop: 12 },
  line: { height: StyleSheet.hairlineWidth, marginTop: 16 },
  budget: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  budgetText: { gap: 8 },
});
