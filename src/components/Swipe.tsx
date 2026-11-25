import { useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { m3Duration } from '../theme/material';
import { arriving, settle } from '../theme/motion';

interface Props {
  canGoBack: boolean;
  canGoForward: boolean;
  /** -1 for the one before, 1 for the one after. */
  onChange: (by: -1 | 1) => void;
  children: ReactNode;
}

/** How far across, or how fast, turns the page. */
const PART = 0.25;
const FLICK = 1200;

/** Swiping sideways goes to the one before or after; the page follows the finger, and only a little at either end. */
export function Swipe({ canGoBack, canGoForward, onChange, children }: Props) {
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const pan = usePanGesture({
    activeOffsetX: [-20, 20],
    failOffsetY: [-14, 14],
    onUpdate: (e) => {
      'worklet';
      const free = e.translationX > 0 ? canGoBack : canGoForward;
      x.set(e.translationX * (free ? 0.9 : 0.2));
    },
    onDeactivate: (e) => {
      'worklet';
      const by = x.get() > 0 ? -1 : 1;
      const free = by < 0 ? canGoBack : canGoForward;
      const flicked = Math.abs(e.velocityX) > FLICK && e.velocityX > 0 === x.get() > 0;
      if (free && (Math.abs(x.get()) > width * PART || flicked)) {
        scheduleOnRN(onChange, by);
        x.set(by * width);
        x.set(withTiming(0, { duration: m3Duration.medium2, easing: arriving }));
      } else x.set(withSpring(0, settle));
    },
  });
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.fill, style]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
