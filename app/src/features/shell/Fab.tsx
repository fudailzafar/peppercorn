import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '@/lib/haptics';
import { openPage } from '@/lib/navigation';
import { useAppState } from '@/state/hooks';
import { elevation, m3Duration, m3Easing, shape, stateLayer } from '@/theme/material';
import { useTheme, withAlpha } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { Icon } from '@/ui/Icon';
import { useFab } from '@/ui/useFab';
import { NAV_BAR_HEIGHT } from './TabBar';

/**
 * The add-entry floating action button: a 56dp FAB (16dp corners, elevation 3) above the navigation bar.
 * With an empty log it extends to show a label, as M3 does when an action needs attention.
 */
export function Fab() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const empty = useAppState((s) => s.data.entries.length === 0);
  const tucked = useFab((s) => s.tucked);
  // 0 = showing, 1 = tucked away below the screen edge (slides down and fades, emphasized easing).
  const away = useSharedValue(0);
  useEffect(() => {
    away.set(withTiming(tucked ? 1 : 0, { duration: m3Duration.short4, easing: Easing.bezier(...m3Easing.emphasized) }));
  }, [tucked, away]);
  const slide = useAnimatedStyle(() => ({ opacity: 1 - away.get(), transform: [{ translateY: away.get() * 96 }] }));

  return (
    <Animated.View pointerEvents={tucked ? 'none' : 'box-none'} style={[styles.wrap, { bottom: NAV_BAR_HEIGHT + insets.bottom + 16 }, slide]}>
      <Pressable
        onPress={() => {
          haptics.tap();
          openPage('/entry');
        }}
        accessibilityRole="button"
        accessibilityLabel="Add entry"
        android_ripple={{ color: withAlpha(m3.onPrimary, 0.18) }}
        style={[styles.fab, { backgroundColor: m3.primary }, elevation(3), empty && styles.extended]}
      >
        {({ pressed }) => (
          <>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: m3.onPrimary, opacity: pressed ? stateLayer.pressed : 0, borderRadius: shape.large }]} />
            <Icon name="add" size={24} color={m3.onPrimary} />
            {empty ? (
              <AppText variant="labelLarge" color={m3.onPrimary}>
                Add entry
              </AppText>
            ) : null}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 16, left: 16, alignItems: 'flex-end' },
  fab: { minWidth: 56, height: 56, borderRadius: shape.large, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12, overflow: 'hidden' },
  extended: { paddingHorizontal: 20 },
});
