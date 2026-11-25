import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { haptics } from '@/lib/haptics';
import { m3Duration } from '@/theme/material';
import { leaving, settle } from '@/theme/motion';
import { useTheme } from '@/theme/theme';
import { Icon } from '@/ui/Icon';

/** Dragged left past this much of its width, a row goes. A flick alone never deletes anything. */
const AWAY = 0.42;

export function SwipeAway({ onGone, children }: { onGone: () => void; children: ReactNode }) {
  const { m3 } = useTheme();
  const { width } = useWindowDimensions();
  const across = Math.min(width, 480);
  const x = useSharedValue(0);
  const armed = useSharedValue(false);
  const pan = usePanGesture({
    activeOffsetX: -16,
    failOffsetX: 16,
    failOffsetY: [-12, 12],
    onUpdate: (e) => {
      'worklet';
      x.set(Math.min(0, e.translationX));
      const now = -e.translationX > across * AWAY;
      if (now !== armed.get()) {
        armed.set(now);
        if (now) scheduleOnRN(haptics.tap);
      }
    },
    onDeactivate: () => {
      'worklet';
      if (armed.get())
        x.set(
          withTiming(-across, { duration: m3Duration.short4, easing: leaving }, (finished) => {
            'worklet';
            if (finished) scheduleOnRN(onGone);
          }),
        );
      else x.set(withSpring(0, settle));
    },
  });
  const { error, errorContainer, onErrorContainer } = m3;
  const moved = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const behind = useAnimatedStyle(() => ({ opacity: x.get() < 0 ? 1 : 0, backgroundColor: interpolateColor(armed.get() ? 1 : 0, [0, 1], [errorContainer, error]) }));
  return (
    <View style={styles.clip}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.behind, behind]} aria-hidden>
        <Icon name="trash-outline" size={24} color={onErrorContainer} />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={moved}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  behind: { alignItems: 'flex-end', justifyContent: 'center', paddingRight: 24 },
});
