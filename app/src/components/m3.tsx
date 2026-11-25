import { useCallback, useEffect, useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View, useWindowDimensions, type DimensionValue, type TextInputProps } from 'react-native';
import { Icon, type IconName } from './Icon';
import { scheduleOnRN } from 'react-native-worklets';
import Animated, { Easing, interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { m3Duration, m3Easing, radius, shape, stateLayer, typeScale } from '../theme/material';
import { useKeyboardLift } from '../hooks/useKeyboardLift';
import { FONTS, useTheme, withAlpha } from '../theme/theme';
import { AppText } from './AppText';

/** Material 3 building blocks used across the app. Reference: https://m3.material.io/components */

const emphasized = Easing.bezier(...m3Easing.emphasized);

// MARK: State layer

/** Paints M3's pressed state layer (a translucent overlay in the content colour) over its parent. */
export function StateLayer({ pressed, color, radius }: { pressed: boolean; color: string; radius?: number }) {
  // The overlay fades in over 100ms when pressed and out over 200ms on release, as M3 specifies.
  const o = useSharedValue(0);
  useEffect(() => {
    o.set(withTiming(pressed ? stateLayer.pressed : 0, { duration: pressed ? m3Duration.short2 : m3Duration.short4, easing: emphasized }));
  }, [pressed, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color, borderRadius: radius }, style]} />;
}

// MARK: Icon button

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

// MARK: Segmented button

/** M3 two-option segmented button: the selected segment is filled and shows a check mark. */
export function SegmentedButton({ options, index, onChange, fullWidth }: { options: readonly string[]; index: number; onChange: (i: number) => void; fullWidth?: boolean }) {
  const { m3 } = useTheme();
  return (
    <View style={[styles.segmented, { borderColor: m3.outline }, fullWidth && { alignSelf: 'stretch' }]}>
      {options.map((label, i) => (
        <Segment key={label} label={label} selected={index === i} divider={i > 0} fullWidth={fullWidth} onPress={() => onChange(i)} />
      ))}
    </View>
  );
}

function Segment({ label, selected, divider, onPress, fullWidth }: { label: string; selected: boolean; divider: boolean; onPress: () => void; fullWidth?: boolean }) {
  const { m3 } = useTheme();
  const fill = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    fill.set(withTiming(selected ? 1 : 0, { duration: m3Duration.short4, easing: emphasized }));
  }, [selected, fill]);
  const bg = useAnimatedStyle(() => ({ opacity: fill.get() }));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      android_ripple={{ color: `${m3.onSurface}1F` }}
      hitSlop={4}
      style={[styles.segment, fullWidth && { flex: 1, width: undefined }, divider && { borderLeftWidth: 1, borderLeftColor: m3.outline }]}
    >
      {({ pressed }) => (
        <>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: m3.secondaryContainer }, bg]} />
          <StateLayer pressed={pressed} color={m3.onSurface} />
          {selected ? <Icon name="checkmark" size={18} color={m3.onSecondaryContainer} /> : null}
          <AppText variant="labelLarge" color={selected ? m3.onSecondaryContainer : m3.onSurface}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

// MARK: Search bar

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
    side.set(withTiming(0, { duration: m3Duration.medium1, easing: emphasized }));
  }, [side]);
  const width = useAnimatedStyle(() => ({ marginRight: 16 + side.get() }));
  return (
    <Animated.View style={[styles.searchBar, { backgroundColor: m3.surfaceContainerHigh }, width]}>
      {leading ? <View style={{ marginLeft: 2 }}>{leading}</View> : <Icon name="search" size={22} color={m3.onSurface} style={{ marginLeft: 16, marginRight: 12 }} />}
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

// MARK: Pill field

/**
 * A tonal, fully rounded text field (the same pill shape as the chips and the Expense/Income switch). The hint is a
 * plain placeholder, not a floating label, and the pill gets a primary outline while you type.
 */
export function PillField({ icon, inputRef, onFocus, onBlur, ...rest }: Omit<TextInputProps, 'style'> & { icon?: IconName; inputRef?: Ref<ComponentRef<typeof TextInput>> }) {
  const { m3 } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.pillField, { backgroundColor: m3.surfaceContainerHigh, borderColor: focused ? m3.primary : 'transparent' }]}>
      {icon ? <Icon name={icon} size={22} color={m3.onSurfaceVariant} /> : null}
      <TextInput
        ref={inputRef}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        placeholderTextColor={m3.onSurfaceVariant}
        selectionColor={m3.primary}
        cursorColor={m3.primary}
        autoComplete="off"
        style={[styles.pillInput, { color: m3.onSurface }]}
        {...rest}
      />
    </View>
  );
}

// MARK: Bottom sheet

/** M3 modal bottom sheet: a scrim, a 28dp-cornered surface with a drag handle, anchored to the bottom. */
export function BottomSheet({ visible, onClose, children, bottomInset = 0 }: { visible: boolean; onClose: () => void; children: ReactNode; bottomInset?: number }) {
  const { m3 } = useTheme();
  const { height } = useWindowDimensions();
  // The sheet stays mounted while it animates out: up over 400ms (emphasized decelerate), down over 250ms (accelerate).
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(visible ? 0 : 1);
  const scrim = useSharedValue(visible ? 1 : 0);
  const unmount = useCallback(() => setMounted(false), []);
  const { onLayout, lift } = useKeyboardLift();
  // The sheet rides up with the keyboard.
  const raise = useSharedValue(0);
  useEffect(() => {
    raise.set(withTiming(lift, { duration: m3Duration.short4, easing: emphasized }));
  }, [lift, raise]);
  const raiseStyle = useAnimatedStyle(() => ({ paddingBottom: raise.get() }));
  // Mount as soon as the sheet is asked to show (adjusting state while rendering, not in an effect).
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      y.set(withTiming(0, { duration: m3Duration.medium4, easing: Easing.bezier(...m3Easing.emphasizedDecelerate) }));
      scrim.set(withTiming(1, { duration: m3Duration.medium2 }));
    } else {
      scrim.set(withTiming(0, { duration: m3Duration.medium1 }));
      y.set(
        withTiming(1, { duration: m3Duration.medium1, easing: Easing.bezier(...m3Easing.emphasizedAccelerate) }, (finished) => {
          'worklet';
          if (finished) scheduleOnRN(unmount);
        }),
      );
    }
  }, [visible, y, scrim, unmount]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() * height }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.get() }));

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(m3.scrim, 0.32) }, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss" />
      </Animated.View>
      <Animated.View onLayout={onLayout} style={[styles.sheetWrap, raiseStyle]} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, { backgroundColor: m3.surfaceContainerLow, paddingBottom: Math.max(bottomInset, 16) + 8 }, sheetStyle]}>
          <View style={[styles.handle, { backgroundColor: m3.onSurfaceVariant }]} />
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// MARK: Switch

/** M3 switch: 52x32 track; a small outlined thumb when off, a larger one with a check when on. Its row is what's tapped. */
export function M3Switch({ value }: { value: boolean }) {
  const { m3 } = useTheme();
  const p = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    p.set(withTiming(value ? 1 : 0, { duration: m3Duration.short4, easing: emphasized }));
  }, [value, p]);
  // Colours are read here, outside the worklets.
  const offTrack = m3.surfaceContainerHighest;
  const onTrack = m3.primary;
  const offEdge = m3.outline;
  const offThumb = m3.outline;
  const onThumb = m3.onPrimary;
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(p.get(), [0, 1], [offTrack, onTrack]), borderColor: interpolateColor(p.get(), [0, 1], [offEdge, onTrack]) }));
  const thumb = useAnimatedStyle(() => {
    const size = interpolate(p.get(), [0, 1], [16, 24]);
    return { width: size, height: size, borderRadius: size / 2, left: interpolate(p.get(), [0, 1], [8, 20]), backgroundColor: interpolateColor(p.get(), [0, 1], [offThumb, onThumb]) };
  });
  const check = useAnimatedStyle(() => ({ opacity: p.get() }));
  return (
    <Animated.View style={[styles.switchTrack, track]} aria-hidden>
      <Animated.View style={[styles.switchThumb, thumb]}>
        <Animated.View style={check}>
          <Icon name="checkmark" size={16} color={m3.primary} />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

// MARK: Outlined text field

interface FieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  inputRef?: Ref<ComponentRef<typeof TextInput>>;
  width?: DimensionValue;
}

/** M3 outlined text field: a 12dp-cornered outline (the shared field radius) with a label that floats onto the border. */
export function OutlinedField({ label, value, onFocus, onBlur, inputRef, width = '100%', ...rest }: FieldProps) {
  const { m3 } = useTheme();
  const [focused, setFocused] = useState(false);
  const raised = focused || (value ?? '').length > 0;
  const lift = useSharedValue(raised ? 1 : 0);
  const focus = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    lift.set(withTiming(raised ? 1 : 0, { duration: m3Duration.short4, easing: emphasized }));
    focus.set(withTiming(focused ? 1 : 0, { duration: m3Duration.short4, easing: emphasized }));
  }, [raised, focused, lift, focus]);

  const labelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(lift.get(), [0, 1], [0, -24]) }, { translateX: interpolate(lift.get(), [0, 1], [0, -4]) }, { scale: interpolate(lift.get(), [0, 1], [1, 0.75]) }],
  }));
  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.get(), [0, 1], [m3.outline, m3.primary]),
    borderWidth: interpolate(focus.get(), [0, 1], [1, 2]),
  }));
  const labelColor = useAnimatedStyle(() => ({ color: interpolateColor(focus.get(), [0, 1], [m3.onSurfaceVariant, m3.primary]) }));

  return (
    <View style={{ width }}>
      <View style={styles.field}>
        <TextInput
          ref={inputRef}
          value={value}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          selectionColor={m3.primary}
          cursorColor={m3.primary}
          placeholder=""
          autoComplete="off"
          style={[styles.fieldInput, { color: m3.onSurface }]}
          {...rest}
        />
        {/* The outline is its own layer above the input, so the input's own focus ring can never cover it. */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.outline, borderStyle]} />
      </View>
      {/* The floating label sits on the outline, with a surface-coloured plate that "cuts" the border. */}
      <Animated.View pointerEvents="none" style={[styles.fieldLabel, labelStyle]}>
        <View style={[styles.labelPlate, { backgroundColor: raised ? m3.surface : 'transparent' }]}>
          <Animated.Text style={[{ fontFamily: FONTS.regular, fontSize: typeScale.bodyLarge.size, letterSpacing: typeScale.bodyLarge.tracking }, labelColor]}>{label}</Animated.Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: shape.extraLarge, borderTopRightRadius: shape.extraLarge, paddingHorizontal: 24, paddingTop: 12 },
  handle: { width: 32, height: 4, borderRadius: 2, alignSelf: 'center', opacity: 0.4, marginBottom: 16 },
  searchBar: { height: SEARCH_HEIGHT, flexDirection: 'row', alignItems: 'center', borderRadius: shape.full, marginLeft: 16, overflow: 'hidden' },
  searchInput: { flex: 1, fontFamily: FONTS.regular, fontSize: typeScale.bodyLarge.size, height: SEARCH_HEIGHT, paddingVertical: 0, paddingHorizontal: 0, includeFontPadding: false, textAlignVertical: 'center', outlineWidth: 0, outlineColor: 'transparent', boxShadow: 'none' },
  switchTrack: { width: 52, height: 32, borderRadius: 16, borderWidth: 2, justifyContent: 'center' },
  switchThumb: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  touch: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  iconContainer: { width: 40, height: 40, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  segmented: { flexDirection: 'row', height: 40, borderWidth: 1, borderRadius: shape.full, overflow: 'hidden' },
  segment: { width: 108, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' },
  pillField: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, borderRadius: radius.action, borderWidth: 2 },
  pillInput: { flex: 1, height: 52, paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center', fontFamily: FONTS.regular, fontSize: typeScale.bodyLarge.size, letterSpacing: typeScale.bodyLarge.tracking, backgroundColor: 'transparent', outlineWidth: 0, outlineColor: 'transparent', boxShadow: 'none' },
  field: { height: 52, justifyContent: 'center', paddingHorizontal: 14 },
  outline: { borderRadius: radius.field },
  fieldInput: { fontFamily: FONTS.regular, fontSize: typeScale.bodyLarge.size, letterSpacing: typeScale.bodyLarge.tracking, paddingVertical: 0, flex: 1, backgroundColor: 'transparent', outlineWidth: 0, outlineColor: 'transparent', boxShadow: 'none' },
  fieldLabel: { position: 'absolute', left: 12, top: 13 },
  labelPlate: { paddingHorizontal: 4 },
});
