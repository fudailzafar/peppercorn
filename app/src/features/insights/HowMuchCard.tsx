import { StyleSheet, View } from 'react-native';
import { against, phrase, type Column, type Compared, type Period } from '@/domain/insights';
import { useMoney } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { BigAmount } from '@/ui/BigAmount';
import { ColumnChart } from '@/ui/ColumnChart';
import { Button, Card } from '@/ui/material';
import { Comparison } from './Comparison';

interface HowMuchProps {
  p: Period;
  bars: readonly Column[];
  picked: number | null;
  sums: Compared;
  income: boolean;
  without: boolean;
  /** A day, or a month of a year. */
  average: number;
  onPick: (index: number) => void;
  chips: React.ReactNode;
}

/** How much, and is that a lot? */
export function HowMuchCard({ p, bars, picked, sums, income, without, average, onPick, chips }: HowMuchProps) {
  const { m3 } = useTheme();
  const { code, brief, briefDigits } = useMoney();
  const bar = picked === null ? undefined : bars[picked];
  const some = sums.now > 0;
  return (
    <Card hero style={styles.card}>
      {chips}
      <AppText variant="titleSmall" color={m3.onSurfaceVariant}>
        {income ? 'Earned' : 'Spent'} {bar ? bar.name : phrase(p)}
        {without ? ', without assets' : ''}
      </AppText>
      <View style={styles.gap}>
        <BigAmount digits={briefDigits(bar ? bar.value : sums.now)} currency={code} size={44} income={income && some} />
      </View>
      <View style={styles.comparison}>
        {!bar ? (
          <Comparison {...sums} income={income} against={against(p)} />
        ) : some ? (
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant}>
            {Math.round((bar.value / sums.now) * 100)}% of what you {income ? 'earned' : 'spent'} {phrase(p)}
          </AppText>
        ) : null}
      </View>
      <ColumnChart
        bars={bars}
        average={some ? (p.span === 'month' ? average * 7 : average) : undefined}
        averageLabel={some && !bar ? `Average ${brief(average)} a ${p.span === 'year' ? 'month' : 'day'}` : undefined}
        picked={picked}
        onPick={onPick}
        format={brief}
        replay={`${p.span} ${p.offset} ${income}`}
      />
      {bar && picked !== null ? (
        <View style={styles.back}>
          <Button variant="text" icon="close" label={`Back to the whole ${p.span}`} onPress={() => onPick(picked)} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 4, padding: 20 },
  gap: { marginTop: 4 },
  comparison: { minHeight: 24, justifyContent: 'center', marginTop: 4, marginBottom: 16 },
  back: { alignItems: 'flex-start', marginTop: 4 },
});
