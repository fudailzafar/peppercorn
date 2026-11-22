import { useEffect, useState, type ReactNode } from 'react';
import { Animated, useWindowDimensions } from 'react-native';
import { motion } from '../theme/motion';

/**
 * Dime swaps the number pad and the category grid with
 * `.transition(.move(edge:).combined(with: .opacity))`: the grid enters from the trailing edge, the pad from the leading one.
 */
export function EnterSlide({ from, children }: { from: 'left' | 'right'; children: ReactNode }) {
  const { width } = useWindowDimensions();
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, ...motion.slide, useNativeDriver: true }).start();
  }, [progress]);
  const sign = from === 'right' ? 1 : -1;
  return (
    <Animated.View style={{ opacity: progress, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [sign * width, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}
