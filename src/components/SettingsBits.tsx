import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shape, typeScale } from '../theme/material';
import { useTheme, withAlpha } from '../theme/theme';
import { AppText } from './AppText';
import { IconButton, M3Switch, StateLayer } from './m3';
import { SharedAxis } from './SharedAxis';


/** A 40dp circle holding a glyph in Dime's accent colour on a tint of that colour (M3 leading icon). */
export function IconTile({ name, colour }: { name: IconName; colour: string }) {
  return (
    <View style={[styles.tile, { backgroundColor: withAlpha(colour, 0.22) }]}>
      <Icon name={name} size={22} color={colour} />
    </View>
  );
}

/** An M3 list section: a subheader, then flat list items. */
export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const { m3 } = useTheme();
  return (
    <View style={{ marginTop: 8 }}>
      <AppText size={typeScale.labelLarge.size} weight="semibold" color={m3.onSurfaceVariant} style={styles.subheader}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

interface RowProps {
  icon: IconName;
  colour: string;
  label: string;
  /** Trailing supporting text (with a chevron). */
  value?: string;
  onPress?: () => void;
  /** Shows a switch instead of a chevron. */
  toggle?: { value: boolean; onChange: (v: boolean) => void };
  destructive?: boolean;
}

/** An M3 one-line list item: leading icon circle, headline, trailing text / chevron / switch. */
export function SettingsRow({ icon, colour, label, value, onPress, toggle, destructive }: RowProps) {
  const { m3 } = useTheme();
  const ink = destructive ? m3.error : m3.onSurface;
  return (
    <Pressable
      onPress={toggle ? () => toggle.onChange(!toggle.value) : onPress}
      accessibilityRole={toggle ? 'switch' : 'button'}
      accessibilityLabel={label}
      android_ripple={{ color: `${ink}1F` }}
      style={styles.row}
    >
      {({ pressed }) => (
        <>
          <StateLayer pressed={pressed} color={ink} />
          <IconTile name={icon} colour={destructive ? m3.error : colour} />
          <AppText size={typeScale.bodyLarge.size} color={ink} style={{ flex: 1, marginLeft: 16, letterSpacing: typeScale.bodyLarge.tracking }} numberOfLines={1}>
            {label}
          </AppText>
          {toggle ? (
            <M3Switch value={toggle.value} onChange={toggle.onChange} />
          ) : (
            <>
              {value ? (
                <AppText size={typeScale.bodyMedium.size} color={m3.onSurfaceVariant} style={{ marginRight: 4 }}>
                  {value}
                </AppText>
              ) : null}
              <Icon name="chevron-forward" size={20} color={m3.onSurfaceVariant} />
            </>
          )}
        </>
      )}
    </Pressable>
  );
}

/** Settings sub-page: an M3 top app bar with a back arrow and title, then the content. */
export function PageScaffold({ title, children, scroll = true }: { title: string; children: ReactNode; scroll?: boolean }) {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const body = scroll ? (
    <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1 }}>{children}</View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: m3.surface }}>
      <View style={[styles.appBar, { paddingTop: insets.top }]}>
        <IconButton icon="arrow-back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))} label="Back" tint={m3.onSurface} />
        <AppText size={typeScale.titleLarge.size} color={m3.onSurface} style={{ marginLeft: 8 }}>
          {title}
        </AppText>
      </View>
      <SharedAxis>{body}</SharedAxis>
    </View>
  );
}

/** An M3 radio list item: headline, optional supporting text, a radio button on the right. */
export function OptionRow({ label, caption, selected, onPress }: { label: string; caption?: string; selected: boolean; onPress: () => void }) {
  const { m3 } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} android_ripple={{ color: `${m3.onSurface}1F` }} style={styles.option}>
      {({ pressed }) => (
        <>
          <StateLayer pressed={pressed} color={m3.onSurface} />
          <View style={{ flex: 1 }}>
            <AppText size={typeScale.bodyLarge.size} color={m3.onSurface} style={{ letterSpacing: typeScale.bodyLarge.tracking }}>
              {label}
            </AppText>
            {caption ? (
              <AppText size={typeScale.bodyMedium.size} color={m3.onSurfaceVariant} style={{ letterSpacing: typeScale.bodyMedium.tracking }}>
                {caption}
              </AppText>
            ) : null}
          </View>
          <View style={[styles.radio, { borderColor: selected ? m3.primary : m3.onSurfaceVariant }]}>
            {selected ? <View style={[styles.radioDot, { backgroundColor: m3.primary }]} /> : null}
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { width: 40, height: 40, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
  subheader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, letterSpacing: 0.1 },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, overflow: 'hidden' },
  appBar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  option: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, overflow: 'hidden' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
});
