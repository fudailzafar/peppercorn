import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shape } from '../theme/material';
import { useTheme } from '../theme/theme';
import type { IconName } from './Icon';
import { M3Switch } from './m3';
import { ListItem, Subheader } from './material/List';
import { TopAppBar } from './material/TopAppBar';

/** A list section: a subheader, then list items. */
export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View>
      <Subheader text={title} />
      {children}
    </View>
  );
}

interface RowProps {
  icon: IconName;
  label: string;
  /** Trailing supporting text (with a chevron). */
  value?: string;
  onPress?: () => void;
  /** Shows a switch instead of a chevron. */
  toggle?: { value: boolean; onChange: (v: boolean) => void };
  destructive?: boolean;
}

/** A settings list item: icon, label, and a value, chevron or switch. */
export function SettingsRow({ icon, label, value, onPress, toggle, destructive }: RowProps) {
  const { m3 } = useTheme();
  return (
    <ListItem
      icon={icon}
      headline={label}
      color={destructive ? m3.error : undefined}
      onPress={toggle ? () => toggle.onChange(!toggle.value) : onPress}
      role={toggle ? 'switch' : 'button'}
      checked={toggle?.value}
      trailingText={value}
      trailing={toggle ? <M3Switch value={toggle.value} onChange={toggle.onChange} /> : undefined}
      chevron={!toggle}
    />
  );
}

/** Settings sub-page: a top app bar with a back arrow and title, then the content. */
export function PageScaffold({ title, children, scroll = true }: { title: string; children: ReactNode; scroll?: boolean }) {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: m3.surface }}>
      <TopAppBar title={title} onBack={() => (router.canGoBack() ? router.back() : router.replace('/settings'))} />
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
    </View>
  );
}

/** A radio list item. */
export function OptionRow({ label, caption, selected, onPress }: { label: string; caption?: string; selected: boolean; onPress: () => void }) {
  const { m3 } = useTheme();
  return (
    <ListItem
      headline={label}
      supporting={caption}
      onPress={onPress}
      role="radio"
      checked={selected}
      trailing={
        <View style={[styles.radio, { borderColor: selected ? m3.primary : m3.onSurfaceVariant }]}>
          {selected ? <View style={[styles.radioDot, { backgroundColor: m3.primary }]} /> : null}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  radio: { width: 20, height: 20, borderRadius: shape.full, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: shape.full },
});
