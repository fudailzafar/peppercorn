import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { shape } from '../../theme/material';
import { useTheme, type Theme } from '../../theme/theme';
import { AppText } from '../AppText';
import { Icon, type IconName } from '../Icon';
import { StateLayer } from '../m3';

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'danger' | 'dangerText';

const colors = ({ m3 }: Theme, v: ButtonVariant): { bg?: string; ink: string; border?: string } =>
  ({
    filled: { bg: m3.primary, ink: m3.onPrimary },
    tonal: { bg: m3.secondaryContainer, ink: m3.onSecondaryContainer },
    outlined: { ink: m3.onSurfaceVariant, border: m3.outlineVariant },
    text: { ink: m3.primary },
    danger: { bg: m3.errorContainer, ink: m3.onErrorContainer },
    dangerText: { ink: m3.error },
  })[v];

/** M3 common button. 40dp by default; `large` is the 56dp size for a screen's main action. */
export function Button({
  label,
  onPress,
  variant = 'filled',
  icon,
  leading,
  large = false,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  /** A custom leading mark (an emoji, a logo) instead of an icon. */
  leading?: React.ReactNode;
  large?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const { bg, ink, border } = colors(theme, variant);
  const text = variant === 'text' || variant === 'dangerText';
  const lead = icon !== undefined || leading !== undefined;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={large ? 0 : 4}
      android_ripple={{ color: `${ink}1F` }}
      style={[
        styles.button,
        large ? styles.large : null,
        { backgroundColor: bg, paddingLeft: text ? 12 : lead && !large ? 16 : 24, paddingRight: text ? (lead ? 16 : 12) : 24 },
        border ? { borderWidth: 1, borderColor: border } : null,
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          <StateLayer pressed={pressed} color={ink} radius={shape.full} />
          {leading ?? (icon ? <Icon name={icon} size={large ? 24 : 18} color={ink} /> : null)}
          <AppText variant={large ? 'titleMedium' : 'labelLarge'} color={ink} numberOfLines={1} style={{ flexShrink: 1 }}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { height: 40, borderRadius: shape.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' },
  large: { height: 56, gap: 12 },
});
