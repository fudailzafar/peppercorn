import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { Toggle } from './Bits';

type IconName = keyof typeof Ionicons.glyphMap;

/** A coloured rounded tile with a white glyph, as on Dime's settings rows. */
export function IconTile({ name, colour }: { name: IconName; colour: string }) {
  return (
    <View style={[styles.tile, { backgroundColor: colour }]}>
      <Ionicons name={name} size={20} color="#FFFFFF" />
    </View>
  );
}

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ marginTop: 22 }}>
      <AppText size={17} weight="semibold" color="SubtitleText" style={{ marginLeft: 10, marginBottom: 8, letterSpacing: 0.4 }}>
        {title.toUpperCase()}
      </AppText>
      <View style={[styles.card, { backgroundColor: c.Settings }]}>{children}</View>
    </View>
  );
}

interface RowProps {
  icon: IconName;
  colour: string;
  label: string;
  /** Right-hand grey value (with a chevron). */
  value?: string;
  onPress?: () => void;
  /** Shows a switch instead of a chevron. */
  toggle?: { value: boolean; onChange: (v: boolean) => void };
  destructive?: boolean;
}

export function SettingsRow({ icon, colour, label, value, onPress, toggle, destructive }: RowProps) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={toggle ? () => toggle.onChange(!toggle.value) : onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.SecondaryBackground }]}
      accessibilityLabel={label}
    >
      <IconTile name={icon} colour={colour} />
      <AppText size={22} weight="medium" color={destructive ? 'AlertRed' : 'PrimaryText'} style={{ flex: 1, marginLeft: 14 }} numberOfLines={1}>
        {label}
      </AppText>
      {toggle ? (
        <Toggle value={toggle.value} onChange={toggle.onChange} />
      ) : (
        <>
          {value ? (
            <AppText size={20} weight="medium" color="SubtitleText" style={{ marginRight: 4 }}>
              {value}
            </AppText>
          ) : null}
          <Ionicons name="chevron-forward" size={20} color={c.SubtitleText} />
        </>
      )}
    </Pressable>
  );
}

/** Settings sub-page: back pill, big title, scrolling content. */
export function PageScaffold({ title, children, scroll = true }: { title: string; children: ReactNode; scroll?: boolean }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const body = scroll ? (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, paddingHorizontal: 20 }}>{children}</View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.PrimaryBackground }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 6 }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}
          style={[styles.back, { backgroundColor: c.SecondaryBackground }]}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={20} color={c.DarkIcon} />
          <AppText size={18} weight="semibold">
            Back
          </AppText>
        </Pressable>
        <AppText size={34} weight="bold" style={{ marginTop: 14, marginBottom: 10 }}>
          {title}
        </AppText>
      </View>
      {body}
    </View>
  );
}

/** A radio-style option row. */
export function OptionRow({ label, caption, selected, onPress }: { label: string; caption?: string; selected: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.option, { backgroundColor: c.Settings }, pressed && { opacity: 0.7 }]}>
      <View style={{ flex: 1 }}>
        <AppText size={21} weight="medium">
          {label}
        </AppText>
        {caption ? (
          <AppText size={15} weight="medium" color="SubtitleText">
            {caption}
          </AppText>
        ) : null}
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={26} color={c.IncomeGreen} /> : <Ionicons name="ellipse-outline" size={26} color={c.GreyIcon} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 20, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', paddingVertical: 8, paddingLeft: 8, paddingRight: 14, borderRadius: 100 },
  option: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 8 },
});
