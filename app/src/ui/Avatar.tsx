import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

/** Your profile picture: the first letter of your name, or a person icon until you add one. */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const { m3 } = useTheme();
  const letter = [...name.trim()][0]?.toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: letter ? m3.primary : m3.primaryContainer }}>
      {letter ? (
        <AppText size={size * 0.42} weight="medium" color={m3.onPrimary} style={styles.tight}>
          {letter}
        </AppText>
      ) : (
        <Icon name="person" size={size * 0.58} color={m3.onPrimaryContainer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tight: { includeFontPadding: false },
});
