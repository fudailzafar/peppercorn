import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';

interface Props {
  options: readonly [string, string];
  /** 0 for the first option, 1 for the second. */
  index: 0 | 1;
  onChange: (index: 0 | 1) => void;
}

const SEGMENT_WIDTH = 118;

/**
 * Dime's Expense | Income capsule: a filled capsule slides under the chosen label
 * (`easeIn(duration: 0.15)`) instead of the highlight jumping between them.
 */
export function SlidingSegment({ options, index, onChange }: Props) {
  const { c } = useTheme();
  const [slide] = useState(() => new Animated.Value(index));

  useEffect(() => {
    Animated.timing(slide, { toValue: index, duration: 150, easing: Easing.in(Easing.ease), useNativeDriver: true }).start();
  }, [index, slide]);

  return (
    <View style={[styles.wrap, { borderColor: c.Outline }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.thumb,
          { backgroundColor: c.SecondaryBackground, transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, SEGMENT_WIDTH] }) }] },
        ]}
      />
      {options.map((label, i) => (
        <Pressable key={label} onPress={() => onChange(i as 0 | 1)} style={styles.seg} accessibilityRole="button" accessibilityState={{ selected: index === i }}>
          <AppText size={22} weight="semibold" color={index === i ? 'PrimaryText' : 'SubtitleText'}>
            {label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderWidth: 1.5, borderRadius: 100, padding: 3 },
  thumb: { position: 'absolute', left: 3, top: 3, bottom: 3, width: SEGMENT_WIDTH, borderRadius: 100 },
  seg: { width: SEGMENT_WIDTH, paddingVertical: 8, alignItems: 'center', borderRadius: 100 },
});
