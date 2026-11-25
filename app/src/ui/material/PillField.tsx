import { useState, type ComponentRef, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { FONTS } from '@/theme/fonts';
import { radius, typeScale } from '@/theme/material';
import { useTheme } from '@/theme/theme';
import { Icon, type IconName } from '@/ui/Icon';

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

const styles = StyleSheet.create({
  pillField: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, borderRadius: radius.action, borderWidth: 2 },
  pillInput: { flex: 1, height: 52, paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center', fontFamily: FONTS.regular, fontSize: typeScale.bodyLarge.size, letterSpacing: typeScale.bodyLarge.tracking, backgroundColor: 'transparent', outlineWidth: 0, outlineColor: 'transparent', boxShadow: 'none' },
});
