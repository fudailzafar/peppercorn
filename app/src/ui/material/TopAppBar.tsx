import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { IconButton } from './IconButton';

/** M3 small top app bar: 64dp, an optional back or close button, the title, and actions. */
export function TopAppBar({ title, onBack, close = false, actions, inset = true }: { title: string; onBack?: () => void; close?: boolean; actions?: ReactNode; inset?: boolean }) {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: inset ? insets.top : 0, paddingLeft: onBack ? 4 : 16 }]}>
      {onBack ? <IconButton icon={close ? 'close' : 'arrow-back'} onPress={onBack} label={close ? 'Close' : 'Back'} tint={m3.onSurface} /> : null}
      <AppText variant="titleLarge" color={m3.onSurface} numberOfLines={1} accessibilityRole="header" style={{ flex: 1, marginLeft: onBack ? 4 : 0 }}>
        {title}
      </AppText>
      {actions}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingRight: 4 },
});
