import { useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  accessibilityLabel?: string;
}

/**
 * Dime's NumPadButton: while pressed the key shrinks to 80% and fades to half,
 * easing out over 0.3s (`.scaleEffect(0.8)`, `.opacity(0.5)`, `.easeOut(duration: 0.3)`).
 */
export function PressScale({ onPress, style, children, accessibilityLabel }: Props) {
  const [pressed] = useState(() => new Animated.Value(0));
  const to = (v: number) => Animated.timing(pressed, { toValue: v, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();

  return (
    <Pressable onPressIn={() => to(1)} onPressOut={() => to(0)} onPress={onPress} accessibilityLabel={accessibilityLabel} style={{ flex: 1 }}>
      <Animated.View
        style={[
          style,
          {
            opacity: pressed.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }),
            transform: [{ scale: pressed.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] }) }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
