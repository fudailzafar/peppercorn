import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useSettings } from '@/state/hooks';
import { m3Duration, shape } from '@/theme/material';
import { arriving } from '@/theme/motion';
import { useTheme } from '@/theme/theme';
import { useGrowing } from '@/ui/useGrowing';

const GAP = 4;
/** Less of the track than this isn't drawn. */
const LEAST = 0.001;

const clamp = (n: number) => Math.min(Math.max(n, 0), 1);

/** M3 linear progress: the indicator, a 4dp gap, the track, and a stop dot at the end. Moves without drawing anything again. */
export function LinearProgress({ fraction, color, height = 8, track, stop = true }: { fraction: number; color: string; height?: number; track?: string; /** The dot at the end of the track. */ stop?: boolean }) {
  const { m3 } = useTheme();
  const { animated } = useSettings();
  const goal = clamp(fraction);
  const value = useSharedValue(animated ? 0 : goal);
  useEffect(() => {
    value.set(animated ? withTiming(goal, { duration: m3Duration.long2, easing: arriving }) : goal);
  }, [animated, goal, value]);
  const indicator = useAnimatedStyle(() => {
    const done = value.get();
    return { flexGrow: done, minWidth: done > 0 ? height : 0, marginRight: done > 0 && 1 - done > LEAST ? GAP : 0 };
  });
  const rest = useAnimatedStyle(() => {
    const left = 1 - value.get();
    return { flexGrow: left, minWidth: left > LEAST ? height : 0, opacity: left > LEAST ? 1 : 0 };
  });
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(goal * 100) }} style={[styles.line, { height }]}>
      <Animated.View style={[styles.part, { backgroundColor: color }, indicator]} />
      <Animated.View style={[styles.part, styles.track, { backgroundColor: track ?? m3.secondaryContainer }, rest]}>
        {stop ? <View style={[styles.stop, { marginRight: (height - 4) / 2, backgroundColor: color }]} /> : null}
      </Animated.View>
    </View>
  );
}

/** M3 circular progress with rounded ends and a gap between the indicator and its track. Children sit in the middle. */
export function ProgressRing({ fraction, color, size, stroke, track, children }: { fraction: number; color: string; size: number; stroke: number; track?: string; children?: ReactNode }) {
  const { m3 } = useTheme();
  const value = useGrowing(fraction);
  const r = (size - stroke) / 2;
  const around = 2 * Math.PI * r;
  // Round ends stick out by half the stroke on each side, so the visible gap needs that much more room.
  const gap = stroke + Math.max(4, stroke / 4);
  const full = value > 0.995;
  const active = full ? around : Math.max(value * around - (value > 0 ? gap / 2 : 0), value > 0 ? 0.01 : 0);
  const rest = full ? 0 : value > 0 ? Math.max(around - value * around - gap * 1.5, 0) : around;
  const c = size / 2;
  return (
    <View style={[styles.ring, { width: size, height: size }]}>
      <Svg width={size} height={size} style={[StyleSheet.absoluteFill, styles.turned]}>
        {rest > 0 ? (
          <Circle cx={c} cy={c} r={r} fill="none" stroke={track ?? m3.secondaryContainer} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${rest} ${around}`} strokeDashoffset={value > 0 ? -(around - rest - gap) : 0} />
        ) : null}
        {value > 0 ? <Circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${active} ${around}`} /> : null}
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row' },
  part: { flexBasis: 0, flexShrink: 1, borderRadius: shape.full, overflow: 'hidden' },
  track: { alignItems: 'flex-end', justifyContent: 'center' },
  stop: { width: 4, height: 4, borderRadius: shape.full },
  ring: { alignItems: 'center', justifyContent: 'center' },
  turned: { transform: [{ rotate: '-90deg' }] },
});
