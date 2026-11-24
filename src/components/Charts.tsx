import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { fmtAxis, niceMax } from '../lib/format';
import { m3Duration, m3Easing, shape } from '../theme/material';
import { motion } from '../theme/motion';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';

// MARK: Bar chart (Insights)

interface BarChartProps {
  values: number[];
  /** Labels under particular bars: { index, text }. */
  labels: { index: number; text: string }[];
  /** Bars after this index are drawn faded (the future). Pass values.length for none. */
  fadeFrom: number;
  average?: number;
  height?: number;
  /** Index of the bar to emphasise in the axis labels. */
  activeIndex?: number;
  /** Grow the bars in with Dime's spring, staggered left to right. */
  animate?: boolean;
  /** Changing this replays the grow-in (a new period, a new filter). */
  replayKey?: string;
}

/** One bar that springs up from zero, after a delay of index * 0.1s, like Dime's AnimatedBarGraph. */
function GrowingBar({ fraction, index, animate, color }: { fraction: number; index: number; animate: boolean; color: string }) {
  const [progress] = useState(() => new Animated.Value(animate ? 0 : 1));
  useEffect(() => {
    if (!animate) return;
    // Bars grow with M3's emphasized-decelerate curve over 500ms, each one a beat after its neighbour.
    const run = Animated.timing(progress, { toValue: 1, delay: index * motion.barStagger, duration: m3Duration.long2, easing: Easing.bezier(...m3Easing.emphasizedDecelerate), useNativeDriver: false });
    run.start();
    return () => run.stop();
  }, [animate, index, progress]);
  return (
    <Animated.View
      style={{
        height: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${fraction * 100}%`] }),
        borderRadius: shape.small,
        backgroundColor: color,
      }}
    />
  );
}

/** Vertical capsule bars with a dashed average line, as in Dime's Insights. */
export function BarChart({ values, labels, fadeFrom, average, height = 220, activeIndex, animate = false, replayKey = '' }: BarChartProps) {
  const { m3 } = useTheme();
  const max = niceMax(Math.max(...values, average ?? 0));
  const n = values.length;
  const gap = n > 12 ? 4 : 8;
  const avgY = average !== undefined && average > 0 ? (1 - Math.min(average / max, 1)) * height : null;
  // M3 bar chart: tonal tracks, primary bars, rounded 8dp ends, secondary text for axes.
  const radius = shape.small;

  return (
    <View>
      <View style={{ flexDirection: 'row', height }}>
        <View style={{ width: 38, justifyContent: 'space-between' }}>
          <AppText variant="labelMedium" color={m3.onSurfaceVariant}>
            {fmtAxis(max)}
          </AppText>
          <AppText variant="labelMedium" color={m3.onSurfaceVariant}>
            0
          </AppText>
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, flexDirection: 'row', gap }}>
            {values.map((v, i) => {
              const faded = i >= fadeFrom;
              const selected = activeIndex === i;
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    borderRadius: radius,
                    backgroundColor: faded ? m3.surfaceContainerLow : m3.surfaceContainerHigh,
                    justifyContent: 'flex-end',
                    overflow: 'hidden',
                  }}
                >
                  {v > 0 ? <GrowingBar key={`${replayKey}-${i}`} fraction={Math.max(Math.min(v / max, 1), 0.04)} index={i} animate={animate} color={activeIndex === undefined || selected ? m3.primary : m3.outline} /> : null}
                </View>
              );
            })}
          </View>

          {avgY !== null ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill]}>
              <View style={{ position: 'absolute', left: 0, right: 0, top: avgY, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: m3.outline }} />
            </View>
          ) : null}
        </View>
      </View>

      {avgY !== null ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: avgY - 12 }}>
          <View style={[styles.avgPill, { backgroundColor: m3.inverseSurface }]}>
            <AppText variant="labelMedium" color={m3.inverseOnSurface}>
              {fmtAxis(average ?? 0)}
            </AppText>
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', marginTop: 8, marginLeft: 38 }}>
        {values.map((_, i) => {
          const label = labels.find((l) => l.index === i);
          return (
            <View key={i} style={{ flex: 1, marginHorizontal: gap / 2, alignItems: 'center', overflow: 'visible' }}>
              {label ? (
                <AppText
                  variant="labelMedium"
                  weight={i === activeIndex ? 'bold' : 'semibold'}
                  color={i >= fadeFrom ? m3.outline : i === activeIndex ? m3.onSurface : m3.onSurfaceVariant}
                  style={{ width: 40, textAlign: 'center' }}
                >
                  {label.text}
                </AppText>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avgPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: shape.small, minWidth: 30, alignItems: 'center' },
});
