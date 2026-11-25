import { StyleSheet, View } from 'react-native';
import { Comparison } from '@/features/insights/Comparison';
import { useMoney } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { BigAmount } from '@/ui/BigAmount';
import { ColumnChart } from '@/ui/ColumnChart';
import { IconAvatar, ListItem } from '@/ui/material';
import { PreviewFrame, Surface } from './PreviewFrame';

/** A month compared with the last, its weeks, and something that stands out. */
export function InsightsPreview() {
  const { m3 } = useTheme();
  const { code, brief: money, briefDigits } = useMoney();
  const weeks = [
    { label: '1-7', value: 3150 },
    { label: '8-14', value: 1420 },
    { label: '15-21', value: 2080, current: true },
    { label: '22-28', value: 0, future: true },
    { label: '29-30', value: 0, future: true },
  ];
  return (
    <PreviewFrame>
      <Surface hero>
        <AppText variant="titleSmall" color={m3.onSurfaceVariant}>
          Spent this month
        </AppText>
        <BigAmount digits={briefDigits(6650)} currency={code} size={36} />
        <View style={styles.comparison}>
          <Comparison now={6650} before={7090} income={false} against="this time last month" />
        </View>
        <ColumnChart bars={weeks.map((w) => ({ ...w, name: '' }))} height={96} />
      </Surface>
      <Surface padded={false}>
        <ListItem leading={<IconAvatar icon="calendar" />} headline={`On pace for ${money(9500)}`} supporting={`${money(5500)} inside your budget`} />
      </Surface>
    </PreviewFrame>
  );
}

const styles = StyleSheet.create({
  comparison: { marginTop: 4, marginBottom: 8 },
});
