import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * A number that eases toward `target` (0.7s ease-in-out by default, like Dime's
 * `withAnimation(.easeInOut(duration: 0.7))` on its budget gauges). It starts from 0 on first render
 * and turns animation off when `enabled` is false (the Animated Charts setting).
 */
export function useAnimatedNumber(target: number, enabled: boolean, duration = 700): number {
  const [value, setValue] = useState(enabled ? 0 : target);
  const [anim] = useState(() => new Animated.Value(enabled ? 0 : target));

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setValue(v));
    return () => anim.removeListener(id);
  }, [anim]);

  useEffect(() => {
    if (!enabled) {
      anim.setValue(target);
      return;
    }
    const run = Animated.timing(anim, { toValue: target, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: false });
    run.start();
    return () => run.stop();
  }, [target, enabled, duration, anim]);

  return value;
}
