import { useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { m3Duration, stateLayer } from '@/theme/material';
import { standardEasing } from '@/theme/motion';

interface Props {
  pressed: boolean;
  color: string;
  radius?: number;
}

/**
 * Material's pressed state: a see-through layer of the content's colour over its parent. Android shows its own ripple
 * instead (`android_ripple`), so there it costs nothing.
 */
export function StateLayer(props: Props) {
  return Platform.OS === 'android' ? null : <Layer {...props} />;
}

function Layer({ pressed, color, radius }: Props) {
  // The overlay fades in over 100ms when pressed and out over 200ms on release, as M3 specifies.
  const o = useSharedValue(0);
  useEffect(() => {
    o.set(withTiming(pressed ? stateLayer.pressed : 0, { duration: pressed ? m3Duration.short2 : m3Duration.short4, easing: standardEasing }));
  }, [pressed, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color, borderRadius: radius }, style]} />;
}
