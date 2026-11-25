import { Pressable, StyleSheet, View } from 'react-native';
import { shape } from '@/theme/material';
import { useTheme } from '@/theme/theme';
import { Icon, type IconName } from '@/ui/Icon';
import { StateLayer } from './StateLayer';

/** M3 standard icon button: no container, a 40dp state layer inside a 48dp touch target. */
export function IconButton({ icon, onPress, label, tint, disabled = false }: { icon: IconName; onPress: () => void; label: string; tint?: string; disabled?: boolean }) {
  const { m3 } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }} accessibilityLabel={label} style={[styles.touch, { opacity: disabled ? 0.38 : 1 }]} android_ripple={{ color: `${m3.onSurface}1F`, radius: 24 }}>
      {({ pressed }) => (
        <View style={styles.iconContainer}>
          <StateLayer pressed={pressed} color={m3.onSurface} radius={shape.full} />
          <Icon name={icon} size={24} color={tint ?? m3.onSurfaceVariant} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touch: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  iconContainer: { width: 40, height: 40, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
