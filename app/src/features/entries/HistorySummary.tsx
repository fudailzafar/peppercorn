import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { toDay } from '@/domain/dates';
import { since, spanStart, totals } from '@/domain/entries';
import type { HistoryTotal } from '@/domain/model';
import { labelIn, SPANS, TOTALS } from '@/lib/labels';
import { store } from '@/state/app';
import { useData, useMoney, useNow } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { BigAmount } from '@/ui/BigAmount';
import { Icon, type IconName } from '@/ui/Icon';
import { AssistChip, Card } from '@/ui/material';
import { Menu } from '@/ui/Menu';

const ICON: Record<HistoryTotal, IconName> = { spent: 'remove', earned: 'add', net: 'swap-vertical' };

/** The total at the top: what it counts, and over how long. */
export function HistorySummary() {
  const { m3 } = useTheme();
  const data = useData();
  const now = useNow();
  const money = useMoney();
  const { historySpan: span, historyTotal: total, signs, currency } = data.settings;
  const sums = useMemo(() => totals(since(data.entries, spanStart(span, toDay(now), data.settings), now)), [data, span, now]);
  const value = total === 'spent' ? -sums.spent : sums[total];
  const down = <Icon name="chevron-down" size={18} color={m3.onSurfaceVariant} />;
  return (
    <Card hero style={styles.summary}>
      <View style={styles.chips}>
        <Menu items={TOTALS.map(([key, label]) => ({ label, icon: ICON[key], selected: key === total, onPress: () => store.set({ historyTotal: key }) }))}>
          {(open) => <AssistChip label={labelIn(TOTALS, total)} accessibilityLabel={`Total shown: ${labelIn(TOTALS, total)}`} trailing={down} onPress={open} />}
        </Menu>
        <Menu items={SPANS.map(([key, label]) => ({ label, selected: key === span, onPress: () => store.set({ historySpan: key }) }))}>
          {(open) => <AssistChip label={labelIn(SPANS, span)} accessibilityLabel={`Time frame: ${labelIn(SPANS, span)}`} trailing={down} onPress={open} />}
        </Menu>
      </View>
      <View style={styles.total}>
        <BigAmount digits={money.briefDigits(value)} currency={currency} sign={signs ? (value < 0 || total === 'spent' ? '-' : '+') : ''} size={57} />
      </View>
      {total === 'net' && sums.earned > 0 && sums.spent > 0 ? (
        <View style={styles.sides}>
          <AppText variant="labelLarge" color={m3.success}>
            +{money.brief(sums.earned)}
          </AppText>
          <AppText variant="labelLarge" color={m3.onSurfaceVariant}>
            -{money.brief(sums.spent)}
          </AppText>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  summary: { marginHorizontal: 16, marginVertical: 8, padding: 20 },
  chips: { flexDirection: 'row', justifyContent: 'space-between' },
  total: { marginTop: 12 },
  sides: { flexDirection: 'row', gap: 16, marginTop: 12 },
});
