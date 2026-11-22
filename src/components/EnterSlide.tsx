import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing } from 'react-native';
import { m3Duration, m3Easing } from '../theme/material';

/**
 * M3 "shared axis" (X): the new panel fades in while moving 30dp in from its side, over 300ms with the
 * emphasized curve. Used when the number pad and the category grid swap.
 */
export function EnterSlide({ from, children }: { from: 'left' | 'right'; children: ReactNode }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: m3Duration.medium2, easing: Easing.bezier(...m3Easing.emphasized), useNativeDriver: true }).start();
  }, [progress]);
  const sign = from === 'right' ? 1 : -1;
  return (
    <Animated.View style={{ opacity: progress, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [sign * 30, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}
