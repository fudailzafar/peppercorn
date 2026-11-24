import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useStore } from '../lib/store';
import { m3Duration, m3Easing, shape } from '../theme/material';
import { motion } from '../theme/motion';
import { useTheme, withAlpha } from '../theme/theme';
import { AppText } from './AppText';

export interface ChartColumn {
  /** Under the bar. */
  label: string;
  /** Spoken to screen readers. */
  name: string;
  value: number;
  future?: boolean;
  /** Stands out when nothing is picked. */
  current?: boolean;
}

/** One bar, growing in from the baseline a beat after its neighbour. */
function Bar({ height, index, animate, color }: { height: number; index: number; animate: boolean; color: string }) {
  const [progress] = useState(() => new Animated.Value(animate ? 0 : 1));
  useEffect(() => {
    if (!animate) return;
    const run = Animated.timing(progress, { toValue: 1, delay: index * motion.barStagger, duration: m3Duration.long2, easing: Easing.bezier(...m3Easing.emphasizedDecelerate), useNativeDriver: false });
    run.start();
    return () => run.stop();
  }, [animate, index, progress]);
  return <Animated.View style={[styles.bar, { height: progress.interpolate({ inputRange: [0, 1], outputRange: [0, height] }), backgroundColor: color }]} />;
}

/**
 * A column chart that reads at a glance: one column stands out (the current one, or the one you pick), the average is a
 * dashed line with its value in words, and the whole height of a column is its touch target.
 */
export function ColumnChart({
  columns,
  height = 144,
  average,
  averageLabel,
  selected,
  onSelect,
  format,
  replayKey = '',
}: {
  columns: ChartColumn[];
  height?: number;
  average?: number;
  averageLabel?: string;
  selected?: number | null;
  onSelect?: (index: number) => void;
  format?: (value: number) => string;
  /** Changing this replays the grow-in. */
  replayKey?: string;
}) {
  const { m3 } = useTheme();
  const animate = useStore((s) => s.settings.animatedCharts);
  const max = Math.max(...columns.map((c) => c.value), average ?? 0, 1);
  const picked = selected ?? null;
  const anyCurrent = columns.some((c) => c.current);
  // Room above the tallest bar for the picked bar's value.
  const top = 20;
  const scale = (v: number) => (v / max) * (height - top);

  return (
    <View>
      <View style={{ height, flexDirection: 'row' }}>
        {average !== undefined && average > 0 && picked === null ? (
          <View pointerEvents="none" style={[styles.average, { bottom: scale(average) }]}>
            <View style={[styles.dash, { borderColor: m3.outline }]} />
          </View>
        ) : null}
        {columns.map((c, i) => {
          const strong = picked === null ? c.current || !anyCurrent : picked === i;
          const color = strong ? m3.primary : withAlpha(m3.primary, 0.36);
          const body = (
            <>
              {picked === i && format ? (
                <AppText variant="labelMedium" numberOfLines={1} style={styles.value}>
                  {format(c.value)}
                </AppText>
              ) : null}
              {c.value > 0 ? (
                <Bar key={`${replayKey}-${i}`} height={Math.max(scale(c.value), 6)} index={i} animate={animate} color={color} />
              ) : (
                <View style={[styles.bar, { height: 4, backgroundColor: c.future ? m3.surfaceContainerHighest : m3.outlineVariant }]} />
              )}
            </>
          );
          return onSelect ? (
            <Pressable
              key={i}
              onPress={() => onSelect(i)}
              disabled={c.future}
              accessibilityRole="button"
              accessibilityState={{ selected: picked === i, disabled: c.future }}
              accessibilityLabel={`${c.name}${format ? `, ${format(c.value)}` : ''}`}
              style={styles.column}
            >
              {body}
            </Pressable>
          ) : (
            <View key={i} style={styles.column}>
              {body}
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        {columns.map((c, i) => {
          const strong = picked === null ? c.current : picked === i;
          return (
            <AppText key={i} variant="labelMedium" weight={strong ? 'bold' : 'regular'} color={strong ? m3.onSurface : c.future ? m3.outline : m3.onSurfaceVariant} numberOfLines={1} style={styles.label}>
              {c.label}
            </AppText>
          );
        })}
      </View>
      {averageLabel ? (
        <View style={styles.legend}>
          <View style={[styles.legendDash, { borderColor: m3.outline }]} />
          <AppText variant="bodySmall" color={m3.onSurfaceVariant}>
            {averageLabel}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 3 },
  bar: { width: '100%', maxWidth: 36, borderRadius: shape.small },
  value: { position: 'absolute', top: 0, width: 88, textAlign: 'center' },
  average: { position: 'absolute', left: 0, right: 0, zIndex: 1 },
  dash: { borderTopWidth: 1, borderStyle: 'dashed' },
  label: { flex: 1, textAlign: 'center', letterSpacing: 0 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  legendDash: { width: 20, borderTopWidth: 1, borderStyle: 'dashed' },
});
