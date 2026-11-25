import { useCallback, useEffect, type ReactNode } from 'react';
import { BackHandler, Keyboard, StyleSheet, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { goBack } from '@/lib/navigation';
import { m3Duration } from '@/theme/material';
import { arriving, leaving, settle } from '@/theme/motion';
import { useTheme } from '@/theme/theme';

/** Dragged down this far, or let go this fast, the page goes. */
const FAR = 220;
const FAST = 2500;

interface Props {
  draggable?: boolean;
  /** What the back gesture closes first. False if there is nothing. */
  onBack?: () => boolean;
  children: (close: () => void) => ReactNode;
}

/** A page that slides up over the one before, and back down: by its close button, the back gesture, or a drag. */
export function SlideUp({ draggable = true, onBack, children }: Props) {
  const { m3 } = useTheme();
  const { height } = useWindowDimensions();
  const y = useSharedValue(height);
  const closing = useSharedValue(false);

  useEffect(() => {
    y.set(withTiming(0, { duration: m3Duration.medium4, easing: arriving }));
  }, [y]);

  const close = useCallback(() => {
    if (closing.get()) return;
    closing.set(true);
    Keyboard.dismiss();
    y.set(
      withTiming(height, { duration: m3Duration.medium1, easing: leaving }, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(goBack);
      }),
    );
  }, [closing, height, y]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!onBack?.()) close();
      return true;
    });
    return () => sub.remove();
  }, [close, onBack]);

  const pan = usePanGesture({
    enabled: draggable,
    activeOffsetY: 12,
    failOffsetX: [-20, 20],
    failOffsetY: -8,
    onUpdate: (e) => {
      'worklet';
      y.set(Math.max(0, e.translationY));
    },
    onDeactivate: (e) => {
      'worklet';
      if (y.get() > FAR || e.velocityY > FAST) scheduleOnRN(close);
      else y.set(withSpring(0, settle));
    },
  });
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.fill, { backgroundColor: m3.surface }, style]}>{children(close)}</Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
