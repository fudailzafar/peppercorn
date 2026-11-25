import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { m3Duration } from '@/theme/material';
import { standardEasing } from '@/theme/motion';
import { useTheme } from '@/theme/theme';
import { Icon } from '@/ui/Icon';

/** M3 switch: 52x32 track; a small outlined thumb when off, a larger one with a check when on. Its row is what's tapped. */
export function Switch({ value }: { value: boolean }) {
  const { m3 } = useTheme();
  const p = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    p.set(withTiming(value ? 1 : 0, { duration: m3Duration.short4, easing: standardEasing }));
  }, [value, p]);
  // Colours are read here, outside the worklets.
  const offTrack = m3.surfaceContainerHighest;
  const onTrack = m3.primary;
  const offEdge = m3.outline;
  const offThumb = m3.outline;
  const onThumb = m3.onPrimary;
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(p.get(), [0, 1], [offTrack, onTrack]), borderColor: interpolateColor(p.get(), [0, 1], [offEdge, onTrack]) }));
  const thumb = useAnimatedStyle(() => {
    const size = interpolate(p.get(), [0, 1], [16, 24]);
    return { width: size, height: size, borderRadius: size / 2, left: interpolate(p.get(), [0, 1], [8, 20]), backgroundColor: interpolateColor(p.get(), [0, 1], [offThumb, onThumb]) };
  });
  const check = useAnimatedStyle(() => ({ opacity: p.get() }));
  return (
    <Animated.View style={[styles.switchTrack, track]} aria-hidden>
      <Animated.View style={[styles.switchThumb, thumb]}>
        <Animated.View style={check}>
          <Icon name="checkmark" size={16} color={m3.primary} />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  switchTrack: { width: 52, height: 32, borderRadius: 16, borderWidth: 2, justifyContent: 'center' },
  switchThumb: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
