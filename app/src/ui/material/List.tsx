import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { shape } from '@/theme/material';
import { useTheme, withAlpha } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { Icon, type IconName } from '@/ui/Icon';
import { StateLayer } from './StateLayer';

interface ListItemProps {
  headline: string;
  supporting?: string;
  leading?: ReactNode;
  /** A plain 24dp leading icon, instead of `leading`. */
  icon?: IconName;
  trailing?: ReactNode;
  /** Trailing buttons of their own: kept outside the row's touch area, so buttons never nest. */
  actions?: ReactNode;
  /** Short trailing text, such as a value. */
  trailingText?: string;
  chevron?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  color?: string;
  role?: 'button' | 'radio' | 'switch';
  checked?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** M3 list item: leading, headline with optional supporting text, trailing. 56dp with one line, 72dp with two. */
export function ListItem({ headline, supporting, leading, icon, trailing, actions, trailingText, chevron, onPress, onLongPress, color, role = 'button', checked, accessibilityLabel, style }: ListItemProps) {
  const { m3 } = useTheme();
  const ink = color ?? m3.onSurface;
  const body = (
    <>
      {leading ?? (icon ? <Icon name={icon} size={24} color={color ?? m3.onSurfaceVariant} /> : null)}
      <View style={styles.fill}>
        <AppText variant="bodyLarge" color={ink} numberOfLines={1}>
          {headline}
        </AppText>
        {supporting ? (
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant} numberOfLines={2}>
            {supporting}
          </AppText>
        ) : null}
      </View>
      {trailingText ? (
        <AppText variant="labelLarge" weight="regular" color={m3.onSurfaceVariant}>
          {trailingText}
        </AppText>
      ) : null}
      {trailing}
      {chevron ? <Icon name="chevron-forward" size={24} color={m3.onSurfaceVariant} /> : null}
    </>
  );
  const box = [styles.item, { minHeight: supporting ? 72 : 56 }, style];
  if (!onPress) {
    return (
      <View style={box}>
        {body}
        {actions}
      </View>
    );
  }
  const row = (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole={role}
      accessibilityState={checked === undefined ? undefined : { checked }}
      accessibilityLabel={accessibilityLabel ?? [headline, supporting].filter(Boolean).join(', ')}
      android_ripple={{ color: `${ink}1F` }}
      style={[box, actions ? { flex: 1, paddingRight: 0 } : null]}
    >
      {({ pressed }) => (
        <>
          <StateLayer pressed={pressed} color={ink} />
          {body}
        </>
      )}
    </Pressable>
  );
  if (!actions) return row;
  return (
    <View style={styles.split}>
      {row}
      {actions}
    </View>
  );
}

/** M3 list subheader. */
export function Subheader({ text, style }: { text: string; style?: StyleProp<ViewStyle> }) {
  const { m3 } = useTheme();
  return (
    <View style={[styles.subheader, style]}>
      <AppText variant="titleSmall" color={m3.onSurfaceVariant} accessibilityRole="header">
        {text}
      </AppText>
    </View>
  );
}

/** M3 list avatar: a 40dp circle holding an emoji on its category's tint. */
export function EmojiAvatar({ emoji, colour, size = 40, dimmed = false }: { emoji: string; colour: string; size?: number; dimmed?: boolean }) {
  return (
    <View style={{ width: size, height: size, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(colour, dimmed ? 0.16 : 0.3) }}>
      <AppText size={size / 2} style={styles.tight}>
        {emoji}
      </AppText>
    </View>
  );
}

/** M3 list avatar: a 40dp circle holding an icon. */
export function IconAvatar({ icon, size = 40 }: { icon: IconName; size?: number }) {
  const { m3 } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center', backgroundColor: m3.secondaryContainer }}>
      <Icon name={icon} size={24} color={m3.onSecondaryContainer} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  tight: { includeFontPadding: false },
  item: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 8, overflow: 'hidden' },
  split: { flexDirection: 'row', alignItems: 'center', paddingRight: 4 },
  subheader: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
});
