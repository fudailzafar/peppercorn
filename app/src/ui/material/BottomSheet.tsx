import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { m3Duration, shape } from '@/theme/material';
import { arriving, leaving, standardEasing } from '@/theme/motion';
import { useTheme, withAlpha } from '@/theme/theme';
import { useKeyboardLift } from '@/ui/useKeyboardLift';

/** M3 modal bottom sheet: a scrim, a 28dp-cornered surface with a drag handle, anchored to the bottom. */
export function BottomSheet({ visible, onClose, children, bottomInset = 0 }: { visible: boolean; onClose: () => void; children: ReactNode; bottomInset?: number }) {
  const { m3 } = useTheme();
  const { height } = useWindowDimensions();
  // The sheet stays mounted while it animates out: up over 400ms (emphasized decelerate), down over 250ms (accelerate).
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(visible ? 0 : 1);
  const scrim = useSharedValue(visible ? 1 : 0);
  const unmount = useCallback(() => setMounted(false), []);
  const { onLayout, lift } = useKeyboardLift();
  // The sheet rides up with the keyboard.
  const raise = useSharedValue(0);
  useEffect(() => {
    raise.set(withTiming(lift, { duration: m3Duration.short4, easing: standardEasing }));
  }, [lift, raise]);
  const raiseStyle = useAnimatedStyle(() => ({ paddingBottom: raise.get() }));
  // Mount as soon as the sheet is asked to show (adjusting state while rendering, not in an effect).
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      y.set(withTiming(0, { duration: m3Duration.medium4, easing: arriving }));
      scrim.set(withTiming(1, { duration: m3Duration.medium2 }));
    } else {
      scrim.set(withTiming(0, { duration: m3Duration.medium1 }));
      y.set(
        withTiming(1, { duration: m3Duration.medium1, easing: leaving }, (finished) => {
          'worklet';
          if (finished) scheduleOnRN(unmount);
        }),
      );
    }
  }, [visible, y, scrim, unmount]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() * height }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.get() }));

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(m3.scrim, 0.32) }, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss" />
      </Animated.View>
      <Animated.View onLayout={onLayout} style={[styles.sheetWrap, raiseStyle]} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, { backgroundColor: m3.surfaceContainerLow, paddingBottom: Math.max(bottomInset, 16) + 8 }, sheetStyle]}>
          <View style={[styles.handle, { backgroundColor: m3.onSurfaceVariant }]} />
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: shape.extraLarge, borderTopRightRadius: shape.extraLarge, paddingHorizontal: 24, paddingTop: 12 },
  handle: { width: 32, height: 4, borderRadius: 2, alignSelf: 'center', opacity: 0.4, marginBottom: 16 },
});
