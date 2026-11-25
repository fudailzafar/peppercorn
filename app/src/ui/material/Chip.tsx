import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { shape } from '@/theme/material';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { Icon, type IconName } from '@/ui/Icon';
import { StateLayer } from './StateLayer';

interface ChipProps {
  label: string;
  onPress: () => void;
  icon?: IconName;
  /** An emoji shown before the label. */
  emoji?: string;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

function Base({ label, onPress, icon, emoji, trailing, style, accessibilityLabel, selected }: ChipProps & { selected?: boolean }) {
  const { m3 } = useTheme();
  const ink = selected ? m3.onSecondaryContainer : m3.onSurfaceVariant;
  const lead = selected !== undefined && selected ? 'checkmark' : icon;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={selected === undefined ? undefined : { selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={8}
      android_ripple={{ color: `${ink}1F` }}
      style={[styles.chip, { paddingLeft: lead || emoji ? 8 : 16, paddingRight: trailing ? 8 : 16 }, selected ? { backgroundColor: m3.secondaryContainer } : { borderWidth: 1, borderColor: m3.outlineVariant }, style]}
    >
      {({ pressed }) => (
        <>
          <StateLayer pressed={pressed} color={ink} radius={shape.small} />
          {lead ? <Icon name={lead} size={18} color={selected ? ink : m3.primary} /> : null}
          {emoji ? (
            <AppText size={16} style={styles.tight}>
              {emoji}
            </AppText>
          ) : null}
          <AppText variant="labelLarge" color={ink} numberOfLines={1} style={styles.shrink}>
            {label}
          </AppText>
          {trailing}
        </>
      )}
    </Pressable>
  );
}

/** M3 filter chip: 32dp, 8dp corners; selected is tonal with a check. */
export function FilterChip(props: ChipProps & { selected: boolean }) {
  return <Base {...props} />;
}

/** M3 assist chip: 32dp, 8dp corners, outlined. */
export function AssistChip(props: ChipProps) {
  return <Base {...props} />;
}

const styles = StyleSheet.create({
  tight: { includeFontPadding: false },
  shrink: { flexShrink: 1 },
  chip: { height: 32, borderRadius: shape.small, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' },
});
