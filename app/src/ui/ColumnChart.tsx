import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import type { Column } from '@/domain/insights';
import { useSettings } from '@/state/hooks';
import { m3Duration, shape } from '@/theme/material';
import { arriving } from '@/theme/motion';
import { useTheme, withAlpha } from '@/theme/theme';
import { AppText } from './AppText';
import { Touch } from './Touch';

/** What a chart needs of a column. */
export type Bar = Pick<Column, 'label' | 'name' | 'value'> & Partial<Pick<Column, 'future' | 'current'>>;

interface Props {
  bars: readonly Bar[];
  height?: number;
  /** Where the dashed line goes, and what it says under the chart. */
  average?: number;
  averageLabel?: string;
  picked?: number | null;
  onPick?: (index: number) => void;
  format?: (value: number) => string;
  /** Changing this replays the growing in. */
  replay?: string;
}

/** Room over the tallest column for the picked one's value. */
const HEADROOM = 20;
const LEAST = 6;

/** Columns that read at a glance: one stands out (the current one, or the one picked), and all of a column's height can be tapped. */
export function ColumnChart({ bars, height = 144, average = 0, averageLabel, picked = null, onPick, format, replay = '' }: Props) {
  const { m3 } = useTheme();
  const most = Math.max(average, 1, ...bars.map((b) => b.value));
  const tall = (value: number) => (value / most) * (height - HEADROOM);
  const anyCurrent = bars.some((b) => b.current);

  const column = (bar: Bar, i: number) => {
    const strong = picked === null ? bar.current === true || !anyCurrent : picked === i;
    const inside = (
      <>
        {picked === i && format ? (
          <AppText variant="labelMedium" numberOfLines={1} style={styles.value}>
            {format(bar.value)}
          </AppText>
        ) : null}
        {bar.value > 0 ? (
          <Growing key={`${replay} ${i}`} height={Math.max(LEAST, tall(bar.value))} index={i} color={strong ? m3.primary : withAlpha(m3.primary, 0.36)} />
        ) : (
          <View style={[styles.bar, styles.none, { backgroundColor: bar.future ? m3.surfaceContainerHighest : m3.outlineVariant }]} />
        )}
      </>
    );
    if (!onPick) {
      return (
        <View key={i} style={styles.column}>
          {inside}
        </View>
      );
    }
    return (
      <Touch
        key={i}
        ink="transparent"
        android_ripple={undefined}
        label={format ? `${bar.name}, ${format(bar.value)}` : bar.name}
        accessibilityState={{ selected: picked === i, disabled: bar.future ?? false }}
        disabled={bar.future}
        onPress={() => onPick(i)}
        style={styles.column}
      >
        {inside}
      </Touch>
    );
  };

  return (
    <View>
      <View style={[styles.columns, { height }]}>
        {bars.map(column)}
        {average > 0 && picked === null ? <View pointerEvents="none" style={[styles.average, { bottom: tall(average), borderColor: m3.outline }]} /> : null}
      </View>
      <View style={styles.labels} aria-hidden importantForAccessibility="no-hide-descendants">
        {bars.map((bar, i) => {
          const strong = picked === null ? bar.current : picked === i;
          return (
            <AppText key={i} variant="labelMedium" weight={strong ? 'bold' : 'regular'} color={strong ? m3.onSurface : bar.future ? m3.outline : m3.onSurfaceVariant} numberOfLines={1} maxFontSizeMultiplier={1.2} style={styles.label}>
              {bar.label}
            </AppText>
          );
        })}
      </View>
      {averageLabel ? (
        <View style={styles.legend}>
          <View style={[styles.sample, { borderColor: m3.outline }]} />
          <AppText variant="bodySmall" color={m3.onSurfaceVariant}>
            {averageLabel}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

/** A column that grows up from the line, a little after the one before it. */
function Growing({ height, index, color }: { height: number; index: number; color: string }) {
  const { animated } = useSettings();
  const grown = useSharedValue(animated ? 0 : 1);
  useEffect(() => {
    grown.set(animated ? withDelay(index * 30, withTiming(1, { duration: m3Duration.long2, easing: arriving })) : 1);
  }, [animated, grown, index]);
  const style = useAnimatedStyle(() => ({ height: height * grown.get() }));
  return <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row' },
  column: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 3 },
  bar: { width: '100%', maxWidth: 36, borderRadius: shape.small },
  none: { height: 4 },
  value: { position: 'absolute', top: 0, width: 96, textAlign: 'center' },
  average: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed' },
  labels: { flexDirection: 'row', marginTop: 8 },
  label: { flex: 1, textAlign: 'center', letterSpacing: 0 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  sample: { width: 20, borderTopWidth: 1, borderStyle: 'dashed' },
});
