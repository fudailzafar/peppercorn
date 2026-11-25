import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { shape } from '@/theme/material';
import { useTheme } from '@/theme/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

/** In place of what there isn't yet: an icon, words, and what to do about it. */
export function Empty({ icon, title, text, style, children }: { icon: IconName; title: string; text: string; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const { m3 } = useTheme();
  return (
    <View style={[styles.box, style]}>
      <View style={[styles.circle, { backgroundColor: m3.surfaceContainerHigh }]}>
        <Icon name={icon} size={44} color={m3.onSurfaceVariant} />
      </View>
      <AppText variant="headlineSmall" accessibilityRole="header" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="bodyLarge" color={m3.onSurfaceVariant} style={styles.text}>
        {text}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', paddingHorizontal: 32 },
  circle: { width: 96, height: 96, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 24, textAlign: 'center' },
  text: { marginTop: 8, marginBottom: 24, textAlign: 'center' },
});
