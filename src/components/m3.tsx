import { useEffect, useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { m3Duration, m3Easing, shape, stateLayer, typeScale } from '../theme/material';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';

/** Material 3 building blocks used across the app. Reference: https://m3.material.io/components */

const emphasized = Easing.bezier(...m3Easing.emphasized);

// MARK: State layer

/** Paints M3's pressed state layer (a translucent overlay in the content colour) over its parent. */
export function StateLayer({ pressed, color, radius }: { pressed: boolean; color: string; radius?: number }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity: pressed ? stateLayer.pressed : 0, borderRadius: radius }]} />;
}

// MARK: Icon button

/** M3 tonal icon button: a 40dp container inside a 48dp touch target. */
export function IconButton({ icon, onPress, label, tint }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; label: string; tint?: string }) {
  const { m3 } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.touch} android_ripple={{ color: `${m3.onSurface}1F`, radius: 24 }}>
      {({ pressed }) => (
        <View style={[styles.iconContainer, { backgroundColor: m3.surfaceContainerHighest }]}>
          <StateLayer pressed={pressed} color={m3.onSurface} radius={shape.full} />
          <Ionicons name={icon} size={24} color={tint ?? m3.onSurfaceVariant} />
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
      style={[styles.segment, fullWidth && { flex: 1, width: undefined }, divider && { borderLeftWidth: 1, borderLeftColor: m3.outline }]}
    >
      {({ pressed }) => (
        <>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: m3.secondaryContainer }, bg]} />
          <StateLayer pressed={pressed} color={m3.onSurface} />
          {selected ? <Ionicons name="checkmark" size={18} color={m3.onSecondaryContainer} /> : null}
          <AppText size={typeScale.labelLarge.size} weight="semibold" color={selected ? m3.onSecondaryContainer : m3.onSurface} style={{ letterSpacing: typeScale.labelLarge.tracking }}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

// MARK: Chip

/** M3 chip (assist / filter): a 48dp-tall touch target, outlined or filled with a tint. */
export function Chip({
  label,
  icon,
  onPress,
  tint,
  onTint,
  style,
  accessibilityLabel,
  trailing,
}: {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** Container colour when selected/filled; omit for an outlined chip. */
  tint?: string;
  /** Content colour on `tint`. */
  onTint?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  trailing?: ReactNode;
}) {
  const { m3 } = useTheme();
  const content = tint ? (onTint ?? m3.onSecondaryContainer) : m3.onSurfaceVariant;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} android_ripple={{ color: `${content}22` }} style={[styles.chip, tint ? { backgroundColor: tint } : { borderWidth: 1, borderColor: m3.outlineVariant }, style]}>
      {({ pressed }) => (
        <>
          <StateLayer pressed={pressed} color={content} radius={shape.full} />
          {icon ? <Ionicons name={icon} size={18} color={content} /> : null}
          {label ? (
            <AppText size={typeScale.labelLarge.size} weight="semibold" color={content} numberOfLines={1} style={{ flexShrink: 1, letterSpacing: typeScale.labelLarge.tracking }}>
              {label}
            </AppText>
          ) : null}
          {trailing}
        </>
      )}
    </Pressable>
  );
}

// MARK: Switch

/** M3 switch: 52x32 track; a small outlined thumb when off, a larger one with a check when on. */
export function M3Switch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
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
    <Pressable onPress={() => onChange(!value)} hitSlop={8} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <Animated.View style={[styles.switchTrack, track]}>
        <Animated.View style={[styles.switchThumb, thumb]}>
          <Animated.View style={check}>
            <Ionicons name="checkmark" size={16} color={m3.primary} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

// MARK: Outlined text field

interface FieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  inputRef?: Ref<ComponentRef<typeof TextInput>>;
  width?: number;
}

/** M3 outlined text field: a 4dp-cornered outline with a label that floats onto the border. */
export function OutlinedField({ label, value, onFocus, onBlur, inputRef, width = 260, ...rest }: FieldProps) {
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
    transform: [{ translateY: interpolate(lift.get(), [0, 1], [0, -26]) }, { translateX: interpolate(lift.get(), [0, 1], [0, -4]) }, { scale: interpolate(lift.get(), [0, 1], [1, 0.75]) }],
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
          style={[styles.fieldInput, { color: m3.onSurface }]}
          {...rest}
        />
        {/* The outline is its own layer above the input, so the input's own focus ring can never cover it. */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.outline, borderStyle]} />
      </View>
      {/* The floating label sits on the outline, with a surface-coloured plate that "cuts" the border. */}
      <Animated.View pointerEvents="none" style={[styles.fieldLabel, labelStyle]}>
        <View style={[styles.labelPlate, { backgroundColor: raised ? m3.surface : 'transparent' }]}>
          <Animated.Text style={[{ fontFamily: 'Roboto_400Regular', fontSize: typeScale.bodyLarge.size, letterSpacing: typeScale.bodyLarge.tracking }, labelColor]}>{label}</Animated.Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  switchTrack: { width: 52, height: 32, borderRadius: 16, borderWidth: 2, justifyContent: 'center' },
  switchThumb: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  touch: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  iconContainer: { width: 40, height: 40, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  segmented: { flexDirection: 'row', height: 40, borderWidth: 1, borderRadius: shape.full, overflow: 'hidden' },
  segment: { width: 108, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' },
  chip: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, borderRadius: shape.full, overflow: 'hidden' },
  field: { height: 56, justifyContent: 'center', paddingHorizontal: 16 },
  outline: { borderRadius: shape.extraSmall },
  fieldInput: { fontFamily: 'Roboto_400Regular', fontSize: typeScale.bodyLarge.size, letterSpacing: typeScale.bodyLarge.tracking, paddingVertical: 0, flex: 1, backgroundColor: 'transparent', outlineWidth: 0, outlineColor: 'transparent', boxShadow: 'none' },
  fieldLabel: { position: 'absolute', left: 12, top: 15 },
  labelPlate: { paddingHorizontal: 4 },
});
