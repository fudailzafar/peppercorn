import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { m3Duration, shape } from '@/theme/material';
import { standardEasing } from '@/theme/motion';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { Icon } from '@/ui/Icon';
import { StateLayer } from './StateLayer';

/** M3 two-option segmented button: the selected segment is filled and shows a check mark. */
export function SegmentedButton({ options, index, onChange, fullWidth }: { options: readonly string[]; index: number; onChange: (i: number) => void; fullWidth?: boolean }) {
  const { m3 } = useTheme();
  return (
    <View style={[styles.segmented, { borderColor: m3.outline }, fullWidth && { alignSelf: 'stretch' }]}>
      {options.map((label, i) => (
        <Segment key={label} label={label} selected={index === i} divider={i > 0} fullWidth={fullWidth} onPress={() => onChange(i)} />
      ))}
    </View>
  );
}

function Segment({ label, selected, divider, onPress, fullWidth }: { label: string; selected: boolean; divider: boolean; onPress: () => void; fullWidth?: boolean }) {
  const { m3 } = useTheme();
  const fill = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    fill.set(withTiming(selected ? 1 : 0, { duration: m3Duration.short4, easing: standardEasing }));
  }, [selected, fill]);
  const bg = useAnimatedStyle(() => ({ opacity: fill.get() }));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      android_ripple={{ color: `${m3.onSurface}1F` }}
      hitSlop={4}
      style={[styles.segment, fullWidth && { flex: 1, width: undefined }, divider && { borderLeftWidth: 1, borderLeftColor: m3.outline }]}
    >
      {({ pressed }) => (
        <>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: m3.secondaryContainer }, bg]} />
          <StateLayer pressed={pressed} color={m3.onSurface} />
          {selected ? <Icon name="checkmark" size={18} color={m3.onSecondaryContainer} /> : null}
          <AppText variant="labelLarge" color={selected ? m3.onSecondaryContainer : m3.onSurface}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  segmented: { flexDirection: 'row', height: 40, borderWidth: 1, borderRadius: shape.full, overflow: 'hidden' },
  segment: { width: 108, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' },
});
