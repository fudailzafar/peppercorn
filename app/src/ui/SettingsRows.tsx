import { StyleSheet, View } from 'react-native';
import { haptics } from '@/lib/haptics';
import { shape } from '@/theme/material';
import { useTheme } from '@/theme/theme';
import { ListItem, Switch } from '@/ui/material';
import type { IconName } from './Icon';

/** A setting that opens something. */
export function LinkRow({ icon, label, value, destructive = false, onPress }: { icon: IconName; label: string; value?: string; destructive?: boolean; onPress: () => void }) {
  const { m3 } = useTheme();
  return <ListItem icon={icon} headline={label} trailingText={value} chevron color={destructive ? m3.error : undefined} accessibilityLabel={value ? `${label}, ${value}` : label} onPress={onPress} />;
}

/** A setting that is on or off. */
export function ToggleRow({ icon, label, on, onChange }: { icon: IconName; label: string; on: boolean; onChange: (on: boolean) => void }) {
  const toggle = () => {
    haptics.select();
    onChange(!on);
  };
  return <ListItem icon={icon} headline={label} role="switch" checked={on} onPress={toggle} trailing={<Switch value={on} />} />;
}

/** One of several answers. */
export function RadioRow({ label, caption, selected, onPress }: { label: string; caption?: string; selected: boolean; onPress: () => void }) {
  const { m3 } = useTheme();
  const ink = selected ? m3.primary : m3.onSurfaceVariant;
  return (
    <ListItem
      headline={label}
      supporting={caption}
      role="radio"
      checked={selected}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      trailing={<View style={[styles.ring, { borderColor: ink }]}>{selected ? <View style={[styles.dot, { backgroundColor: ink }]} /> : null}</View>}
    />
  );
}

const styles = StyleSheet.create({
  ring: { width: 20, height: 20, borderRadius: shape.full, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: shape.full },
});
