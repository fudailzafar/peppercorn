import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { shape } from '../../theme/material';
import { useTheme } from '../../theme/theme';
import { AppText } from '../AppText';
import { Icon } from '../Icon';
import { StateLayer } from '../m3';

/** M3 card: filled by default, or outlined. 12dp corners; `hero` uses the extra-large corner for a screen's summary. */
export function Card({ children, outlined = false, hero = false, onPress, onLongPress, style, accessibilityLabel, hasActions = false }: { children: ReactNode; outlined?: boolean; hero?: boolean; onPress?: () => void; onLongPress?: () => void; style?: StyleProp<ViewStyle>; accessibilityLabel?: string; /** The card holds its own buttons, so it isn't announced as one. */ hasActions?: boolean }) {
  const { m3 } = useTheme();
  const corner = hero ? shape.extraLarge : shape.medium;
  const box = [
    styles.card,
    { borderRadius: corner, backgroundColor: outlined ? m3.surface : m3.surfaceContainer },
    outlined ? { borderWidth: 1, borderColor: m3.outlineVariant } : null,
    style,
  ];
  if (!onPress) return <View style={box}>{children}</View>;
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} accessibilityRole={hasActions ? undefined : 'button'} accessibilityLabel={accessibilityLabel} android_ripple={{ color: `${m3.onSurface}1F` }} style={box}>
      {({ pressed }) => (
        <>
          <StateLayer pressed={pressed} color={m3.onSurface} radius={corner} />
          {children}
        </>
      )}
    </Pressable>
  );
}

/** A selectable M3 card with a leading visual and a label, for grids of choices. */
export function ChoiceCard({ label, leading, selected, onPress, style }: { label: string; leading: ReactNode; selected: boolean; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const { m3 } = useTheme();
  const ink = selected ? m3.onSecondaryContainer : m3.onSurface;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={label}
      android_ripple={{ color: `${ink}1F` }}
      style={[styles.choice, { backgroundColor: selected ? m3.secondaryContainer : m3.surfaceContainerHigh }, style]}
    >
      {({ pressed }) => (
        <>
          <StateLayer pressed={pressed} color={ink} radius={shape.medium} />
          {leading}
          <AppText variant="labelLarge" color={ink} numberOfLines={2} style={{ flex: 1 }}>
            {label}
          </AppText>
          {selected ? <Icon name="checkmark" size={20} color={ink} /> : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  choice: { minHeight: 56, borderRadius: shape.medium, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 8, overflow: 'hidden' },
});
