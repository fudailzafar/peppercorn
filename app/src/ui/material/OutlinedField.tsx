import { useEffect, useState, type ComponentRef, type Ref } from 'react';
import { StyleSheet, TextInput, View, type DimensionValue, type TextInputProps } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { FONTS } from '@/theme/fonts';
import { m3Duration, radius, typeScale } from '@/theme/material';
import { standardEasing } from '@/theme/motion';
import { useTheme } from '@/theme/theme';

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
    lift.set(withTiming(raised ? 1 : 0, { duration: m3Duration.short4, easing: standardEasing }));
    focus.set(withTiming(focused ? 1 : 0, { duration: m3Duration.short4, easing: standardEasing }));
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
  field: { height: 52, justifyContent: 'center', paddingHorizontal: 14 },
  fieldInput: { fontFamily: FONTS.regular, fontSize: typeScale.bodyLarge.size, letterSpacing: typeScale.bodyLarge.tracking, paddingVertical: 0, flex: 1, backgroundColor: 'transparent', outlineWidth: 0, outlineColor: 'transparent', boxShadow: 'none' },
  outline: { borderRadius: radius.field },
  fieldLabel: { position: 'absolute', left: 12, top: 13 },
  labelPlate: { paddingHorizontal: 4 },
});
