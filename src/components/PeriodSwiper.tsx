import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Icon } from './Icon';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { Easing, Extrapolation, interpolate, useAnimatedStyle, useDerivedValue, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Haptics } from '../lib/haptics';
import { m3Easing } from '../theme/material';
import { springs } from '../theme/motion';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';

interface Props {
  /** Whether an older / newer period exists to swipe to. */
  canGoBack: boolean;
  canGoForward: boolean;
  /** Text under the arrows, like "21 NOV" or "OCT 26". */
  backLabel: string;
  forwardLabel: string;
  /** -1 for the previous period, +1 for the next. */
  onChange: (delta: -1 | 1) => void;
  children: ReactNode;
}

/**
 * Dime's Insights swipe, running on the UI thread: the page follows your finger (90% of the drag, 50% when there
 * is nothing further), an arrow with the destination slides in from the edge and darkens once you pass a quarter
 * of the screen, a light haptic marks that point, and on release the new period slides in from the opposite side.
 */
export function PeriodSwiper({ canGoBack, canGoForward, backLabel, forwardLabel, onChange, children }: Props) {
  const { m3 } = useTheme();
  const { width } = useWindowDimensions();

  const offset = useSharedValue(0);
  const wasArmed = useSharedValue(false);
  // The gesture lives on the UI thread, so props reach it through shared values.
  const back = useSharedValue(canGoBack);
  const forward = useSharedValue(canGoForward);
  useEffect(() => {
    back.set(canGoBack);
    forward.set(canGoForward);
  }, [back, forward, canGoBack, canGoForward]);

  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  });
  const change = useCallback((delta: -1 | 1) => latest.current(delta), []);
  const tick = useCallback(() => Haptics.light(), []);

  const pan = usePanGesture({
    // Horizontal drags only: a mostly vertical one stays with the scroll view.
    activeOffsetX: [-20, 20],
    failOffsetY: [-16, 16],
    onUpdate: (e) => {
      'worklet';
      const allowed = e.translationX < 0 ? forward.get() : back.get();
      const x = e.translationX * (allowed ? 0.9 : 0.5);
      offset.set(x);
      const now = allowed && Math.abs(x) > width * 0.25;
      if (now && !wasArmed.get()) scheduleOnRN(tick);
      wasArmed.set(now);
    },
    onDeactivate: (e) => {
      'worklet';
      if (wasArmed.get()) {
        const goingForward = e.translationX < 0;
        scheduleOnRN(change, goingForward ? 1 : -1);
        // The new period starts off-screen on the far side and slides in over 0.3s.
        offset.set(goingForward ? width : -width);
        offset.set(withTiming(0, { duration: 300, easing: Easing.bezier(...m3Easing.emphasizedDecelerate) }));
      } else {
        offset.set(withSpring(0, springs.smooth));
      }
      wasArmed.set(false);
    },
    onFinalize: () => {
      'worklet';
      // A cancelled gesture must not leave the page displaced.
      if (offset.get() !== 0 && !wasArmed.get()) offset.set(withSpring(0, springs.smooth));
      wasArmed.set(false);
    },
  });

  const armed = useDerivedValue(() => withTiming(Math.abs(offset.get()) > width * 0.25 ? 1 : 0, { duration: 120 }));
  const pageStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));
  const leftArrow = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(offset.get(), [0, 100], [-100, 0], Extrapolation.CLAMP) }] }));
  const rightArrow = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(offset.get(), [-100, 0], [0, 100], Extrapolation.CLAMP) }] }));
  const leftEnd = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(offset.get(), [0, 120], [-120, 0], Extrapolation.CLAMP) }] }));
  const rightEnd = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(offset.get(), [-120, 0], [0, 120], Extrapolation.CLAMP) }] }));
  const dim = useAnimatedStyle(() => ({ opacity: 1 - armed.get() }));
  const bright = useAnimatedStyle(() => ({ opacity: armed.get() }));

  // Two stacked copies (grey and dark) cross-fade as the swipe passes the point of no return.
  const arrow = (left: boolean, label: string, style: object) => (
    <Animated.View style={[styles.edge, left ? { left: 25 } : { right: 25 }, style]}>
      <View style={styles.stack}>
        <Animated.View style={dim}>
          <Icon name={left ? 'arrow-back-circle' : 'arrow-forward-circle'} size={24} color={m3.outlineVariant} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, bright]}>
          <Icon name={left ? 'arrow-back-circle' : 'arrow-forward-circle'} size={24} color={m3.onSurface} />
        </Animated.View>
      </View>
      <View>
        <Animated.View style={dim}>
          <AppText size={15} weight="semibold" color={m3.outlineVariant} style={styles.label}>
            {label}
          </AppText>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, bright]}>
          <AppText size={15} weight="semibold" color={m3.onSurface} style={styles.label}>
            {label}
          </AppText>
        </Animated.View>
      </View>
    </Animated.View>
  );

  const end = (left: boolean, label: string, style: object) => (
    <Animated.View style={[styles.edge, left ? { left: 25 } : { right: 25 }, style, { opacity: 0.8 }]}>
      <Icon name={left ? 'glasses' : 'partly-sunny'} size={26} color={m3.onSurfaceVariant} />
      <AppText size={15} weight="semibold" color={m3.onSurfaceVariant} style={{ width: 90, textAlign: 'center' }}>
        {label}
      </AppText>
    </Animated.View>
  );

  return (
    <View style={styles.root}>
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ flex: 1 }, pageStyle]}>{children}</Animated.View>
      </GestureDetector>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {canGoBack ? arrow(true, backLabel, leftArrow) : end(true, "That's all, buddy.", leftEnd)}
        {canGoForward ? arrow(false, forwardLabel, rightArrow) : end(false, 'Into the unknown.', rightEnd)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  edge: { position: 'absolute', top: '40%', alignItems: 'center', gap: 8 },
  stack: { width: 24, height: 24 },
  label: { textAlign: 'center' },
});
