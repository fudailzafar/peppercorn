import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, Text as SvgText, TextPath } from 'react-native-svg';
import { fmtAxis, niceMax } from '../lib/format';
import { useStore } from '../lib/store';
import { useAnimatedNumber } from '../lib/useAnimatedNumber';
import { motion } from '../theme/motion';
import { useTheme, withAlpha } from '../theme/theme';
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
    const run = Animated.spring(progress, { toValue: 1, delay: index * motion.barStagger, useNativeDriver: false, ...motion.chartSpring });
    run.start();
    return () => run.stop();
  }, [animate, index, progress]);
  return (
    <Animated.View
      style={{
        height: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${fraction * 100}%`] }),
        borderRadius: 100,
        backgroundColor: color,
      }}
    />
  );
}

/** Vertical capsule bars with a dashed average line, as in Dime's Insights. */
export function BarChart({ values, labels, fadeFrom, average, height = 220, activeIndex, animate = false, replayKey = '' }: BarChartProps) {
  const { c } = useTheme();
  const max = niceMax(Math.max(...values, average ?? 0));
  const n = values.length;
  const gap = n > 12 ? 4 : 10;
  const avgY = average !== undefined && average > 0 ? (1 - Math.min(average / max, 1)) * height : null;

  return (
    <View>
      <View style={{ flexDirection: 'row', height }}>
        <View style={{ width: 38, justifyContent: 'space-between' }}>
          <AppText size={14} weight="medium" color="SubtitleText">
            {fmtAxis(max)}
          </AppText>
          <AppText size={14} weight="medium" color="SubtitleText">
            0
          </AppText>
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, flexDirection: 'row', gap }}>
            {values.map((v, i) => {
              const faded = i >= fadeFrom;
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    borderRadius: 100,
                    backgroundColor: withAlpha(c.SecondaryBackground, faded ? 0.5 : 1),
                    justifyContent: 'flex-end',
                    overflow: 'hidden',
                  }}
                >
                  {v > 0 ? <GrowingBar key={`${replayKey}-${i}`} fraction={Math.max(Math.min(v / max, 1), 0.04)} index={i} animate={animate} color={c.DarkIcon} /> : null}
                </View>
              );
            })}
          </View>

          {avgY !== null ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill]}>
              <View style={{ position: 'absolute', left: 0, right: 0, top: avgY, borderTopWidth: 2, borderStyle: 'dashed', borderColor: c.GreyIcon }} />
            </View>
          ) : null}
        </View>
      </View>

      {avgY !== null ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: avgY - 15 }}>
          <View style={[styles.avgPill, { backgroundColor: c.GreyIcon }]}>
            <AppText size={15} weight="bold" color="DarkIcon">
              {fmtAxis(average ?? 0)}
            </AppText>
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', marginTop: 10, marginLeft: 38 }}>
        {values.map((_, i) => {
          const label = labels.find((l) => l.index === i);
          return (
            <View key={i} style={{ flex: 1, marginHorizontal: gap / 2, alignItems: 'center', overflow: 'visible' }}>
              {label ? (
                <AppText
                  size={17}
                  weight="semibold"
                  color={i >= fadeFrom ? 'EvenLighterText' : i === activeIndex ? 'DarkIcon' : 'SubtitleText'}
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

// MARK: Overall budget gauge

interface GaugeProps {
  /** 0-1 of the budget spent. */
  fraction: number;
  /** 0-1 of the period elapsed (the pace marker). */
  elapsed: number;
  caption: string;
  size?: number;
}

const polar = (cx: number, cy: number, r: number, deg: number) => ({
  x: cx + r * Math.cos((deg * Math.PI) / 180),
  y: cy + r * Math.sin((deg * Math.PI) / 180),
});

/** Semicircle donut with curved caption and a pace marker. */
export function Gauge({ fraction, elapsed, caption, size = 330 }: GaugeProps) {
  const { c } = useTheme();
  const stroke = 34;
  const cx = size / 2;
  const cy = size / 2 + 6;
  const r = size / 2 - stroke / 2 - 26;
  const arc = (from: number, to: number, radius = r) => {
    const a = polar(cx, cy, radius, from);
    const b = polar(cx, cy, radius, to);
    return `M${a.x} ${a.y} A${radius} ${radius} 0 ${to - from > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
  };

  const animated = useStore((st) => st.settings.animatedCharts);
  const drawn = useAnimatedNumber(Math.min(Math.max(fraction, 0), 1), animated);
  const spentEnd = 180 + drawn * 180;
  const pace = polar(cx, cy, r + stroke / 2 + 4, 180 + Math.min(Math.max(elapsed, 0), 1) * 180);
  const textR = r + stroke / 2 + 22;
  const behind = fraction > elapsed;

  return (
    <Svg width={size} height={size / 2 + 40} viewBox={`0 0 ${size} ${size / 2 + 40}`}>
      <Defs>
        <Path id="gauge-text" d={arc(196, 344, textR)} />
      </Defs>
      <Path d={arc(180, 360)} stroke={c.SecondaryBackground} strokeWidth={stroke} strokeLinecap="round" fill="none" />
      {drawn > 0.001 ? <Path d={arc(180, spentEnd)} stroke={c.DarkIcon} strokeWidth={stroke} strokeLinecap="round" fill="none" /> : null}
      <SvgText fill={c.SubtitleText} fontSize={20} fontFamily="Roboto_500Medium" letterSpacing={2}>
        <TextPath href="#gauge-text" startOffset="50%" textAnchor="middle">
          {caption.toUpperCase()}
        </TextPath>
      </SvgText>
      <Path
        d={`M${pace.x} ${pace.y} l-8 -4 l0 8 z`}
        fill={behind ? c.BudgetRed : c.GreyIcon}
        transform={`rotate(${180 + Math.min(Math.max(elapsed, 0), 1) * 180 + 90} ${pace.x} ${pace.y})`}
      />
    </Svg>
  );
}

// MARK: Capsule progress (budget cards)

/** A progress capsule in the category colour with a small pace marker above it. */
export function CapsuleProgress({ fraction, elapsed, colour, height = 26 }: { fraction: number; elapsed: number; colour: string; height?: number }) {
  const { c } = useTheme();
  const clamped = Math.min(Math.max(fraction, 0), 1);
  const behind = fraction > elapsed;
  const animated = useStore((st) => st.settings.animatedCharts);
  const grow = useAnimatedNumber(1, animated);
  return (
    <View>
      <View style={{ height: 12, marginHorizontal: -4 }}>
        <View style={{ position: 'absolute', left: `${Math.min(Math.max(elapsed, 0), 1) * 100}%`, top: 0 }}>
          <Svg width={16} height={10} style={{ marginLeft: -8 }}>
            <Path d="M1 1 H15 L8 9 Z" fill={behind ? c.BudgetRed : c.DarkIcon} strokeLinejoin="round" stroke={behind ? c.BudgetRed : c.DarkIcon} strokeWidth={2} />
          </Svg>
        </View>
      </View>
      <View style={{ height, borderRadius: height / 2, backgroundColor: c.SecondaryBackground, overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(clamped * 100, 10) * grow}%`, height, borderRadius: height / 2, backgroundColor: colour }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avgPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, minWidth: 34, alignItems: 'center' },
});
