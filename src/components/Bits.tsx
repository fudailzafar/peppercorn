import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { currencySymbol } from '../lib/format';
import { withAlpha, useTheme } from '../theme/theme';
import { AppText } from './AppText';

/** The category emoji on a rounded, tinted tile (log rows, insights...). */
export function EmojiTile({ emoji, colour, size = 40, future = false }: { emoji: string; colour: string; size?: number; future?: boolean }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: withAlpha(colour, future ? 0.3 : 0.7),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText size={size * 0.5} style={{ includeFontPadding: false }}>
        {emoji}
      </AppText>
    </View>
  );
}

/**
 * The big headline number: a small grey sign and currency symbol, then large digits.
 */
export function BigAmount({
  value,
  sign,
  currency,
  size = 56,
  align = 'center',
  color = 'PrimaryText',
}: {
  value: string;
  sign?: '+' | '-' | '';
  currency: string;
  size?: number;
  align?: 'center' | 'flex-start' | 'flex-end';
  color?: 'PrimaryText' | 'IncomeGreen';
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: align, gap: 2 }}>
      {sign ? (
        <AppText size={size * 0.5} weight="medium" color="SubtitleText">
          {sign}
        </AppText>
      ) : null}
      <AppText size={size * 0.5} weight="medium" color="SubtitleText">
        {currencySymbol(currency)}
      </AppText>
      <AppText size={size} weight="medium" color={color} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
        {value}
      </AppText>
    </View>
  );
}

/** iOS-style switch with Dime's green. */
export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const [anim] = useState(() => new Animated.Value(value ? 1 : 0));
  useEffect(() => {
    Animated.timing(anim, { toValue: value ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [value, anim]);

  return (
    <Pressable onPress={() => onChange(!value)} hitSlop={8} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <Animated.View
        style={[
          styles.track,
          { backgroundColor: anim.interpolate({ inputRange: [0, 1], outputRange: ['#C7C7CC', '#34C759'] }) },
        ]}
      >
        <Animated.View
          style={[styles.thumb, { transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [2, 22] }) }] }]}
        />
      </Animated.View>
    </Pressable>
  );
}

/** Small uppercase grey section heading ("GENERAL", "TODAY"...). */
export function SectionLabel({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <AppText size={15} weight="semibold" color="SubtitleText" style={{ letterSpacing: 0.4 }}>
        {children.toUpperCase()}
      </AppText>
    </View>
  );
}

/** Round grey button holding an icon (close, repeat, delete...). */
export function CircleButton({ children, onPress, size = 40, label }: { children: React.ReactNode; onPress?: () => void; size?: number; label?: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: size / 2, backgroundColor: c.SecondaryBackground, alignItems: 'center', justifyContent: 'center' },
        pressed && { opacity: 0.6 },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 51, height: 31, borderRadius: 16, justifyContent: 'center' },
  thumb: { width: 27, height: 27, borderRadius: 14, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
});
