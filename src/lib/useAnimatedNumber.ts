import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { m3Easing } from '../theme/material';

/**
 * A number that eases toward `target` (500ms with M3's emphasized curve). It starts from 0 on first render
 * and turns animation off when `enabled` is false (the Animated Charts setting).
 */
export function useAnimatedNumber(target: number, enabled: boolean, duration = 500): number {
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
    const run = Animated.timing(anim, { toValue: target, duration, easing: Easing.bezier(...m3Easing.emphasized), useNativeDriver: false });
    run.start();
    return () => run.stop();
  }, [target, enabled, duration, anim]);

  return value;
}
