import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { FONTS } from '@/theme/fonts';
import { m3Duration, shape, typeScale } from '@/theme/material';
import { standardEasing } from '@/theme/motion';
import { useTheme } from '@/theme/theme';
import { Icon } from '@/ui/Icon';

/** Space the Home search pill leaves for the profile picture beside it. */
export const SEARCH_SIDE = 52;
export const SEARCH_HEIGHT = 52;

/**
 * A search pill with a leading icon button, the input, and a clear action. It is exactly the Home pill's height, text
 * size and text position; with `grow` it starts at the Home pill's width and widens to the edge.
 */
export function SearchBar({
  value,
  onChangeText,
  placeholder,
  leading,
  autoFocus,
  autoCapitalize,
  grow = false,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  /** A leading control, usually a back arrow; defaults to a search glyph. */
  leading?: ReactNode;
  autoFocus?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  grow?: boolean;
}) {
  const { m3 } = useTheme();
  const side = useSharedValue(grow ? SEARCH_SIDE : 0);
  useEffect(() => {
    side.set(withTiming(0, { duration: m3Duration.medium1, easing: standardEasing }));
  }, [side]);
  const width = useAnimatedStyle(() => ({ marginRight: 16 + side.get() }));
  return (
    <Animated.View style={[styles.searchBar, { backgroundColor: m3.surfaceContainerHigh }, width]}>
      {leading ? <View style={styles.lead}>{leading}</View> : <Icon name="search" size={22} color={m3.onSurface} style={styles.glass} />}
      <TextInput
        autoFocus={autoFocus}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={m3.onSurfaceVariant}
        returnKeyType="search"
        autoCorrect={false}
        autoComplete="off"
        autoCapitalize={autoCapitalize}
        selectionColor={m3.primary}
        cursorColor={m3.primary}
        style={[styles.searchInput, { color: m3.onSurface }]}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} accessibilityRole="button" accessibilityLabel="Clear" style={styles.touch}>
          <Icon name="close" size={24} color={m3.onSurfaceVariant} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  lead: { marginLeft: 2 },
  glass: { marginLeft: 16, marginRight: 12 },
  searchBar: { height: SEARCH_HEIGHT, flexDirection: 'row', alignItems: 'center', borderRadius: shape.full, marginLeft: 16, overflow: 'hidden' },
  searchInput: { flex: 1, fontFamily: FONTS.regular, fontSize: typeScale.bodyLarge.size, height: SEARCH_HEIGHT, paddingVertical: 0, paddingHorizontal: 0, includeFontPadding: false, textAlignVertical: 'center', outlineWidth: 0, outlineColor: 'transparent', boxShadow: 'none' },
  touch: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
