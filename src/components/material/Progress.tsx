import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useStore } from '../../lib/store';
import { useAnimatedNumber } from '../../lib/useAnimatedNumber';
import { shape } from '../../theme/material';
import { useTheme } from '../../theme/theme';

const clamp = (n: number) => Math.min(Math.max(n, 0), 1);

/** M3 linear progress: the indicator, a 4dp gap, the track, and a stop dot at the end. */
export function LinearProgress({ fraction, color, height = 8, track }: { fraction: number; color: string; height?: number; track?: string }) {
  const { m3 } = useTheme();
  const animated = useStore((s) => s.settings.animatedCharts);
  const value = useAnimatedNumber(clamp(fraction), animated);
  const rest = 1 - value;
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(clamp(fraction) * 100) }} style={[styles.line, { height }]}>
      {value > 0 ? <View style={{ flex: value, minWidth: height, borderRadius: shape.full, backgroundColor: color }} /> : null}
      {rest > 0.001 ? (
        <View style={{ flex: rest, minWidth: height, borderRadius: shape.full, backgroundColor: track ?? m3.secondaryContainer, alignItems: 'flex-end', justifyContent: 'center' }}>
          <View style={{ width: 4, height: 4, marginRight: (height - 4) / 2, borderRadius: shape.full, backgroundColor: color }} />
        </View>
      ) : null}
    </View>
  );
}

/** M3 circular progress with rounded ends and a gap between the indicator and its track. Children sit in the middle. */
export function ProgressRing({ fraction, color, size, stroke, track, children }: { fraction: number; color: string; size: number; stroke: number; track?: string; children?: ReactNode }) {
  const { m3 } = useTheme();
  const animated = useStore((s) => s.settings.animatedCharts);
  const value = useAnimatedNumber(clamp(fraction), animated);
  const r = (size - stroke) / 2;
  const around = 2 * Math.PI * r;
  // Round ends stick out by half the stroke on each side, so the visible gap needs that much more room.
  const gap = stroke + Math.max(4, stroke / 4);
  const full = value > 0.995;
  const active = full ? around : Math.max(value * around - (value > 0 ? gap / 2 : 0), value > 0 ? 0.01 : 0);
  const rest = full ? 0 : value > 0 ? Math.max(around - value * around - gap * 1.5, 0) : around;
  const c = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-90deg' }] }]}>
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
  line: { flexDirection: 'row', gap: 4 },
});
