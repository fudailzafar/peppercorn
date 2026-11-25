import { useImperativeHandle, type Ref } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { shortName } from '@/domain/entries';
import type { Category } from '@/domain/model';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/material';

export interface CategoryButtonHandle {
  /** Flashes and shakes, when there is none. */
  missing: () => void;
}

/** Opens the grid, and closes it. */
export function CategoryButton({ category, open, onPress, ref }: { category?: Category; open: boolean; onPress: () => void; ref?: Ref<CategoryButtonHandle> }) {
  const shake = useSharedValue(0);
  const flash = useSharedValue(0);
  useImperativeHandle(ref, () => ({
    missing: () => {
      const to = (x: number) => withTiming(x, { duration: 80 });
      shake.set(withSequence(to(-6), to(6), to(-6), to(6), to(-6), to(0)));
      flash.set(withSequence(withTiming(1, { duration: 0 }), withDelay(500, withTiming(0, { duration: 600 }))));
    },
  }));
  const moved = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));
  const shown = useAnimatedStyle(() => ({ opacity: flash.get() }));
  return (
    <Animated.View style={[styles.button, moved]}>
      {open ? (
        <Button variant="outlined" icon="close" label="Close" onPress={onPress} />
      ) : category ? (
        <Button variant="tonal" leading={<AppText size={16}>{category.emoji}</AppText>} label={shortName(category)} accessibilityLabel={`Category: ${category.name}. Change`} onPress={onPress} />
      ) : (
        <>
          <Button variant="outlined" icon="apps-outline" label="Category" accessibilityLabel="Choose category" onPress={onPress} />
          <Animated.View pointerEvents="none" aria-hidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, shown]}>
            <Button variant="danger" icon="apps-outline" label="Category" onPress={onPress} />
          </Animated.View>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({ button: { minWidth: 120, maxWidth: 168 } });
